const mongoose = require("mongoose");

const syncStateSchemaV2 = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    currentStep: {
      type: String,
      required: true,
      enum: ["ETL_RUNNING", "ETL_COMPLETED", "ETL_FAILED", "PROCESS_RUNNING", "PROCESS_COMPLETED", "PROCESS_FAILED"],
      default: "ETL_RUNNING",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "FAILED"],
      default: "ACTIVE",
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
syncStateSchemaV2.index({ clientName: 1 }, { unique: true });

module.exports = mongoose.model(
  "SyncStateV2",
  syncStateSchemaV2,
  "sync_states_v2"
);

