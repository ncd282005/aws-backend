const User = require("../models/user.schema");
const { saveOTP } = require("../utils/otp");
const { sendMail } = require("../utils/email");
const {
  registerUserSchema,
} = require("../validationSchemas/validationSchemas");

exports.registerUser = async (req, res) => {
  try {
    const { error } = registerUserSchema.validate(req.body);
    if (error) {
      return res.status(200).json({
        status: false,
        message: error.details[0].message,
        data: null,
      });
    }

    const { email, country_code, mobile_number, fullname } = req.body;

    let user = await User.findOne({ email });

    if (user) {
      const otp = await saveOTP(email, mobile_number, user._id);

      await sendMail(
        email,
        "OTP for Registration",
        `Your OTP for registration is: ${otp}`
      );

      return res.status(200).json({
        status: true,
        message: "OTP sent successfully",
        data: null,
      });
    }

    user = new User({
      email,
      country_code,
      mobile_number,
      fullname,
      profile_picture: "",
    });
    await user.save();

    const otp = await saveOTP(email, mobile_number, user._id);

    // await sendMail(
    //   email,
    //   "OTP for Registration",
    //   `Your OTP for registration is: ${otp}`
    // );

    res.status(200).json({
      status: true,
      message: "OTP sent successfuly",
      data: null,
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
