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
      default: "20px",
    },
    cardTopRightRadius: {
      type: String,
      default: "20px",
    },
    cardBottomLeftRadius: {
      type: String,
      default: "20px",
    },
    cardBottomRightRadius: {
      type: String,
      default: "20px",
    },
    fontFamily: {
      type: String,
      default: "Arial",
    },
    faqFontSize: {
      type: String,
      default: "14px",
    },
    optionButtonFontSize: {
      type: String,
      default: "12px",
    },
    selectedOptionButtonColor: {
      type: String,
      default: "#EEEEEE",
    },
    selectedOptionButtonFontColor: {
      type: String,
      default: "#1F2937",
    },
  },
  { timestamps: true }
);

// Compound index to ensure one theme config per client
themeConfigSchema.index({ clientName: 1 }, { unique: true });

module.exports = mongoose.model("ThemeConfig", themeConfigSchema, "theme_configs");
