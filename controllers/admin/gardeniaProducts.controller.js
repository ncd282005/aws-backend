/* global process */
const {
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { s3Client } = require("../../config/s3Config");

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
 * Get all products from S3 bucket researcher2/gardenia/
 * Reads all JSONL files and extracts product_id and category
 */
exports.getGardeniaProducts = async (req, res) => {
  try {
    const BUCKET_NAME = "researcher2";
    const clientName = req.query.clientName;
    if (!clientName || clientName.trim() === "") {
      return res.status(400).json({
        status: false,
        message: "clientName is required in query parameters.",
        data: null,
      });
    }
    const PREFIX = `${clientName}/`;
    
    // List all JSONL files in the gardenia folder
    const jsonlFiles = [];
    let continuationToken = undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: PREFIX,
        ContinuationToken: continuationToken,
      });

      const listResponse = await s3Client.send(listCommand);
      continuationToken = listResponse.IsTruncated
        ? listResponse.NextContinuationToken
        : undefined;

      (listResponse.Contents || []).forEach((object) => {
        if (object?.Key && object.Key.endsWith(".jsonl")) {
          jsonlFiles.push({
            key: object.Key,
            category: object.Key
              .replace(PREFIX, "")
              .replace(".jsonl", "")
              .replace(/_/g, " "),
          });
        }
      });
    } while (continuationToken);

    if (jsonlFiles.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No JSONL files found in S3 bucket",
        data: [],
      });
    }

    // Read and parse all JSONL files
    const allProducts = [];
    const errors = [];

    for (const file of jsonlFiles) {
      try {
        const getCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: file.key,
        });

        const response = await s3Client.send(getCommand);
        const fileContent = await streamToString(response.Body);

        if (!fileContent) {
          continue;
        }

        // Parse JSONL file (each line is a JSON object)
        const lines = fileContent
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        lines.forEach((line) => {
          try {
            const product = JSON.parse(line);
            if (product.product_id && product.category) {
              allProducts.push({
                id: product.product_id,
                product: product.product_id,
                category: product.category,
                processing: "PROCESSED", // Default status
                ecommerce: "ACTIVE", // Default status
                // Include full product data for factsheet
                attributes: product.attributes || {},
                source_urls: product.source_urls || [],
                fullProduct: product, // Store full product object
              });
            }
          } catch (parseError) {
            console.error(`Error parsing JSON line in ${file.key}:`, parseError);
            // Continue with next line
          }
        });
      } catch (fileError) {
        console.error(`Error reading file ${file.key}:`, fileError);
        errors.push({
          file: file.key,
          error: fileError.message,
        });
      }
    }

    return res.status(200).json({
      status: true,
      message: "Products fetched successfully",
      data: allProducts,
      errors: errors.length > 0 ? errors : undefined,
      totalProducts: allProducts.length,
    });
  } catch (error) {
    console.error("Failed to fetch gardenia products:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch gardenia products",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

