const mongoose = require("mongoose");

const csvUploadRecordSchema = new mongoose.Schema(
  {
    client_name: {
      type: String,
      required: true,
      trim: true,
    },
    upload_date: {
      type: String, // YYYY-MM-DD
      required: true,
      trim: true,
    },
    version_label: {
      type: String,
      required: true,
    },
    original_file_name: {
      type: String,
      required: true,
    },
    stored_file_name: {
      type: String,
      required: true,
    },
    file_size: {
      type: Number,
      required: true,
    },
    s3_key: {
      type: String,
      required: true,
    },
    s3_url: {
      type: String,
      required: true,
    },
    metadata: {
      type: Object,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying uploads by client and date (not unique - allows multiple uploads per day)
csvUploadRecordSchema.index({ client_name: 1, upload_date: 1 });

// Unique index on s3_key to prevent duplicate S3 uploads
csvUploadRecordSchema.index({ s3_key: 1 }, { unique: true });

module.exports = mongoose.model(
  "CsvUploadRecord",
  csvUploadRecordSchema,
  "csv_upload_records"
);

