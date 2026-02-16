const mongoose = require("mongoose");

const clientConfigSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      unique: true,
    },
    allowedOrigins: {
      type: [String],
      required: true,
    },
    s3Bucket: {
      type: String,
      required: true,
      trim: true,
    },
    mongo: {
      database: {
        type: String,
        required: true,
        default: "analytics",
      },
      activityCollection: {
        type: String,
        required: true,
      },
      sessionCollection: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
clientConfigSchema.index({ clientId: 1 });
clientConfigSchema.index({ s3Bucket: 1 });

module.exports = mongoose.model("ClientConfig", clientConfigSchema, "client_configs");
