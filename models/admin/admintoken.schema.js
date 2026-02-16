const mongoose = require("mongoose");

const adminTokenSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: "365d", 
    },
  },
  { timestamps: true }
);

const AdminToken = mongoose.model("AdminToken", adminTokenSchema,'admin_token');

module.exports = AdminToken;
