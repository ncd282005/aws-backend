const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CompanyContentSchema = new Schema({
  company_id: {
    type: Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  content_type: {
    type: String,
    enum: ["URLs", "Documents", "Files", "FAQs"],
    required: true,
  },
  language: {
    type: String,
    default: "English",
  },
  content_state: {
    type: String,
    enum: ["Included", "Excluded", "Sandbox"],
    default: "Included",
  },

  content_audience: {
    type: Number,
    required: true,
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

module.exports = CompanyContentSchema;
