/* global process */
const { exec } = require("child_process");
const { promisify } = require("util");
const { HeadObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../../config/s3Config");

const execAsync = promisify(exec);

/**
 * Helper function to convert stream to string
 * @param {Stream} stream - Stream to convert
 * @returns {Promise<string>}
 */
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
  const outputPath = `s3://questiongenerationmprompt/${clientName}/${normalizedCategory}.jsonl`;
  
  // Verify S3 file exists before running script
  const fileExists = await verifyS3FileExists(clientName, normalizedCategory);
  if (!fileExists) {
    throw new Error(`S3 file does not exist: ${s3InputPath}. Please verify the file path and ensure the file has been uploaded.`);
  }
  
  // Change to the script directory before executing
  const scriptDir = "/var/www/html/qgen";
  
  // Ensure AWS credentials are available to the script (for any S3 operations in run.sh)
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION || "ap-south-1";
  
  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error("AWS credentials are not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.");
  }
  
  // Build command with explicit AWS credential export
  // Use the local file path instead of S3 path
  const command = `export AWS_ACCESS_KEY_ID="${awsAccessKeyId}" && export AWS_SECRET_ACCESS_KEY="${awsSecretAccessKey}" && export AWS_DEFAULT_REGION="${awsRegion}" && export AWS_REGION="${awsRegion}" && bash ./deploy.sh ${s3InputPath} ${outputPath}`;
  
  console.log(`Executing nudge quality script: bash ./deploy.sh ${s3InputPath} ${outputPath} in ${scriptDir}`);
  console.log(`AWS credentials configured for script execution`);
  
  try {
    const result = await execAsync(command, {
      cwd: scriptDir,
      timeout: 3600000, // 1 hour timeout
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: awsAccessKeyId,
        AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
        AWS_DEFAULT_REGION: awsRegion,
        AWS_REGION: awsRegion,
      },
    });
    
    return result;
  } catch (error) {
    throw error;
  }
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

/**
 * Get questionnaire data from the generated JSON file
 * GET /api/v1/admin/nudge-quality/questionnaire
 * Query: { clientName: string, category: string }
 */
exports.getQuestionnaire = async (req, res) => {
  try {
    const { clientName, category } = req.query;

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

    // The questionnaire.json file is generated at /var/www/html/qgen/output/questionnaire.json
    // Read and parse the JSON file
    try {
      const command = new GetObjectCommand({
        Bucket: "questiongenerationmprompt",
        Key: `${clientName}/${category}.jsonl`,
      });
      console.log("command", command);
      const response = await s3Client.send(command);
      const questionnaireData = await streamToString(response.Body);
      console.log("questionnaireData", questionnaireData);
      const parsedQuestionnaireData = JSON.parse(questionnaireData);
      console.log("parsedQuestionnaireData", parsedQuestionnaireData);
      return res.status(200).json({
        status: true,
        message: "Questionnaire data retrieved successfully",
        data: parsedQuestionnaireData,
      });
    } catch (parseError) {
      console.error("Error parsing questionnaire JSON:", parseError);
      return res.status(500).json({
        status: false,
        message: "Failed to parse questionnaire file",
        error: parseError.message,
        data: null,
      });
    }
  } catch (error) {
    console.error("Unexpected error in getQuestionnaire controller:", error);
    return res.status(500).json({
      status: false,
      message: "Unexpected error occurred while reading questionnaire",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

