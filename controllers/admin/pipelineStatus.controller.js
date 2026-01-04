/* global process */
const PipelineStatus = require("../../models/pipelineStatus.schema");
const {
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
const {
  s3Client,
  PROCESSED_PRODUCTS_BUCKET_NAME,
  PROCESSED_PRODUCTS_BASE_PREFIX,
} = require("../../config/s3Config");

const normalizeStatus = (status = "") => status.toLowerCase();

const sanitizePathSegment = (segment = "") =>
  segment.replace(/^\/*/, "").replace(/\/*$/, "");

/**
 * Check if processed data exists in S3 for the given client
 * @param {string} clientName - Client name
 * @returns {Promise<boolean>} - True if processed data exists
 */
const checkProcessedDataExists = async (clientName) => {
  try {
    const normalizedClient = sanitizePathSegment(clientName);
    const basePrefix = sanitizePathSegment(PROCESSED_PRODUCTS_BASE_PREFIX);
    const prefix = `${basePrefix}/${normalizedClient}/categories/`;

    const command = new ListObjectsV2Command({
      Bucket: PROCESSED_PRODUCTS_BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: 1, // We only need to check if any files exist
    });

    const response = await s3Client.send(command);
    return (response.Contents && response.Contents.length > 0);
  } catch (error) {
    console.error(`Error checking processed data for ${clientName}:`, error);
    return false;
  }
};

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

    let status = runId
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

    let statusValue = normalizeStatus(status.status);
    
    // If status is pending, check if processed data exists in S3
    if (statusValue === "pending") {
      const hasProcessedData = await checkProcessedDataExists(clientName);
      if (hasProcessedData) {
        // Update pipeline status to success
        const updateQuery = { _id: status._id };
        await PipelineStatus.findOneAndUpdate(
          updateQuery,
          {
            $set: {
              status: "success",
              message: "Data processing completed successfully",
            },
          },
          { new: true }
        );
        
        // Fetch updated status
        status = await PipelineStatus.findOne({ _id: status._id }).lean();
        statusValue = "success";
        console.log(`Pipeline status updated to success for client: ${clientName}, runId: ${runId || "latest"}`);
      }
    }

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
