const { S3Client } = require("@aws-sdk/client-s3");
require("dotenv").config();

// Build S3 client configuration
const s3ClientConfig = {
  region: process.env.AWS_REGION || "ap-south-1",
};

// Only add explicit credentials if they're provided
// Otherwise, let AWS SDK use default credential chain (IAM roles on EC2, environment variables, etc.)
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3ClientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

// Initialize S3 client
const s3Client = new S3Client(s3ClientConfig);

// S3 bucket configuration
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "testdevopsetl";
const S3_BUCKET_REGION = process.env.AWS_REGION || "ap-south-1";

// Dedicated error log bucket/key (can reuse main bucket when unspecified)
const ERROR_LOG_BUCKET_NAME =
  process.env.ERROR_LOG_BUCKET_NAME || "testdevopsetl";

const PROCESSED_PRODUCTS_BUCKET_NAME =
  process.env.PROCESSED_PRODUCTS_BUCKET_NAME || ERROR_LOG_BUCKET_NAME;
const PROCESSED_PRODUCTS_BASE_PREFIX =
  process.env.PROCESSED_PRODUCTS_BASE_PREFIX || "processeddata";

module.exports = {
  s3Client,
  S3_BUCKET_NAME,
  S3_BUCKET_REGION,
  ERROR_LOG_BUCKET_NAME,
  PROCESSED_PRODUCTS_BUCKET_NAME,
  PROCESSED_PRODUCTS_BASE_PREFIX,
};

