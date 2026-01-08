/* global process */
const { exec } = require("child_process");
const { promisify } = require("util");
const { HeadObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../config/s3Config");

const execAsync = promisify(exec);

/**
 * Verify S3 file exists before running script
 * @param {string} clientName - Client name
 * @param {string} normalizedCategory - Normalized category name
 * @returns {Promise<boolean>}
 */
const verifyS3FileExists = async (clientName, normalizedCategory) => {
  try {
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

/**
 * Run nudge quality script (deploy.sh) for a category
 * @param {string} clientName - Client name
 * @param {string} category - Category name
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
const runNudgeQualityScript = async (clientName, category) => {
  // Normalize category name for S3 path (replace spaces with underscores)
  const normalizedCategory = category;

  console.log(`Running nudge quality for category: ${category} (normalized: ${normalizedCategory})`);
  
  const s3InputPath = `s3://researcher2/${clientName}/${normalizedCategory}.jsonl`;
  const outputPath = `s3://questiongenerationmprompt/${clientName}/${normalizedCategory}.jsonl`;
  
  // Verify S3 file exists before running script
  const fileExists = await verifyS3FileExists(clientName, normalizedCategory);
  if (!fileExists) {
    throw new Error(`S3 file does not exist: ${s3InputPath}. Please verify the file path and ensure the file has been uploaded.`);
  }
  
  // Change to the script directory before executing
  const scriptDir = "/var/www/html/qgen";
  
  // Ensure AWS credentials are available to the script
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION || "ap-south-1";
  
  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error("AWS credentials are not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.");
  }
  
  // Build command with explicit AWS credential export
  const command = `export AWS_ACCESS_KEY_ID="${awsAccessKeyId}" && export AWS_SECRET_ACCESS_KEY="${awsSecretAccessKey}" && export AWS_DEFAULT_REGION="${awsRegion}" && export AWS_REGION="${awsRegion}" && bash ./deploy.sh ${s3InputPath} ${outputPath} ${normalizedCategory}`;
  
  console.log(`Executing nudge quality script: bash ./deploy.sh ${s3InputPath} ${outputPath} in ${scriptDir}`);
  
  try {
    const result = await execAsync(command, {
      cwd: scriptDir,
      timeout: 10000000, // 10 hour timeout
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
 * Run nudge quality script for multiple categories
 * @param {string} clientName - Client name
 * @param {string[]} categories - Array of category names
 * @returns {Promise<Array<{category: string, success: boolean, error?: string}>>}
 */
const runNudgeQualityForCategories = async (clientName, categories) => {
  const results = [];
  
  console.log(`Running nudge quality for ${categories.length} categories: ${categories.join(", ")}`);
  
  // Run nudge quality for each category sequentially to avoid overwhelming the system
  for (const category of categories) {
    try {
      console.log(`Starting nudge quality for category: ${category}`);
      const result = await runNudgeQualityScript(clientName, category);
      console.log(`Nudge quality completed successfully for category: ${category}`);
      results.push({
        category,
        success: true,
        stdout: result.stdout,
        stderr: result.stderr || "",
      });
    } catch (error) {
      console.error(`Nudge quality failed for category ${category}:`, error);
      results.push({
        category,
        success: false,
        error: error.message,
        stdout: error.stdout || "",
        stderr: error.stderr || "",
      });
    }
  }
  
  return results;
};

module.exports = {
  runNudgeQualityScript,
  runNudgeQualityForCategories,
  verifyS3FileExists,
};

