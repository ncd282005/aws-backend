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
 * Check if NEW processed data exists in S3 for the given client (created after pipeline start)
 * @param {string} clientName - Client name
 * @param {Date} pipelineStartTime - When the pipeline status was created (CSV upload time)
 * @returns {Promise<boolean>} - True if new processed data exists
 */
const checkNewProcessedDataExists = async (clientName, pipelineStartTime) => {
  try {
    const normalizedClient = sanitizePathSegment(clientName);
    const basePrefix = sanitizePathSegment(PROCESSED_PRODUCTS_BASE_PREFIX);
    const prefix = `${basePrefix}/${normalizedClient}/categories/`;

    const command = new ListObjectsV2Command({
      Bucket: PROCESSED_PRODUCTS_BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      return false;
    }

    // Check if any files were created/modified after the pipeline started
    const pipelineStartTimestamp = new Date(pipelineStartTime).getTime();
    
    for (const file of response.Contents) {
      if (file.LastModified) {
        const fileTimestamp = new Date(file.LastModified).getTime();
        // If any file was modified after pipeline start, processing is complete
        if (fileTimestamp >= pipelineStartTimestamp) {
          console.log(`Found new processed data file: ${file.Key}, modified at ${file.LastModified}, pipeline started at ${pipelineStartTime}`);
          return true;
        }
      }
    }

    return false;
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
    
    // If status is pending, check if NEW processed data exists in S3 (created after CSV upload)
    if (statusValue === "pending") {
      // Use createdAt timestamp from pipeline status (when CSV was uploaded)
      const pipelineStartTime = status.createdAt || status.updatedAt;
      const hasNewProcessedData = await checkNewProcessedDataExists(clientName, pipelineStartTime);
      
      if (hasNewProcessedData) {
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
