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

