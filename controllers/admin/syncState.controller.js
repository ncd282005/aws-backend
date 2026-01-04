const SyncState = require("../../models/syncState.schema");

/**
 * Get current sync state for a client
 * GET /api/v1/admin/sync-state
 * Query: { clientName: string }
 */
exports.getSyncState = async (req, res) => {
  try {
    const { clientName } = req.query;

    if (!clientName || typeof clientName !== "string") {
      return res.status(400).json({
        status: false,
        message: "Client name is required",
        data: null,
      });
    }

    const syncState = await SyncState.findOne({ clientName });

    if (!syncState) {
      return res.status(200).json({
        status: true,
        message: "No sync state found",
        data: null,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Sync state retrieved successfully",
      data: syncState,
    });
  } catch (error) {
    console.error("Error getting sync state:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to get sync state",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

/**
 * Save or update sync state
 * POST /api/v1/admin/sync-state
 * Body: { clientName: string, currentStep: number, status: string, ... }
 */
exports.saveSyncState = async (req, res) => {
  try {
    const {
      clientName,
      currentStep,
      status,
      csvFile,
      fieldMappings,
      pipelineStatus,
      selectedCategories,
      isRunningScripts,
      scriptsStartedAt,
      metadata,
    } = req.body;

    if (!clientName || typeof clientName !== "string") {
      return res.status(400).json({
        status: false,
        message: "Client name is required",
        data: null,
      });
    }

    if (currentStep !== undefined && (currentStep < 1 || currentStep > 3)) {
      return res.status(400).json({
        status: false,
        message: "Current step must be between 1 and 3",
        data: null,
      });
    }

    // Use upsert to create or update
    const syncState = await SyncState.findOneAndUpdate(
      { clientName },
      {
        $set: {
          ...(currentStep !== undefined && { currentStep }),
          ...(status !== undefined && { status }),
          ...(csvFile !== undefined && { csvFile }),
          ...(fieldMappings !== undefined && { fieldMappings }),
          ...(pipelineStatus !== undefined && { pipelineStatus }),
          ...(selectedCategories !== undefined && { selectedCategories }),
          ...(isRunningScripts !== undefined && { isRunningScripts }),
          ...(scriptsStartedAt !== undefined && { scriptsStartedAt }),
          ...(metadata !== undefined && { metadata }),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      status: true,
      message: "Sync state saved successfully",
      data: syncState,
    });
  } catch (error) {
    console.error("Error saving sync state:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to save sync state",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

/**
 * Update last sync completion date
 * POST /api/v1/admin/sync-state/complete
 * Body: { clientName: string }
 */
exports.completeSync = async (req, res) => {
  try {
    const { clientName } = req.body;

    if (!clientName || typeof clientName !== "string") {
      return res.status(400).json({
        status: false,
        message: "Client name is required",
        data: null,
      });
    }

    const now = new Date();

    const syncState = await SyncState.findOneAndUpdate(
      { clientName },
      {
        $set: {
          status: "completed",
          currentStep: 1, // Reset to step 1 after completion
          lastSyncDate: now,
          lastSyncCompletedAt: now,
          // Clear intermediate state
          pipelineStatus: null,
          selectedCategories: [],
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    return res.status(200).json({
      status: true,
      message: "Sync completion recorded successfully",
      data: syncState,
    });
  } catch (error) {
    console.error("Error completing sync:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to record sync completion",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

/**
 * Reset sync state (for starting a new sync)
 * POST /api/v1/admin/sync-state/reset
 * Body: { clientName: string }
 */
exports.resetSyncState = async (req, res) => {
  try {
    const { clientName } = req.body;

    if (!clientName || typeof clientName !== "string") {
      return res.status(400).json({
        status: false,
        message: "Client name is required",
        data: null,
      });
    }

    const syncState = await SyncState.findOneAndUpdate(
      { clientName },
      {
        $set: {
          currentStep: 1,
          status: "pending",
          csvFile: null,
          fieldMappings: {},
          pipelineStatus: null,
          selectedCategories: [],
          metadata: {},
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      status: true,
      message: "Sync state reset successfully",
      data: syncState,
    });
  } catch (error) {
    console.error("Error resetting sync state:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to reset sync state",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

