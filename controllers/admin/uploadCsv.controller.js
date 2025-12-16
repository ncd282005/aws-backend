/* global process */
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client, S3_BUCKET_NAME } = require("../../config/s3Config");
const path = require("path");
const CsvUploadRecord = require("../../models/csvUploadRecord.schema");

/**
 * Upload CSV file to AWS S3
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.uploadCsv = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "No file uploaded. Please upload a CSV file.",
        data: null,
      });
    }

    // Validate file type
    const allowedMimeTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "text/plain",
    ];
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    if (
      !allowedMimeTypes.includes(req.file.mimetype) &&
      fileExtension !== ".csv"
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid file type. Only CSV files are allowed.",
        data: null,
      });
    }

    // Validate file size (10MB limit)
    const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
    if (req.file.size > maxFileSize) {
      return res.status(400).json({
        status: false,
        message: "File size exceeds 10MB limit.",
        data: null,
      });
    }

    // Build S3 key based on requested folder structure
    const uploadDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const clientName = "test_sunglasses";
    const randomSuffix = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
    const versionLabel = `v${randomSuffix}`;
    const fileNameInBucket = `product_${versionLabel}.csv`;
    const s3Key = `raw/client_name=${clientName}/upload_date=${uploadDate}/${fileNameInBucket}`;

    // Upload to S3
    // Use buffer if available (memory storage), otherwise read from disk
    let fileBody;
    if (req.file.buffer) {
      fileBody = req.file.buffer;
    } else if (req.file.path) {
      const fs = require("fs");
      fileBody = fs.readFileSync(req.file.path);
    } else {
      return res.status(400).json({
        status: false,
        message: "File data not available",
        data: null,
      });
    }

    const uploadParams = {
      Bucket: "testdevopsetl",
      Key: s3Key,
      Body: fileBody,
      ContentType: req.file.mimetype || "text/csv",
      Metadata: {
        originalName: req.file.originalname,
        uploadedAt: new Date().toISOString(),
      },
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Construct S3 URL
    const s3Url = `https://testdevopsetl.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${s3Key}`;

    // Clean up local file if it exists (multer disk storage)
    if (req.file.path) {
      const fs = require("fs");
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    await CsvUploadRecord.create({
      client_name: clientName,
      upload_date: uploadDate,
      version_label: versionLabel,
      original_file_name: req.file.originalname,
      stored_file_name: fileNameInBucket,
      file_size: req.file.size,
      s3_key: s3Key,
      s3_url: s3Url,
      metadata: {
        mimetype: req.file.mimetype,
      },
    });

    res.status(200).json({
      status: true,
      message: "CSV file uploaded successfully",
      data: {
        fileName: fileNameInBucket,
        originalFileName: req.file.originalname,
        fileSize: req.file.size,
        s3Key: s3Key,
        s3Url: s3Url,
        version: versionLabel,
        uploadDate,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error uploading CSV to S3:", error);

    // Clean up local file if upload failed
    if (req.file && req.file.path) {
      const fs = require("fs");
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    // Handle specific MongoDB duplicate key errors
    if (error.code === 11000) {
      // Check if it's the old index error
      if (error.keyPattern && error.keyPattern.version) {
        return res.status(500).json({
          status: false,
          message: "Database index migration required. Please drop the old unique index on (client_name, upload_date, version). See MIGRATION_NOTE.md",
          error: process.env.NODE_ENV === "development" ? error.message : undefined,
          data: null,
        });
      }
      // If it's s3_key duplicate (very unlikely with random version)
      if (error.keyPattern && error.keyPattern.s3_key) {
        return res.status(400).json({
          status: false,
          message: "This file has already been uploaded to S3. Please try again.",
          error: process.env.NODE_ENV === "development" ? error.message : undefined,
          data: null,
        });
      }
    }

    res.status(500).json({
      status: false,
      message: "Failed to upload CSV file to S3",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

/**
 * Upload JSON configuration file to AWS S3
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.uploadJsonConfig = async (req, res) => {
  try {
    const { jsonConfig, fileName, uploadDate } = req.body;

    // Validate required fields
    if (!jsonConfig || !fileName || !uploadDate) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields: jsonConfig, fileName, or uploadDate",
        data: null,
      });
    }

    // Validate file name ends with .json
    if (!fileName.endsWith(".json")) {
      return res.status(400).json({
        status: false,
        message: "File name must end with .json",
        data: null,
      });
    }

    // Build S3 key based on requested folder structure
    const clientName = "test_sunglasses";
    const s3Key = `config/client_name=${clientName}/upload_date=${uploadDate}/${fileName}`;

    // Convert JSON config to string
    const jsonString = JSON.stringify(jsonConfig, null, 2);

    // Upload to S3
    const uploadParams = {
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      Body: jsonString,
      ContentType: "application/json",
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Construct S3 URL
    const s3Url = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${s3Key}`;

    res.status(200).json({
      status: true,
      message: "JSON configuration uploaded successfully",
      data: {
        fileName: fileName,
        s3Key: s3Key,
        s3Url: s3Url,
        uploadDate: uploadDate,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error uploading JSON config to S3:", error);

    res.status(500).json({
      status: false,
      message: "Failed to upload JSON configuration to S3",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

