const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const otpSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"],
        },
        otp: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Avoid overwriting the model if it's already registered
const OTP = mongoose.models.demo_otpschema || mongoose.model("demo_otpschema", otpSchema, "demo_otp_collection");

module.exports = OTP;
