/* global process */
const PipelineStatus = require("../../models/pipelineStatus.schema");

const normalizeStatus = (status = "") => status.toLowerCase();

exports.getPipelineStatus = async (req, res) => {
  const clientName = req.query.clientName;
  const runId = req.query.runId;

  try {
    // Build query - if runId is provided, filter by it, otherwise get latest
    const query = {
      clientName: { $regex: new RegExp(`^${clientName}$`, "i") },
    };

    if (runId) {
      query.runId = runId;
    }

    const status = runId
      ? await PipelineStatus.findOne(query).lean()
      : await PipelineStatus.findOne(query).sort({ updatedAt: -1 }).lean();

    if (!status) {
      return res.status(404).json({
        status: false,
        message: runId
          ? `No pipeline status found for client "${clientName}" with runId "${runId}"`
          : "No pipeline status found for the requested client",
        data: null,
      });
    }

    const statusValue = normalizeStatus(status.status);
    const isSuccess = statusValue === "success";
    const isFailed = ["failed", "error"].includes(statusValue);

    return res.status(200).json({
      status: true,
      message: "Pipeline status fetched successfully",
      data: status,
      pipelineStatus: statusValue,
      isSuccess,
      isFailed,
    });
  } catch (error) {
    console.error("Failed to fetch pipeline status:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch pipeline status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};
