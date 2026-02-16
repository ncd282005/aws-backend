/* global process */
const PipelineStatus = require("../../models/pipelineStatus.schema");

const normalizeStatus = (status = "") => status.toLowerCase();

exports.getPipelineStatus = async (req, res) => {
  const clientName = req.query.clientName;

  try {
    const latestStatus = await PipelineStatus.findOne({
      clientName: { $regex: new RegExp(`^${clientName}$`, "i") },
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (!latestStatus) {
      return res.status(404).json({
        status: false,
        message: "No pipeline status found for the requested client",
        data: null,
      });
    }

    const statusValue = normalizeStatus(latestStatus.status);
    const isSuccess = statusValue === "success";
    const isFailed = ["failed", "error"].includes(statusValue);

    return res.status(200).json({
      status: true,
      message: "Pipeline status fetched successfully",
      data: latestStatus,
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

