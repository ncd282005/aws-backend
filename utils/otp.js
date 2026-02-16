const OTP = require("../models/otp.schema");

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const saveOTP = async (email, mobile_number, user_id) => {
  const otp = generateOTP();
  const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration time

  let otpRecord = await OTP.findOne({ email });

  if (otpRecord) {
    otpRecord.otp = otp;
    otpRecord.expires_at = expires_at;
  } else {
    otpRecord = new OTP({ user_id, email, otp, expires_at });
  }
  await otpRecord.save();
  return otp;
};

const verifyOTP = async (email, otp) => {
  const otpRecord = await OTP.findOne({
    email,
    otp,
    expires_at: { $gt: new Date() },
  });

  if (!otpRecord) {
    throw new Error("Invalid OTP or OTP expired");
  }

  otpRecord.otp_verified = true;
  await otpRecord.save();
  return otpRecord;
};

module.exports = { generateOTP, saveOTP, verifyOTP };
