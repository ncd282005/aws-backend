/* global process */
const Papa = require("papaparse");
const {
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const {
  s3Client,
  PROCESSED_PRODUCTS_BUCKET_NAME,
  PROCESSED_PRODUCTS_BASE_PREFIX,
} = require("../../config/s3Config");

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

const sanitizePathSegment = (segment = "") =>
  segment.replace(/^\/*/, "").replace(/\/*$/, "");

const listCategoryProductKeys = async (clientName) => {
  const results = [];
  let continuationToken = undefined;

  const normalizedClient = sanitizePathSegment(clientName || "test_sunglasses");
  const basePrefix = sanitizePathSegment(PROCESSED_PRODUCTS_BASE_PREFIX);
  const prefix = `${basePrefix}/${normalizedClient}/hierarchy/`;

  do {
    const command = new ListObjectsV2Command({
      Bucket: PROCESSED_PRODUCTS_BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);
    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;

    (response.Contents || []).forEach((object) => {
      if (!object?.Key) return;
      const segments = object.Key.split("/");
      if (segments.length < 4) {
        return;
      }

      const fileName = segments[segments.length - 1];
      const category = segments[segments.length - 2];
      const hierarchySegment =
        segments[segments.length - 3] &&
        segments[segments.length - 3].toLowerCase();
      const clientSegment =
        segments[segments.length - 4] &&
        segments[segments.length - 4].toLowerCase();

      if (
        fileName.toLowerCase() === "products.csv" &&
        hierarchySegment === "hierarchy" &&
        clientSegment === normalizedClient.toLowerCase()
      ) {
        results.push({
          category,
          key: object.Key,
        });
      }
    });
  } while (continuationToken);

  return results;
};

const countProductsInCsv = async (key) => {
  const command = new GetObjectCommand({
    Bucket: PROCESSED_PRODUCTS_BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  const payload = await streamToString(response.Body);

  if (!payload) {
    return 0;
  }

  const lines = payload
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return 0;
  }

  return lines.length - 1; // subtract header row
};

const parseCategoryProducts = (csvString) => {
  const result = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  return Array.isArray(result.data) ? result.data : [];
};

exports.getProcessedCategorySummary = async (req, res) => {
  try {
    const clientName = req.query.clientName || "test_sunglasses";
    const categoryObjects = await listCategoryProductKeys(clientName);

    if (categoryObjects.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No processed categories found in S3",
        data: [],
      });
    }

    const categoryStats = await Promise.all(
      categoryObjects.map(async (categoryObj) => {
        const totalProducts = await countProductsInCsv(categoryObj.key);
        return {
          category: categoryObj.category,
          totalProducts,
        };
      })
    );

    return res.status(200).json({
      status: true,
      message: "Processed category summary fetched successfully",
      data: categoryStats,
    });
  } catch (error) {
    console.error("Failed to fetch processed category summary:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch processed category summary",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

exports.getProcessedCategoryDetails = async (req, res) => {
  try {
    const clientName = req.body?.clientName || "test_sunglasses";
    const categories = Array.isArray(req.body?.categories)
      ? req.body.categories
      : [];

    if (categories.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Please provide at least one category to fetch details",
        data: null,
      });
    }

    const normalizedClient = sanitizePathSegment(clientName);
    const basePrefix = sanitizePathSegment(PROCESSED_PRODUCTS_BASE_PREFIX);
    const results = [];
    const missingCategories = [];

    for (const category of categories) {
      const normalizedCategory = sanitizePathSegment(category);
      const key = `${basePrefix}/${normalizedClient}/hierarchy/${normalizedCategory}/products.csv`;

      try {
        const command = new GetObjectCommand({
          Bucket: PROCESSED_PRODUCTS_BUCKET_NAME,
          Key: key,
        });
        const response = await s3Client.send(command);
        const csvString = await streamToString(response.Body);
        const rows = parseCategoryProducts(csvString);

        rows.forEach((row) => {
          if (!row?.title && !row?.product_category) {
            return;
          }
          results.push({
            productName: row.title || row.product_name || "Untitled Product",
            category: row.product_category || normalizedCategory,
            url: row.handle || row.url || "",
          });
        });
      } catch (error) {
        console.error(
          `Failed to fetch category ${category} products from S3:`,
          error
        );
        missingCategories.push(category);
      }
    }

    return res.status(200).json({
      status: true,
      message: "Processed category details fetched successfully",
      data: results,
      missingCategories,
    });
  } catch (error) {
    console.error("Failed to fetch processed category details:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch processed category details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

