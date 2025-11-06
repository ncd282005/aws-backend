const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create a separate connection for analytics database
const analyticsDB = mongoose.connection.useDb("analytics");

const clientNudgeResponseSchema = new Schema(
    {
        fingerprint: {
            type: String,
            required: true,
        },
        productId: {
            type: String,
        },
        question: {
            type: String,
        },
        answer: {
            type: String,
        },
        timeSpent: {
            type: Number,
        },
        action: {
            type: String,
        },
        page: {
            type: String,
        },
        type: {
            type: String,
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
clientNudgeResponseSchema.index({ createdAt: 1 });
clientNudgeResponseSchema.index({ fingerprint: 1 });

/**
 * Get model for a specific client's nudge response collection
 * @param {string} clientName - The client name for the collection
 * @returns {Model} Mongoose model for the client's nudge response collection
 */
const getClientNudgeResponseModel = (clientName) => {
    const collectionName = `${clientName}_nudge_responses_v2`;
    
    // Check if model already exists to avoid OverwriteModelError
    if (analyticsDB.models[collectionName]) {
        return analyticsDB.models[collectionName];
    }
    
    return analyticsDB.model(collectionName, clientNudgeResponseSchema, collectionName);
};

module.exports = { getClientNudgeResponseModel };

