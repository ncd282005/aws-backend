const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const documentSchema = new Schema({
  company_content_id: {
    type: Schema.Types.ObjectId,
    ref: "CompanyContent",
    required: true,
  },
  title: { type: String, default: "" },
  filename: {
    type: String,
    required: function () {
      return !this.pdf_url;
    },
  },
  filepath: {
    type: String,
    required: function () {
      return !this.pdf_url;
    },
  },
  filesize: {
    type: String,
    required: function () {
      return !this.pdf_url;
    },
  },
  pdf_url: {
    type: String,
    required: function () {
      return !this.filename && !this.filepath && !this.filesize;
    },
  },
  language: {
    type: String,
    required: function () {
      return !!this.pdf_url;
    },
  },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = documentSchema;
