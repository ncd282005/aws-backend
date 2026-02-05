const mongoose = require("mongoose");

const customizationSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  logo: {
    type: String,
    required: true,
  },
  brand_color_code: {
    type: String,
    required: false,
  },
  right_left: {
    type: String,
    enum: ["left", "right"],
    required: false,
  },
  right_left_px: {
    type: String,
    required: false,
  },
  bottom_top: {
    type: String,
    default: "bottom",
    required: false,
  },
  bottom_top_px: {
    type: String,
    required: false,
  },
  heading_size: {
    type: String,
    required: false,
  },
  font_size: {
    type: String,
    required: false,
  },
  actions_color_code: {
    type: String,
    required: false,
  },
  is_deleted: {
    type: Boolean,
    default: false,
  },
  deleted_at: {
    type: Date,
    required: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Customization", customizationSchema);
