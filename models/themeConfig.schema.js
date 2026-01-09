const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const themeConfigSchema = new Schema(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    nudgeTheme: {
      type: String,
      enum: ["dark", "light", "grey", "gray"],
      default: "dark",
    },
    cardTopLeftRadius: {
      type: String,
      enum: ["none", "small", "normal", "rounded", "wide"],
      default: "rounded",
    },
    cardTopRightRadius: {
      type: String,
      enum: ["none", "small", "normal", "rounded", "wide"],
      default: "rounded",
    },
    cardBottomLeftRadius: {
      type: String,
      enum: ["none", "small", "normal", "rounded", "wide"],
      default: "rounded",
    },
    cardBottomRightRadius: {
      type: String,
      enum: ["none", "small", "normal", "rounded", "wide"],
      default: "rounded",
    },
    fontFamily: {
      type: String,
      default: "Arial",
    },
    faqFontSize: {
      type: String,
      enum: ["small", "medium", "large", "xlarge"],
      default: "medium",
    },
    optionButtonFontSize: {
      type: String,
      enum: ["small", "medium", "large", "xlarge"],
      default: "medium",
    },
  },
  { timestamps: true }
);

// Compound index to ensure one theme config per client
themeConfigSchema.index({ clientName: 1 }, { unique: true });

module.exports = mongoose.model("ThemeConfig", themeConfigSchema, "theme_configs");
