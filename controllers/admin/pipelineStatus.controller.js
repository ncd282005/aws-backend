/* global process */
const PipelineStatus = require("../../models/pipelineStatus.schema");

const normalizeStatus = (status = "") => status.toLowerCase();

exports.getPipelineStatus = async (req, res) => {
  const clientName = req.query.clientName;
  const csvId = req.query.csvId || null;

  try {
    // If csvId is provided, try to find status for that specific CSV
    if (csvId) {
      const statusWithCsvId = await PipelineStatus.findOne({
        clientName: { $regex: new RegExp(`^${clientName}$`, "i") },
        csvId: { $regex: new RegExp(`^${csvId}$`, "i") },
      })
        .sort({ updatedAt: -1 })
        .lean();

      if (statusWithCsvId) {
        const statusValue = normalizeStatus(statusWithCsvId.status);
        const isSuccess = statusValue === "success";
        const isFailed = ["failed", "error"].includes(statusValue);

        return res.status(200).json({
          status: true,
          message: "Pipeline status fetched successfully",
          data: statusWithCsvId,
          pipelineStatus: statusValue,
          isSuccess,
          isFailed,
        });
      }

      // If csvId is provided but no record found, the pipeline hasn't started processing yet
      // Return pending status so frontend can continue polling
      return res.status(200).json({
        status: true,
        message: "Pipeline status pending - processing has not started yet",
        data: {
          clientName,
          csvId,
          status: "pending",
          message: "CSV uploaded but pipeline processing has not started yet",
        },
        pipelineStatus: "pending",
        isSuccess: false,
        isFailed: false,
      });
    }

    // If no csvId provided, get the latest status for the client
    const latestStatus = await PipelineStatus.findOne({
      clientName: { $regex: new RegExp(`^${clientName}$`, "i") },
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (!latestStatus) {
      return res.status(404).json({
        status: false,
        message: `No pipeline status found for client "${clientName}"`,
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

