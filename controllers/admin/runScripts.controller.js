/* global process */
const { exec } = require("child_process");
const { promisify } = require("util");
const { runNudgeQualityForCategories } = require("../../utils/nudgeQualityHelper");

const execAsync = promisify(exec);

/**
 * Run r1.sh script with client name and categories
 * @param {string} clientName - Client name (e.g., "gardenia")
 * @param {string[]} categories - Array of category names
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
const runR1Script = async (clientName, categories) => {
  const scriptPath = "/var/www/html/researcher1/r1.sh";
  const categoriesString = categories.map((cat) => `"${cat}"`).join(" ");
  const command = `bash ./r1.sh ${clientName} ${categoriesString}`;
  console.log("command:", command);
  
  // Change to the script directory before executing
  const scriptDir = "/var/www/html/researcher1";
  
  return execAsync(command, {
    cwd: scriptDir,
    timeout: 3600000, // 1 hour timeout
  });
};

/**
 * Run r2.sh script with client name
 * @param {string} clientName - Client name (e.g., "gardenia")
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
const runR2Script = async (clientName) => {
  const command = `bash ./r2.sh ${clientName}`;
  
  // Change to the script directory before executing
  const scriptDir = "/var/www/html/researcher1/r2";
  
  return execAsync(command, {
    cwd: scriptDir,
    timeout: 3600000, // 1 hour timeout
  });
};

/**
 * Run clearfiles.sh script to clean up files when r2.sh fails
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
const runClearFilesScript = async () => {
  const command = `bash ./clearfiles.sh`;
  
  // Change to the script directory before executing
  const scriptDir = "/var/www/html/researcher1/r2";
  
  return execAsync(command, {
    cwd: scriptDir,
    timeout: 60000, // 1 minute timeout (should be quick)
  });
};

/**
 * Controller to run r1.sh and r2.sh scripts sequentially
 * POST /api/v1/admin/run-scripts
 * Body: { clientName: string, categories: string[] }
 */
exports.runScripts = async (req, res) => {
  try {
    const { clientName, categories } = req.body;

    // Validate input
    if (!clientName || typeof clientName !== "string") {
      return res.status(400).json({
        status: false,
        message: "Client name is required and must be a string",
        data: null,
      });
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Categories array is required and must contain at least one category",
        data: null,
      });
    }

    console.log(`Starting script execution for client: ${clientName}`);
    console.log(`Categories: ${categories.join(", ")}`);

    // Run r1.sh first
    let r1Result;
    try {
      console.log("Running r1.sh...");
      r1Result = await runR1Script(clientName, categories);
      console.log("r1.sh completed successfully");
      console.log("r1.sh stdout:", r1Result.stdout);
      if (r1Result.stderr) {
        console.log("r1.sh stderr:", r1Result.stderr);
      }
    } catch (error) {
      console.error("r1.sh failed:", error);
      
      // Update sync state to reflect script failure
      try {
        const SyncState = require("../../models/syncState.schema");
        await SyncState.findOneAndUpdate(
          { clientName },
          {
            $set: {
              status: "failed",
              currentStep: 1, // Reset to step 1 on failure
              isRunningScripts: false, // Clear scripts running state
              pipelineStatus: null,
              selectedCategories: [],
            },
          },
          {
            upsert: true,
            new: true,
          }
        );
        console.log("Sync state updated to reflect r1.sh failure");
      } catch (syncError) {
        console.error("Error updating sync state after r1.sh failure:", syncError);
        // Continue with error response even if sync state update fails
      }
      
      return res.status(500).json({
        status: false,
        message: "r1.sh script execution failed",
        error: error.message,
        stdout: error.stdout || "",
        stderr: error.stderr || "",
        data: null,
      });
    }

    // Run r2.sh after r1.sh completes successfully
    let r2Result;
    try {
      console.log("Running r2.sh...");
      r2Result = await runR2Script(clientName);
      console.log("r2.sh completed successfully");
      console.log("r2.sh stdout:", r2Result.stdout);
      if (r2Result.stderr) {
        console.log("r2.sh stderr:", r2Result.stderr);
      }
    } catch (error) {
      console.error("r2.sh failed:", error);
      
      // Run clearfiles.sh when r2.sh fails
      try {
        console.log("r2.sh failed. Running clearfiles.sh to clean up...");
        const clearFilesResult = await runClearFilesScript();
        console.log("clearfiles.sh completed successfully");
        console.log("clearfiles.sh stdout:", clearFilesResult.stdout);
        if (clearFilesResult.stderr) {
          console.log("clearfiles.sh stderr:", clearFilesResult.stderr);
        }
      } catch (clearFilesError) {
        console.error("clearfiles.sh also failed:", clearFilesError);
        // Continue with error response even if clearfiles.sh fails
      }
      
      // Update sync state to reflect script failure
      try {
        const SyncState = require("../../models/syncState.schema");
        await SyncState.findOneAndUpdate(
          { clientName },
          {
            $set: {
              status: "failed",
              currentStep: 1, // Reset to step 1 on failure
              isRunningScripts: false, // Clear scripts running state
              pipelineStatus: null,
              selectedCategories: [],
            },
          },
          {
            upsert: true,
            new: true,
          }
        );
        console.log("Sync state updated to reflect r2.sh failure");
      } catch (syncError) {
        console.error("Error updating sync state after r2.sh failure:", syncError);
        // Continue with error response even if sync state update fails
      }
      
      return res.status(500).json({
        status: false,
        message: "r2.sh script execution failed",
        error: error.message,
        stdout: error.stdout || "",
        stderr: error.stderr || "",
        r1Completed: true,
        data: null,
      });
    }

    // After r2.sh completes successfully, run nudge quality for all categories
    let nudgeQualityResults = [];
    try {
      console.log("r2.sh completed successfully. Starting nudge quality for all categories...");
      nudgeQualityResults = await runNudgeQualityForCategories(clientName, categories);
      
      const successCount = nudgeQualityResults.filter(r => r.success).length;
      const failureCount = nudgeQualityResults.filter(r => !r.success).length;
      
      console.log(`Nudge quality completed: ${successCount} succeeded, ${failureCount} failed`);
      
      if (failureCount > 0) {
        console.warn("Some categories failed nudge quality:", 
          nudgeQualityResults.filter(r => !r.success).map(r => r.category).join(", ")
        );
      }
    } catch (error) {
      console.error("Error running nudge quality for categories:", error);
      // Don't fail the entire request if nudge quality fails, but log it
      nudgeQualityResults = [{
        error: "Failed to run nudge quality for categories",
        details: error.message,
      }];
    }

    // Both scripts completed successfully - save completion date
    try {
      const SyncState = require("../../models/syncState.schema");
      const now = new Date();
      
      await SyncState.findOneAndUpdate(
        { clientName },
        {
          $set: {
            status: "completed",
            currentStep: 1, // Reset to step 1 after completion
            lastSyncDate: now,
            lastSyncCompletedAt: now,
            // Clear intermediate state
            pipelineStatus: null,
            selectedCategories: [],
            isRunningScripts: false, // Clear scripts running state
          },
        },
        {
          upsert: true,
          new: true,
        }
      );
      console.log("Sync completion date saved successfully");
    } catch (syncError) {
      console.error("Error saving sync completion date:", syncError);
      // Don't fail the request if sync state save fails
    }

    // Both scripts completed successfully
    return res.status(200).json({
      status: true,
      message: "Both scripts executed successfully",
      data: {
        r1: {
          stdout: r1Result.stdout,
          stderr: r1Result.stderr || "",
        },
        r2: {
          stdout: r2Result.stdout,
          stderr: r2Result.stderr || "",
        },
        nudgeQuality: {
          results: nudgeQualityResults,
          totalCategories: categories.length,
          successCount: nudgeQualityResults.filter(r => r.success).length,
          failureCount: nudgeQualityResults.filter(r => !r.success).length,
        },
      },
    });
  } catch (error) {
    console.error("Unexpected error in runScripts controller:", error);
    return res.status(500).json({
      status: false,
      message: "Unexpected error occurred while running scripts",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

