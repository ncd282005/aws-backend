/* global process */
const { exec } = require("child_process");
const { promisify } = require("util");
const { HeadObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../../config/s3Config");

const execAsync = promisify(exec);

/**
 * Run nudge quality script (deploy.sh) for a category
 * @param {string} clientName - Client name
 * @param {string} category - Category name
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
/**
 * Verify S3 file exists before running script
 * @param {string} clientName - Client name
 * @param {string} normalizedCategory - Normalized category name
 * @returns {Promise<boolean>}
 */
const verifyS3FileExists = async (clientName, normalizedCategory) => {
  try {
    // Extract bucket and key from S3 path
    const bucket = "researcher2";
    const key = `${clientName}/${normalizedCategory}.jsonl`;
    
    console.log(`Verifying S3 file exists: s3://${bucket}/${key}`);
    
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    await s3Client.send(command);
    console.log(`S3 file verified: s3://${bucket}/${key}`);
    return true;
  } catch (error) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      console.error(`S3 file not found: s3://researcher2/${clientName}/${normalizedCategory}.jsonl`);
      return false;
    }
    console.error(`Error verifying S3 file:`, error);
    // If we can't verify, still try to run the script (maybe it's a permissions issue)
    return true;
  }
};

const runNudgeQualityScript = async (clientName, category) => {
  // Normalize category name for S3 path (replace spaces with underscores)
  const normalizedCategory = category.replace(/\s+/g, "_");

  console.log("normalizedCategory", normalizedCategory);
  
  const s3InputPath = `s3://researcher2/${clientName}/${normalizedCategory}.jsonl`;
  const outputPath = `/var/www/html/qgen/output/questionnaire.json`;
  
  // Verify S3 file exists before running script
  const fileExists = await verifyS3FileExists(clientName, normalizedCategory);
  if (!fileExists) {
    throw new Error(`S3 file does not exist: ${s3InputPath}. Please verify the file path and ensure the file has been uploaded.`);
  }
  
  // Change to the script directory before executing (following the pattern from runScripts.controller.js)
  const scriptDir = "/var/www/html/qgen";
  const command = `bash ./deploy.sh ${s3InputPath} ${outputPath}`;
  
  console.log(`Executing nudge quality script: ${command} in ${scriptDir}`);
  
  return execAsync(command, {
    cwd: scriptDir,
    timeout: 3600000, // 1 hour timeout
    env: {
      ...process.env,
      // Ensure AWS credentials are available to the script
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: process.env.AWS_REGION || "ap-south-1",
    },
  });
};

/**
 * Controller to run nudge quality script for a category
 * POST /api/v1/admin/nudge-quality
 * Body: { clientName: string, category: string }
 */
exports.runNudgeQuality = async (req, res) => {
  try {
    const { clientName, category } = req.body;

    // Validate input
    if (!clientName || typeof clientName !== "string") {
      return res.status(400).json({
        status: false,
        message: "Client name is required and must be a string",
        data: null,
      });
    }

    if (!category || typeof category !== "string") {
      return res.status(400).json({
        status: false,
        message: "Category is required and must be a string",
        data: null,
      });
    }

    console.log(`Starting nudge quality script execution for client: ${clientName}, category: ${category}`);

    // Run the script
    let result;
    try {
      result = await runNudgeQualityScript(clientName, category);
      console.log("Nudge quality script completed successfully");
      console.log("Script stdout:", result.stdout);
      if (result.stderr) {
        console.log("Script stderr:", result.stderr);
      }
    } catch (error) {
      console.error("Nudge quality script failed:", error);
      return res.status(500).json({
        status: false,
        message: "Nudge quality script execution failed",
        error: error.message,
        stdout: error.stdout || "",
        stderr: error.stderr || "",
        data: null,
      });
    }

    // Script completed successfully
    return res.status(200).json({
      status: true,
      message: "Nudge quality script executed successfully",
      data: {
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        output: result.stdout || "Script executed successfully",
      },
    });
  } catch (error) {
    console.error("Unexpected error in runNudgeQuality controller:", error);
    return res.status(500).json({
      status: false,
      message: "Unexpected error occurred while running nudge quality script",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

