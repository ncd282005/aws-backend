const mongoose = require("mongoose");

const syncStateSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    currentStep: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
      default: 1,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "failed", "pending"],
      default: "pending",
    },
    // Step 1 data
    csvFile: {
      fileName: String,
      fileSize: Number,
      s3Url: String,
      s3Key: String,
      uploadDate: String,
    },
    // Step 2 data
    fieldMappings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Step 3 data
    pipelineStatus: {
      type: String,
      enum: ["pending", "syncing", "success", "failed"],
    },
    selectedCategories: {
      type: [String],
      default: [],
    },
    // Script execution state
    isRunningScripts: {
      type: Boolean,
      default: false,
    },
    scriptsStartedAt: {
      type: Date,
    },
    // Last successful sync completion
    lastSyncDate: {
      type: Date,
    },
    lastSyncCompletedAt: {
      type: Date,
    },
    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Unique index on clientName - one sync state per client
syncStateSchema.index({ clientName: 1 }, { unique: true });

module.exports = mongoose.model(
  "SyncState",
  syncStateSchema,
  "sync_states"
);

