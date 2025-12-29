/* global process */
const {
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { s3Client } = require("../../config/s3Config");
const Papa = require("papaparse");

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
 * Parse CSV file content
 * @param {string} csvContent - CSV file content
 * @returns {Array} - Parsed CSV rows as objects
 */
const parseCSV = (csvContent) => {
  try {
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (result.errors && result.errors.length > 0) {
      console.error("CSV parsing errors:", result.errors);
    }

    return Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error("Error parsing CSV:", error);
    return [];
  }
};

/**
 * Fetch unprocessed products from CSV files
 * Lists all CSV files in unprocesseddata/${clientName}/ directory
 * @param {string} clientName - Client name
 * @returns {Promise<Array>} - Array of unprocessed products
 */
const fetchUnprocessedProducts = async (clientName) => {
  const unprocessedProducts = [];
  const unprocessedBucket = "testdevopsetl";
  const errors = [];
  const prefix = `unprocesseddata/${clientName}/`;

  try {
    // List all CSV files in the unprocessed data directory
    const csvFiles = [];
    let continuationToken = undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: unprocessedBucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const listResponse = await s3Client.send(listCommand);
      continuationToken = listResponse.IsTruncated
        ? listResponse.NextContinuationToken
        : undefined;

      (listResponse.Contents || []).forEach((object) => {
        if (object?.Key && object.Key.endsWith(".csv")) {
          // Extract category name from file path
          // Format: unprocesseddata/${clientName}/${Category}.csv
          const fileName = object.Key.replace(prefix, "").replace(".csv", "");
          csvFiles.push({
            key: object.Key,
            category: fileName.replace(/_/g, " "), // Convert underscores to spaces
          });
        }
      });
    } while (continuationToken);

    console.log(`Found ${csvFiles.length} unprocessed CSV files for client: ${clientName}`);

    // Read and parse each CSV file
    for (const file of csvFiles) {
      try {
        console.log(`Fetching unprocessed CSV: s3://${unprocessedBucket}/${file.key}`);

        const getCommand = new GetObjectCommand({
          Bucket: unprocessedBucket,
          Key: file.key,
        });

        const response = await s3Client.send(getCommand);
        const csvContent = await streamToString(response.Body);

        if (!csvContent || csvContent.trim().length === 0) {
          console.log(`Empty CSV file: ${file.key}`);
          continue;
        }

        // Parse CSV
        const csvRows = parseCSV(csvContent);

        // Convert CSV rows to product format
        csvRows.forEach((row, index) => {
          try {
            // Extract product ID - try common field names
            const productId = row.product_id || row.id || row.productId || row.Product_ID || `unprocessed_${file.category}_${index}`;
            
            // Extract category from row or use the category from file name
            const productCategory = row.category || row.Category || row.product_category || file.category;

            if (productId) {
              unprocessedProducts.push({
                id: productId,
                product: productId,
                category: productCategory,
                processing: "UNPROCESSED",
                ecommerce: "DEACTIVE", // Default status
                // Include CSV row data as attributes
                attributes: row,
                source_urls: row.source_urls ? (Array.isArray(row.source_urls) ? row.source_urls : [row.source_urls]) : [],
                fullProduct: row, // Store full CSV row as product object
              });
            }
          } catch (rowError) {
            console.error(`Error processing CSV row ${index} in ${file.key}:`, rowError);
          }
        });

        console.log(`Fetched ${csvRows.length} unprocessed products from ${file.key}`);
      } catch (fileError) {
        console.error(`Error reading unprocessed CSV file ${file.key}:`, fileError);
        errors.push({
          file: file.key,
          error: fileError.message,
        });
      }
    }
  } catch (error) {
    console.error(`Error listing unprocessed CSV files for client ${clientName}:`, error);
    errors.push({
      file: prefix,
      error: error.message,
    });
  }

  return { unprocessedProducts, errors };
};

/**
 * Get all products from S3 bucket researcher2 (processed) and testdevopsetl (unprocessed)
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
    
    // List all JSONL files in the processed bucket
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

    console.log("jsonlFiles", jsonlFiles);

    // Read and parse all JSONL files (processed products)
    const processedProducts = [];
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
              processedProducts.push({
                id: product.product_id,
                product: product.product_id,
                category: product.category,
                processing: "PROCESSED",
                ecommerce: "DEACTIVE", // Default status
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

    // Fetch unprocessed products independently (not based on processed categories)
    // Lists all CSV files in unprocesseddata/${clientName}/ directory
    const { unprocessedProducts, errors: unprocessedErrors } = await fetchUnprocessedProducts(clientName);
    
    // Combine errors
    if (unprocessedErrors.length > 0) {
      errors.push(...unprocessedErrors.map(e => ({ file: `unprocessed/${e.category}`, error: e.error })));
    }

    // Combine processed and unprocessed products
    const allProducts = [...processedProducts, ...unprocessedProducts];

    console.log(`Total products: ${allProducts.length} (${processedProducts.length} processed, ${unprocessedProducts.length} unprocessed)`);

    return res.status(200).json({
      status: true,
      message: "Products fetched successfully",
      data: allProducts,
      errors: errors.length > 0 ? errors : undefined,
      totalProducts: allProducts.length,
      processedCount: processedProducts.length,
      unprocessedCount: unprocessedProducts.length,
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

