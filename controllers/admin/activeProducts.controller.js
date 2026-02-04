/* global process */
const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs").promises;

const execAsync = promisify(exec);

/**
 * Run activeproduct.sh script to get list of active product IDs
 * @param {string} index - Index parameter (e.g., "test")
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
const runActiveProductScript = async (index) => {
  const scriptPath = "/var/www/html/qgen/activeproduct.sh";
  const command = `./activeproduct.sh "${index}"`;
  console.log("Running activeproduct.sh command:", command);
  
  // Change to the script directory before executing
  const scriptDir = "/var/www/html/qgen";
  
  return execAsync(command, {
    cwd: scriptDir,
    timeout: 300000, // 5 minutes timeout
  });
};

/**
 * Read product IDs from the processed_ids.txt file
 * The script saves output to /var/www/html/vector_upsert/processed_ids.txt
 * @returns {Promise<string[]>} - Array of active product IDs
 */
const readActiveProductIdsFromFile = async (index) => {
  const filePath = `/var/www/html/vector_upsert/${index}-processed_ids.txt`;
  
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    
    // Split by newlines and filter out empty lines
    const productIds = fileContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    
    return productIds;
  } catch (error) {
    console.error("Error reading processed_ids.txt:", error);
    throw new Error(`Failed to read product IDs from file: ${error.message}`);
  }
};

/**
 * Controller to get active product IDs by running activeproduct.sh script
 * GET /api/v1/admin/active-products?index=test
 */
exports.getActiveProducts = async (req, res) => {
  try {
    const { index } = req.query;

    // Validate input
    if (!index || typeof index !== "string") {
      return res.status(400).json({
        status: false,
        message: "index parameter is required and must be a string",
        data: null,
      });
    }

    // console.log(`Fetching active products for index: ${index}`);

    // Run the script
    let scriptResult;
    try {
      // console.log("Running activeproduct.sh...");
      scriptResult = await runActiveProductScript(index);
      // console.log("activeproduct.sh completed successfully");
      // console.log("activeproduct.sh stdout:", scriptResult.stdout);
      if (scriptResult.stderr) {
        // console.log("activeproduct.sh stderr:", scriptResult.stderr);
      }
    } catch (error) {
      console.error("activeproduct.sh failed:", error);
      return res.status(500).json({
        status: false,
        message: "activeproduct.sh script execution failed",
        error: error.message,
        stdout: error.stdout || "",
        stderr: error.stderr || "",
        data: null,
      });
    }

    // Read the product IDs from the file created by the script
    let activeProductIds;
    try {
      activeProductIds = await readActiveProductIdsFromFile(index);
      // console.log(`Found ${activeProductIds.length} active products`);
    } catch (error) {
      console.error("Error reading product IDs from file:", error);
      return res.status(500).json({
        status: false,
        message: "Failed to read product IDs from file",
        error: error.message,
        data: null,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Active products fetched successfully",
      data: {
        activeProductIds,
        count: activeProductIds.length,
        scriptOutput: {
          stdout: scriptResult.stdout,
          stderr: scriptResult.stderr || "",
        },
      },
    });
  } catch (error) {
    console.error("Unexpected error in getActiveProducts controller:", error);
    return res.status(500).json({
      status: false,
      message: "Unexpected error occurred while fetching active products",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

