const mongoose = require("mongoose");

const analyticsDbName = process.env.ANALYTICS_DB_NAME || "analytics";

const pipelineStatusSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      trim: true,
    },
    id: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

pipelineStatusSchema.index({ clientName: 1, updatedAt: -1 });

const analyticsDb = mongoose.connection.useDb(analyticsDbName, {
  useCache: true,
});

module.exports = analyticsDb.model(
  "PipelineStatus",
  pipelineStatusSchema,
  "pipeline_status"
);

