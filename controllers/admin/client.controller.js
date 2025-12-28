const Client = require("../../models/client.schema");
const {
  CreateBucketCommand,
  PutObjectCommand,
  HeadBucketCommand,
} = require("@aws-sdk/client-s3");
const { s3Client, S3_BUCKET_REGION } = require("../../config/s3Config");

/**
 * Extract domain name from full domain (e.g., www.google.com -> google.com)
 */
const extractDomainName = (domain) => {
  if (!domain) return null;
  
  // Remove protocol if present
  let cleanDomain = domain.replace(/^https?:\/\//, "");
  
  // Remove www. prefix if present
  cleanDomain = cleanDomain.replace(/^www\./, "");
  
  // Remove trailing slash
  cleanDomain = cleanDomain.replace(/\/$/, "");
  
  // Extract just the domain (remove path if any)
  const domainParts = cleanDomain.split("/")[0];
  
  // S3 bucket names must be lowercase and can't contain dots in some regions
  // For bucket naming, we'll use the domain as-is but ensure it's valid
  return domainParts.toLowerCase();
};

/**
 * Get all clients
 */
const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find({ isActive: true })
      .sort({ displayName: 1 })
      .select(
        "name displayName domain companyName contactName email mobile logoUrl s3BucketName createdAt"
      );

    return res.status(200).json({
      status: true,
      message: "Clients fetched successfully",
      data: clients,
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch clients",
      error: error.message,
    });
  }
};

/**
 * Check if S3 bucket exists
 */
const bucketExists = async (bucketName) => {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch (error) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
};

/**
 * Create S3 bucket if it doesn't exist
 */
const createS3Bucket = async (bucketName) => {
  try {
    const exists = await bucketExists(bucketName);
    if (exists) {
      console.log(`Bucket ${bucketName} already exists`);
      return true;
    }

    // Validate bucket name
    if (bucketName.length < 3 || bucketName.length > 63) {
      throw new Error("Bucket name must be between 3 and 63 characters");
    }

    // Sanitize bucket name (remove invalid characters, ensure it's lowercase)
    const sanitizedBucketName = bucketName
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "")
      .replace(/^[.-]+|[.-]+$/g, ""); // Remove leading/trailing dots and hyphens

    if (sanitizedBucketName !== bucketName) {
      console.warn(
        `Bucket name sanitized from ${bucketName} to ${sanitizedBucketName}`
      );
    }

    const createBucketParams = {
      Bucket: sanitizedBucketName,
    };

    // Only add LocationConstraint if region is not us-east-1
    // us-east-1 is the default region and doesn't support LocationConstraint
    if (S3_BUCKET_REGION && S3_BUCKET_REGION !== "us-east-1") {
      createBucketParams.CreateBucketConfiguration = {
        LocationConstraint: S3_BUCKET_REGION,
      };
    }

    await s3Client.send(new CreateBucketCommand(createBucketParams));
    console.log(`Bucket ${sanitizedBucketName} created successfully`);
    return sanitizedBucketName;
  } catch (error) {
    console.error(`Error creating bucket ${bucketName}:`, error);
    throw error;
  }
};

/**
 * Upload logo to S3
 */
const uploadLogoToS3 = async (bucketName, logoFile, domain) => {
  try {
    if (!logoFile || !logoFile.buffer) {
      return null;
    }

    // Get file extension
    const fileExtension = logoFile.originalname.split(".").pop() || "png";
    const fileName = `logo.${fileExtension}`;
    const s3Key = `assets/${fileName}`;

    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: logoFile.buffer,
      ContentType: logoFile.mimetype,
      Metadata: {
        originalName: logoFile.originalname,
        uploadedAt: new Date().toISOString(),
      },
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Construct S3 URL
    const logoUrl = `https://${bucketName}.s3.${S3_BUCKET_REGION}.amazonaws.com/${s3Key}`;
    return logoUrl;
  } catch (error) {
    console.error("Error uploading logo to S3:", error);
    throw error;
  }
};

/**
 * Create a new client
 */
const createClient = async (req, res) => {
  try {
    const { domain, companyName, name, email, mobile } = req.body;
    const logoFile = req.file;

    // Validate required fields
    if (!domain || !domain.trim()) {
      return res.status(400).json({
        status: false,
        message: "Domain is required",
      });
    }
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({
        status: false,
        message: "Company name is required",
      });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({
        status: false,
        message: "Contact name is required",
      });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({
        status: false,
        message: "Email is required",
      });
    }
    if (!mobile || !mobile.trim()) {
      return res.status(400).json({
        status: false,
        message: "Mobile number is required",
      });
    }

    // Extract domain name for bucket
    const bucketDomain = extractDomainName(domain);
    if (!bucketDomain) {
      return res.status(400).json({
        status: false,
        message: "Invalid domain format",
      });
    }

    // Normalize the name (lowercase, replace spaces with underscores)
    const normalizedName = companyName.trim().toLowerCase().replace(/\s+/g, "_");

    // Check if client already exists (by domain or name)
    const existingClient = await Client.findOne({
      $or: [{ domain: domain.trim() }, { name: normalizedName }],
    });
    if (existingClient) {
      return res.status(409).json({
        status: false,
        message: "Client with this domain or name already exists",
      });
    }

    // Create S3 bucket
    let logoUrl = null;
    let finalBucketName = bucketDomain;
    try {
      finalBucketName = await createS3Bucket(bucketDomain);

      // Upload logo if provided
      if (logoFile) {
        logoUrl = await uploadLogoToS3(finalBucketName, logoFile, domain.trim());
      }
    } catch (s3Error) {
      console.error("S3 operation failed:", s3Error);
      return res.status(500).json({
        status: false,
        message: "Failed to create S3 bucket or upload logo",
        error: process.env.NODE_ENV === "development" ? s3Error.message : undefined,
      });
    }

    // Create new client
    const newClient = new Client({
      name: normalizedName,
      displayName: companyName.trim(),
      domain: domain.trim(),
      companyName: companyName.trim(),
      contactName: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      logoUrl: logoUrl,
      s3BucketName: finalBucketName,
      isActive: true,
    });

    await newClient.save();

    return res.status(201).json({
      status: true,
      message: "Client created successfully",
      data: {
        _id: newClient._id,
        name: newClient.name,
        displayName: newClient.displayName,
        domain: newClient.domain,
        companyName: newClient.companyName,
        contactName: newClient.contactName,
        email: newClient.email,
        mobile: newClient.mobile,
        logoUrl: newClient.logoUrl,
        s3BucketName: newClient.s3BucketName,
        createdAt: newClient.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating client:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        status: false,
        message: `Client with this ${field} already exists`,
      });
    }

    return res.status(500).json({
      status: false,
      message: "Failed to create client",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getAllClients,
  createClient,
};

