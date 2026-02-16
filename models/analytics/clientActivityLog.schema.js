const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create a separate connection for analytics database
const analyticsDB = mongoose.connection.useDb("analytics");

const activityLogSchema = new Schema(
    {
        fingerprint: {
            type: String,
            required: true,
        },
        ip: {
            type: String,
            required: true,
        },
        time: {
            type: Date,
            required: true,
        },
        page: {
            type: String,
            required: true,
        },
        activity: {
            type: String,
            required: true,
        },
        details: {
            type: Schema.Types.Mixed,
        },
    },
    { 
        timestamps: false,
        strict: false, // Allow additional fields not defined in schema
    }
);

// Index on time field for efficient date range queries
activityLogSchema.index({ time: 1 });
activityLogSchema.index({ fingerprint: 1 });

/**
 * Get model for a specific client's activity log collection
 * @param {string} clientName - The client name for the collection
 * @returns {Model} Mongoose model for the client's activity log collection
 */
const getClientActivityLogModel = (clientName) => {
    const collectionName = `${clientName}_activity_logs_v2`;
    
    // Check if model already exists to avoid OverwriteModelError
    if (analyticsDB.models[collectionName]) {
        return analyticsDB.models[collectionName];
    }
    
    return analyticsDB.model(collectionName, activityLogSchema, collectionName);
};

module.exports = { getClientActivityLogModel };


