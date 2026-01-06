/* global process */
const { spawn } = require("child_process");
const { runNudgeQualityForCategories } = require("../../utils/nudgeQualityHelper");

/**
 * Run r1.sh script with client name and categories using spawn for better long-running process handling
 * @param {string} clientName - Client name (e.g., "gardenia")
 * @param {string[]} categories - Array of category names
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
const runR1Script = async (clientName, categories) => {
  const scriptDir = "/var/www/html/researcher1";
  const scriptArgs = ["./r1.sh", clientName, ...categories];
  
  console.log("Running r1.sh command:", `bash ${scriptArgs.join(" ")}`);
  console.log("Working directory:", scriptDir);
  
  return new Promise((resolve, reject) => {
    const child = spawn("bash", scriptArgs, {
      cwd: scriptDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      const output = data.toString();
      stdout += output;
      // Log progress in real-time for debugging
      process.stdout.write(output);
    });

    child.stderr.on("data", (data) => {
      const output = data.toString();
      stderr += output;
      // Log errors in real-time
      process.stderr.write(output);
    });

    const timeout = setTimeout(() => {
      console.error("r1.sh execution timeout after 1 hour");
      child.kill("SIGTERM");
      const error = new Error("Script execution timeout after 1 hour");
      error.stdout = stdout;
      error.stderr = stderr;
      error.code = "ETIMEDOUT";
      reject(error);
    }, 3600000); // 1 hour timeout

    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      
      if (signal === "SIGTERM" && code === null) {
        const error = new Error(`r1.sh was terminated (SIGTERM). This may indicate the process was killed externally.`);
        error.stdout = stdout;
        error.stderr = stderr;
        error.code = code;
        error.signal = signal;
        reject(error);
      } else if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`r1.sh exited with code ${code}${signal ? ` and signal ${signal}` : ""}`);
        error.stdout = stdout;
        error.stderr = stderr;
        error.code = code;
        error.signal = signal;
        reject(error);
      }
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      console.error("Error spawning r1.sh process:", error);
      reject(error);
    });
  });
};

/**
 * Run r2.sh script with client name using spawn for better long-running process handling
 * @param {string} clientName - Client name (e.g., "gardenia")
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
const runR2Script = async (clientName) => {
  const scriptDir = "/var/www/html/researcher1/r2";
  const scriptArgs = ["./r2.sh", clientName];
  
  console.log("Running r2.sh command:", `bash ${scriptArgs.join(" ")}`);
  console.log("Working directory:", scriptDir);
  
  return new Promise((resolve, reject) => {
    const child = spawn("bash", scriptArgs, {
      cwd: scriptDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });

    child.stderr.on("data", (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });

    const timeout = setTimeout(() => {
      console.error("r2.sh execution timeout after 1 hour");
      child.kill("SIGTERM");
      const error = new Error("Script execution timeout after 1 hour");
      error.stdout = stdout;
      error.stderr = stderr;
      error.code = "ETIMEDOUT";
      reject(error);
    }, 3600000); // 1 hour timeout

    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      
      if (signal === "SIGTERM" && code === null) {
        const error = new Error(`r2.sh was terminated (SIGTERM). This may indicate the process was killed externally.`);
        error.stdout = stdout;
        error.stderr = stderr;
        error.code = code;
        error.signal = signal;
        reject(error);
      } else if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`r2.sh exited with code ${code}${signal ? ` and signal ${signal}` : ""}`);
        error.stdout = stdout;
        error.stderr = stderr;
        error.code = code;
        error.signal = signal;
        reject(error);
      }
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      console.error("Error spawning r2.sh process:", error);
      reject(error);
    });
  });
};

/**
 * Run clearfiles.sh script to clean up files when r2.sh fails
 * @param {string} clientName - Client name
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
const runClearFilesScript = async (clientName) => {
  const scriptDir = "/var/www/html/researcher1/r2";
  const scriptArgs = ["./clearfiles.sh", clientName];
  
  console.log("Running clearfiles.sh command:", `bash ${scriptArgs.join(" ")}`);
  
  return new Promise((resolve, reject) => {
    const child = spawn("bash", scriptArgs, {
      cwd: scriptDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      console.error("clearfiles.sh execution timeout after 1 minute");
      child.kill("SIGTERM");
      const error = new Error("Script execution timeout");
      error.stdout = stdout;
      error.stderr = stderr;
      error.code = "ETIMEDOUT";
      reject(error);
    }, 60000); // 1 minute timeout

    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`clearfiles.sh exited with code ${code}${signal ? ` and signal ${signal}` : ""}`);
        error.stdout = stdout;
        error.stderr = stderr;
        error.code = code;
        error.signal = signal;
        reject(error);
      }
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      console.error("Error spawning clearfiles.sh process:", error);
      reject(error);
    });
  });
};

/**
 * Background processing function to run scripts sequentially
 * This runs asynchronously after the HTTP response is sent
 */
const processScriptsInBackground = async (clientName, categories) => {
  try {
    console.log(`[Background] Starting script execution for client: ${clientName}`);
    console.log(`[Background] Categories: ${categories.join(", ")}`);

    // Update sync state to indicate scripts are running
    try {
      const SyncState = require("../../models/syncState.schema");
      await SyncState.findOneAndUpdate(
        { clientName },
        {
          $set: {
            status: "running",
            isRunningScripts: true,
            selectedCategories: categories,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );
      console.log("[Background] Sync state updated to 'running'");
    } catch (syncError) {
      console.error("[Background] Error updating sync state to running:", syncError);
    }

    // Run r1.sh first
    let r1Result;
    try {
      console.log("[Background] Running r1.sh...");
      r1Result = await runR1Script(clientName, categories);
      console.log("[Background] r1.sh completed successfully");
      if (r1Result.stderr) {
        console.log("[Background] r1.sh stderr:", r1Result.stderr);
      }
    } catch (error) {
      console.error("[Background] r1.sh failed:", error);
      console.error("[Background] Error details:", {
        message: error.message,
        code: error.code,
        signal: error.signal,
        stdoutLength: error.stdout?.length || 0,
        stderrLength: error.stderr?.length || 0,
      });
      
      // Update sync state to reflect script failure
      try {
        const SyncState = require("../../models/syncState.schema");
        await SyncState.findOneAndUpdate(
          { clientName },
          {
            $set: {
              status: "failed",
              currentStep: 1,
              isRunningScripts: false,
              pipelineStatus: null,
              selectedCategories: [],
              lastError: error.message,
            },
          },
          {
            upsert: true,
            new: true,
          }
        );
        console.log("[Background] Sync state updated to reflect r1.sh failure");
      } catch (syncError) {
        console.error("[Background] Error updating sync state after r1.sh failure:", syncError);
      }
      
      return; // Exit early on r1.sh failure
    }

    // Run r2.sh after r1.sh completes successfully
    let r2Result;
    try {
      console.log("[Background] Running r2.sh...");
      r2Result = await runR2Script(clientName);
      console.log("[Background] r2.sh completed successfully");
      if (r2Result.stderr) {
        console.log("[Background] r2.sh stderr:", r2Result.stderr);
      }
    } catch (error) {
      console.error("[Background] r2.sh failed:", error);
      console.error("[Background] Error details:", {
        message: error.message,
        code: error.code,
        signal: error.signal,
        stdoutLength: error.stdout?.length || 0,
        stderrLength: error.stderr?.length || 0,
      });
      
      // Run clearfiles.sh when r2.sh fails
      try {
        console.log("[Background] r2.sh failed. Running clearfiles.sh to clean up...");
        const clearFilesResult = await runClearFilesScript(clientName);
        console.log("[Background] clearfiles.sh completed successfully");
      } catch (clearFilesError) {
        console.error("[Background] clearfiles.sh also failed:", clearFilesError);
      }
      
      // Update sync state to reflect script failure
      try {
        const SyncState = require("../../models/syncState.schema");
        await SyncState.findOneAndUpdate(
          { clientName },
          {
            $set: {
              status: "failed",
              currentStep: 1,
              isRunningScripts: false,
              pipelineStatus: null,
              selectedCategories: [],
              lastError: error.message,
            },
          },
          {
            upsert: true,
            new: true,
          }
        );
        console.log("[Background] Sync state updated to reflect r2.sh failure");
      } catch (syncError) {
        console.error("[Background] Error updating sync state after r2.sh failure:", syncError);
      }
      
      return; // Exit early on r2.sh failure
    }

    // After r2.sh completes successfully, run nudge quality for all categories
    let nudgeQualityResults = [];
    try {
      console.log("[Background] r2.sh completed successfully. Starting nudge quality for all categories...");
      nudgeQualityResults = await runNudgeQualityForCategories(clientName, categories);
      
      const successCount = nudgeQualityResults.filter(r => r.success).length;
      const failureCount = nudgeQualityResults.filter(r => !r.success).length;
      
      console.log(`[Background] Nudge quality completed: ${successCount} succeeded, ${failureCount} failed`);
      
      if (failureCount > 0) {
        console.warn("[Background] Some categories failed nudge quality:", 
          nudgeQualityResults.filter(r => !r.success).map(r => r.category).join(", ")
        );
      }
    } catch (error) {
      console.error("[Background] Error running nudge quality for categories:", error);
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
            currentStep: 1,
            lastSyncDate: now,
            lastSyncCompletedAt: now,
            pipelineStatus: null,
            selectedCategories: [],
            isRunningScripts: false,
            lastError: null,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );
      console.log("[Background] Sync completion date saved successfully");
    } catch (syncError) {
      console.error("[Background] Error saving sync completion date:", syncError);
    }

    console.log(`[Background] Script execution completed successfully for client: ${clientName}`);
  } catch (error) {
    console.error("[Background] Unexpected error in background script processing:", error);
    
    // Update sync state to reflect unexpected error
    try {
      const SyncState = require("../../models/syncState.schema");
      await SyncState.findOneAndUpdate(
        { clientName },
        {
          $set: {
            status: "failed",
            isRunningScripts: false,
            lastError: error.message,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );
    } catch (syncError) {
      console.error("[Background] Error updating sync state after unexpected error:", syncError);
    }
  }
};

/**
 * Controller to run r1.sh and r2.sh scripts sequentially
 * POST /api/v1/admin/run-scripts
 * Body: { clientName: string, categories: string[] }
 * 
 * Returns immediately with 202 Accepted and processes scripts in background
 * to avoid HTTP timeout issues with long-running processes
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

    console.log(`Received request to run scripts for client: ${clientName}`);
    console.log(`Categories: ${categories.join(", ")}`);

    // Return immediately with 202 Accepted
    // Scripts will be processed in the background
    res.status(202).json({
      status: true,
      message: "Script execution started. Processing in background.",
      data: {
        clientName,
        categories,
        note: "Check sync status endpoint for progress updates",
      },
    });

    // Process scripts in background (fire-and-forget)
    // Don't await - let it run asynchronously
    processScriptsInBackground(clientName, categories).catch((error) => {
      console.error("[Background] Unhandled error in background processing:", error);
    });
  } catch (error) {
    console.error("Unexpected error in runScripts controller:", error);
    return res.status(500).json({
      status: false,
      message: "Unexpected error occurred while starting script execution",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

