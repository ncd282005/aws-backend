const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const companySchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  company_name: { type: String, required: true },
  db_name: { type: String, required: true },
  min_company_size: { type: Number, default: "" },
  max_company_size: { type: Number, default: "" },
  company_website: { type: String, default: "" },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Company", companySchema);
