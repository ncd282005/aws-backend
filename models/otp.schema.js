const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const otpSchema = new Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to the User model
  email: { type: String },
  otp: { type: String },
  otp_verified: { type: Boolean, default: false },
  expires_at: { type: Date },
});

module.exports = mongoose.model("OTP", otpSchema);
