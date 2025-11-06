const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const analyticsAdminSchema = new Schema(
    {
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters long"],
        },
        is_active: {
            type: Boolean,
            default: true,
        },
        last_login: {
            type: Date,
            default: null,
        },
    },
    { 
        timestamps: true,
    }
);

module.exports = mongoose.model("AnalyticsAdmin", analyticsAdminSchema, "analytics_admins");

