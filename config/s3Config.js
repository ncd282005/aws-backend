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
const S3_BUCKET_NAME = "mprompto-test";
const S3_BUCKET_REGION = process.env.AWS_REGION || "ap-south-1";

module.exports = {
  s3Client,
  S3_BUCKET_NAME,
  S3_BUCKET_REGION,
};

