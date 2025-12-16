const { S3Client } = require("@aws-sdk/client-s3");
require("dotenv").config();

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// S3 bucket configuration
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "testdevopsetl";
const S3_BUCKET_REGION = process.env.AWS_REGION || "ap-south-1";

// Dedicated error log bucket/key (can reuse main bucket when unspecified)
const ERROR_LOG_BUCKET_NAME =
  process.env.ERROR_LOG_BUCKET_NAME || "testdevopsetl";
const ERROR_LOG_OBJECT_KEY =
  process.env.ERROR_LOG_OBJECT_KEY ||
  "processeddata/test_sunglasses_new/logs/error.json";

const PROCESSED_PRODUCTS_BUCKET_NAME =
  process.env.PROCESSED_PRODUCTS_BUCKET_NAME || ERROR_LOG_BUCKET_NAME;
const PROCESSED_PRODUCTS_BASE_PREFIX =
  process.env.PROCESSED_PRODUCTS_BASE_PREFIX || "processeddata";

module.exports = {
  s3Client,
  S3_BUCKET_NAME,
  S3_BUCKET_REGION,
  ERROR_LOG_BUCKET_NAME,
  ERROR_LOG_OBJECT_KEY,
  PROCESSED_PRODUCTS_BUCKET_NAME,
  PROCESSED_PRODUCTS_BASE_PREFIX,
};

