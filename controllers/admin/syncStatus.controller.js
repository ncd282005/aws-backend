/* global process */
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const {
  s3Client,
  ERROR_LOG_BUCKET_NAME,
  S3_BUCKET_REGION,
} = require("../../config/s3Config");

const buildPublicS3Url = (bucket, key, region) =>
  `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

const streamToString = async (stream) => {
  if (!stream) {
    return "";
  }

  if (typeof stream.transformToString === "function") {
    return stream.transformToString();
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
};

exports.getSyncErrors = async (req, res) => {
  try {
    const clientName = req.query.clientName;
    if (!clientName || clientName.trim() === "") {
      return res.status(400).json({
        status: false,
        message: "clientName is required in query parameters.",
        data: null,
      });
    }
    const command = new GetObjectCommand({
      Bucket: ERROR_LOG_BUCKET_NAME,
      Key: `processeddata/${clientName}/logs/error.json`,
    });

    const objectResponse = await s3Client.send(command);
    const payload =
      objectResponse?.Body && (await streamToString(objectResponse.Body));
    const parsed = payload ? JSON.parse(payload) : null;

    return res.status(200).json({
      status: true,
      message: "Fetched catalog processing log successfully",
      data: parsed,
      source: {
        bucket: ERROR_LOG_BUCKET_NAME,
        key: `processeddata/${clientName}/logs/error.json`,
        url: buildPublicS3Url(
          ERROR_LOG_BUCKET_NAME,
          `processeddata/${clientName}/logs/error.json`,
          S3_BUCKET_REGION
        ),
        lastModified: objectResponse?.LastModified,
      },
    });
  } catch (error) {
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({
        status: false,
        message: "No error log found in S3",
        data: null,
      });
    }

    console.error("Failed to fetch sync error log from S3:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch sync error log from S3",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

