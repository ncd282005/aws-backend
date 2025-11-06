const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create a separate connection for analytics database
const analyticsDB = mongoose.connection.useDb("analytics");

const clientFingerprintSchema = new Schema(
    {
        fingerprint: {
            type: String,
            required: true,
        },
        userAgent: {
            browser: {
                name: String,
                version: String,
                major: String,
                type: String,
            },
            os: {
                name: String,
                version: String,
            },
            device: {
                type: String,
                model: String,
                vendor: String,
            },
            ua: String,
        },
        createdAt: {
            type: Date,
            required: true,
        },
    },
    { 
        timestamps: false,
        strict: false, // Allow additional fields not defined in schema
    }
);

// Index on createdAt field for efficient date range queries
clientFingerprintSchema.index({ createdAt: 1 });
clientFingerprintSchema.index({ fingerprint: 1 });

/**
 * Get model for a specific client's fingerprint collection
 * @param {string} clientName - The client name for the collection
 * @returns {Model} Mongoose model for the client's fingerprint collection
 */
const getClientFingerprintModel = (clientName) => {
    const collectionName = `${clientName}_fingerprint`;
    
    // Check if model already exists to avoid OverwriteModelError
    if (analyticsDB.models[collectionName]) {
        return analyticsDB.models[collectionName];
    }
    
    return analyticsDB.model(collectionName, clientFingerprintSchema, collectionName);
};

module.exports = { getClientFingerprintModel };

