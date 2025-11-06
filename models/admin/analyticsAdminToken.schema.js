const mongoose = require("mongoose");

const analyticsAdminTokenSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AnalyticsAdmin",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: "24h", // Token automatically deleted after 24 hours
    },
  },
  { timestamps: true }
);

// Index for faster lookups
analyticsAdminTokenSchema.index({ adminId: 1 });
analyticsAdminTokenSchema.index({ token: 1 });

const AnalyticsAdminToken = mongoose.model("AnalyticsAdminToken", analyticsAdminTokenSchema, "analytics_admin_tokens");

module.exports = AnalyticsAdminToken;

