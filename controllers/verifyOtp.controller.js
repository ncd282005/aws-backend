const User = require("../models/user.schema");
const Token = require("../models/token.schema");
const { generateAccessToken } = require("../config/jwt");
const { verifyOTP } = require("../utils/otp");
const { verifyOTPSchema } = require("../validationSchemas/validationSchemas");

exports.verifyOTP = async (req, res) => {
  try {
    const { error, value } = verifyOTPSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: false,
        message: error.details[0].message,
        data: null,
      });
    }

    const { email, otp } = value;

    // Check if the user exists first
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
        data: null,
      });
    }

    // Verify OTP
    try {
      await verifyOTP(email, otp);
    } catch (otpError) {
      return res.status(200).json({
        status: false,
        message: otpError.message,
        data: null,
      });
    }

    user.email_verified = true;
    user.otp_verified = true;
    await user.save();

    const existingToken = await Token.findOne({ user_id: user._id });
    let accessToken;
    if (existingToken) {
      accessToken = existingToken.token;
    } else {
      accessToken = generateAccessToken(user);
      const newToken = new Token({
        user_id: user._id,
        token: accessToken,
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
      });
      await newToken.save();
    }

    res.json({
      status: true,
      message: "OTP verified successfully",
      data: {
        token: accessToken,
        is_register: !!user.company_id,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};
