const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const demoClientSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: false,
    },
    ttl: {
      type: Date,
    },
    email_ids: {
      type: [String],
      validate: {
        validator: function (emails) {
          return emails.every((email) =>
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
          );
        },
        message: "Invalid email address in the email_ids array.",
      },
    },
    url: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["Completed", "Active", "Expired", "Error"],
      default: "Completed",
    },
    data_cleaned_status: {
      type: String,
      enum: ["In-Progress", "Completed", "Error"],
      default: "In-Progress",
    },
    q_and_a_status: {
      type: String,
      enum: ["-", "In-Progress", "Completed", "Error"],
      default: "-",
    },
    language: {
      type: String,
      default: "English",
    },
    data: {
      type: Object,
      default: {},
      required: true,
    },
    final_data: {
      type: Object,
      default: {},
      required: true,
    },
    whyData: {
      type: Object,
      default: {},
    },
    final_why_data: {
      type: Object,
      default: {},
    },
    screenshotPath: {
      type: String,
      default: null,
    },
    primary_text: {
      type: String,
      default: "",
    },
    secondary_text: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DemoClient", demoClientSchema, "demo_clients");
