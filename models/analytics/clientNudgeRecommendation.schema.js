const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create a separate connection for analytics database
const analyticsDB = mongoose.connection.useDb("analytics");

const clientNudgeRecommendationSchema = new Schema(
    {
        fingerprint: {
            type: String,
            required: true,
        },
        productId: {
            type: String,
        },
        recommendations: [{
            rank: Number,
            perfume_name: String,
            handle: String,
            similarity_score: Number,
            reasoning: String,
        }],
        qa_pairs: [{
            question: String,
            answer: String,
        }],
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
clientNudgeRecommendationSchema.index({ createdAt: 1 });
clientNudgeRecommendationSchema.index({ fingerprint: 1 });

/**
 * Get model for a specific client's nudge recommendation collection
 * @param {string} clientName - The client name for the collection
 * @returns {Model} Mongoose model for the client's nudge recommendation collection
 */
const getClientNudgeRecommendationModel = (clientName) => {
    const collectionName = `${clientName}_nudge_recommendations`;
    
    // Check if model already exists to avoid OverwriteModelError
    if (analyticsDB.models[collectionName]) {
        return analyticsDB.models[collectionName];
    }
    
    return analyticsDB.model(collectionName, clientNudgeRecommendationSchema, collectionName);
};

module.exports = { getClientNudgeRecommendationModel };

