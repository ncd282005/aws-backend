// models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {},
  {
    timestamps: true,
    strict: false,
  }
);

module.exports = mongoose.model("Webhook_Product", productSchema);
