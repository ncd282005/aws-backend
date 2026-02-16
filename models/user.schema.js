const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  role_id: { type: Number, default: 1 },
  company_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  email: { type: String, default: "" },
  country_code: { type: String, default: "" },
  mobile_number: { type: String, default: "" },
  name: { type: String, default: "" },
  profile_picture: { type: String, default: "" },
  access_token: { type: String },
  email_verified: { type: Boolean, default: false },
  otp_verified: { type: Boolean, default: false },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
