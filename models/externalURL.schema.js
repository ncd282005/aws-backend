const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const externalUrlSchema = new Schema({
  company_content_id: {
    type: Schema.Types.ObjectId,
    ref: "CompanyContent",
    required: true,
  },
  title: { type: String, required: false, default: "" },
  content_url: { type: String, required: true },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = externalUrlSchema;
