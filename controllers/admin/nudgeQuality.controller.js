const { GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../../config/s3Config");
const { runNudgeQualityScript } = require("../../utils/nudgeQualityHelper");

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

    // Normalize category name to match S3 key format (spaces to underscores)
    // This matches how the nudge quality script stores the file
    const normalizedCategory = category.replace(/\s+/g, "_");

    // The questionnaire.json file is stored in S3 bucket
    // Read and parse the JSON file from S3
    try {
      const command = new GetObjectCommand({
        Bucket: "questiongenerationmprompt",
        Key: `${clientName}/${normalizedCategory}.jsonl`,
      });
      console.log(`Fetching questionnaire from S3: s3://questiongenerationmprompt/${clientName}/${normalizedCategory}.jsonl`);
      const response = await s3Client.send(command);
      const questionnaireData = await streamToString(response.Body);
      
      if (!questionnaireData || questionnaireData.trim().length === 0) {
        return res.status(404).json({
          status: false,
          message: "Questionnaire file is empty or not found",
          data: null,
        });
      }
      
      const parsedQuestionnaireData = JSON.parse(questionnaireData);
      console.log("Questionnaire data retrieved successfully");
      return res.status(200).json({
        status: true,
        message: "Questionnaire data retrieved successfully",
        data: parsedQuestionnaireData,
      });
    } catch (s3Error) {
      // Check if it's a 404 (file not found)
      if (s3Error.name === "NoSuchKey" || s3Error.$metadata?.httpStatusCode === 404) {
        console.error(`Questionnaire file not found: s3://questiongenerationmprompt/${clientName}/${normalizedCategory}.jsonl`);
        return res.status(404).json({
          status: false,
          message: `Nudge quality data not found for category "${category}". Please ensure r2.sh has completed successfully and nudge quality has been run.`,
          data: null,
        });
      }
      
      // Check if it's a JSON parse error
      if (s3Error instanceof SyntaxError) {
        console.error("Error parsing questionnaire JSON:", s3Error);
        return res.status(500).json({
          status: false,
          message: "Failed to parse questionnaire file",
          error: s3Error.message,
          data: null,
        });
      }
      
      // Other S3 errors
      console.error("Error fetching questionnaire from S3:", s3Error);
      return res.status(500).json({
        status: false,
        message: "Failed to fetch questionnaire file from S3",
        error: s3Error.message,
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

/**
 * Update questionnaire data in S3
 * PUT /api/v1/admin/nudge-quality/questionnaire
 * Body: { clientName: string, category: string, questionIndex: number, questionData: object }
 */
exports.updateQuestionnaire = async (req, res) => {
  try {
    const { clientName, category, questionIndex, questionData } = req.body;

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

    if (questionIndex === undefined || questionIndex === null || typeof questionIndex !== "number") {
      return res.status(400).json({
        status: false,
        message: "Question index is required and must be a number",
        data: null,
      });
    }

    if (!questionData || typeof questionData !== "object") {
      return res.status(400).json({
        status: false,
        message: "Question data is required and must be an object",
        data: null,
      });
    }

    // Normalize category name to match S3 key format (spaces to underscores)
    const normalizedCategory = category.replace(/\s+/g, "_");
    const s3Key = `${clientName}/${normalizedCategory}.jsonl`;
    const bucketName = "questiongenerationmprompt";

    try {
      // First, fetch the existing questionnaire data
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      console.log(`Fetching questionnaire from S3: s3://${bucketName}/${s3Key}`);
      const getResponse = await s3Client.send(getCommand);
      const existingData = await streamToString(getResponse.Body);

      if (!existingData || existingData.trim().length === 0) {
        return res.status(404).json({
          status: false,
          message: "Questionnaire file is empty or not found",
          data: null,
        });
      }

      // Parse the existing data
      const questionnaire = JSON.parse(existingData);

      // Validate question index
      if (!questionnaire.questions || !Array.isArray(questionnaire.questions)) {
        return res.status(400).json({
          status: false,
          message: "Invalid questionnaire format: questions array not found",
          data: null,
        });
      }

      if (questionIndex < 0 || questionIndex >= questionnaire.questions.length) {
        return res.status(400).json({
          status: false,
          message: `Question index ${questionIndex} is out of range. Total questions: ${questionnaire.questions.length}`,
          data: null,
        });
      }

      // Update the specific question
      questionnaire.questions[questionIndex] = {
        ...questionnaire.questions[questionIndex],
        ...questionData,
      };

      // Convert back to JSON string
      const updatedData = JSON.stringify(questionnaire, null, 2);

      // Upload the updated data back to S3
      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: updatedData,
        ContentType: "application/json",
      });

      console.log(`Updating questionnaire in S3: s3://${bucketName}/${s3Key}`);
      await s3Client.send(putCommand);

      console.log("Questionnaire updated successfully");
      return res.status(200).json({
        status: true,
        message: "Questionnaire updated successfully",
        data: questionnaire.questions[questionIndex],
      });
    } catch (s3Error) {
      // Check if it's a 404 (file not found)
      if (s3Error.name === "NoSuchKey" || s3Error.$metadata?.httpStatusCode === 404) {
        console.error(`Questionnaire file not found: s3://${bucketName}/${s3Key}`);
        return res.status(404).json({
          status: false,
          message: `Questionnaire file not found for category "${category}"`,
          data: null,
        });
      }

      // Check if it's a JSON parse error
      if (s3Error instanceof SyntaxError) {
        console.error("Error parsing questionnaire JSON:", s3Error);
        return res.status(500).json({
          status: false,
          message: "Failed to parse questionnaire file",
          error: s3Error.message,
          data: null,
        });
      }

      // Other S3 errors
      console.error("Error updating questionnaire in S3:", s3Error);
      return res.status(500).json({
        status: false,
        message: "Failed to update questionnaire file in S3",
        error: s3Error.message,
        data: null,
      });
    }
  } catch (error) {
    console.error("Unexpected error in updateQuestionnaire controller:", error);
    return res.status(500).json({
      status: false,
      message: "Unexpected error occurred while updating questionnaire",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

