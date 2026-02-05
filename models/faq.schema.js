const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema({
  company_content_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CompanyContent",
    required: true,
  },
  title: {
    type: String,
    required: false,
  },
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  file: {
    type: String,
    default: "",
  },
  is_deleted: {
    type: Boolean,
    default: false,
  },
  deleted_at: {
    type: Date,
    default: null,
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

module.exports = faqSchema;
