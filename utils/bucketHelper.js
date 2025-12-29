const Client = require("../models/client.schema");

/**
 * Extract middle domain name from full domain (e.g., www.google.com -> google)
 */
const extractDomainName = (domain) => {
  if (!domain) return null;
  
  // Remove protocol if present
  let cleanDomain = domain.replace(/^https?:\/\//, "");
  
  // Remove trailing slash
  cleanDomain = cleanDomain.replace(/\/$/, "");
  
  // Extract just the domain (remove path if any)
  const domainOnly = cleanDomain.split("/")[0];
  
  // Split domain into parts
  const domainParts = domainOnly.split(".");
  
  // Extract the middle/second-level domain
  // For www.google.com -> ['www', 'google', 'com'] -> 'google'
  // For google.com -> ['google', 'com'] -> 'google'
  // For subdomain.example.com -> ['subdomain', 'example', 'com'] -> 'example'
  if (domainParts.length >= 2) {
    // If 2 parts, return the first (e.g., google.com -> google)
    // If 3+ parts, return the second (e.g., www.google.com -> google)
    const middleDomain = domainParts.length === 2 
      ? domainParts[0] 
      : domainParts[1];
    return middleDomain.toLowerCase();
  }
  
  return null;
};

/**
 * Get bucket name for a client
 * First tries to get from client's s3BucketName field
 * If not available, extracts from client's domain
 * @param {string} clientName - The client's name (normalized name field)
 * @returns {Promise<string|null>} - The bucket name or null if client not found
 */
const getBucketNameFromClient = async (clientName) => {
  if (!clientName || !clientName.trim()) {
    return null;
  }

  try {
    const client = await Client.findOne({ 
      name: clientName.trim().toLowerCase(),
      isActive: true 
    }).select("s3BucketName domain");

    if (!client) {
      console.warn(`Client not found: ${clientName}`);
      return null;
    }

    // If bucket name is already stored, use it
    if (client.s3BucketName) {
      return client.s3BucketName;
    }

    // Otherwise, extract from domain
    if (client.domain) {
      const bucketName = extractDomainName(client.domain);
      // Optionally update the client record with the bucket name
      if (bucketName) {
        await Client.updateOne(
          { _id: client._id },
          { $set: { s3BucketName: bucketName } }
        );
      }
      return bucketName;
    }

    return null;
  } catch (error) {
    console.error(`Error getting bucket name for client ${clientName}:`, error);
    return null;
  }
};

module.exports = {
  extractDomainName,
  getBucketNameFromClient,
};

