const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create a separate connection for analytics database
const analyticsDB = mongoose.connection.useDb("analytics");

const clientUserSessionSchema = new Schema(
    {
        fingerprint: {
            type: String,
            required: true,
        },
        sessionStart: {
            type: Date,
            required: true,
        },
        sessionEnd: {
            type: Date,
        },
    },
    { 
        timestamps: false,
        strict: false, // Allow additional fields not defined in schema
    }
);

// Index on sessionStart field for efficient date range queries
clientUserSessionSchema.index({ sessionStart: 1 });
clientUserSessionSchema.index({ sessionEnd: 1 });
clientUserSessionSchema.index({ fingerprint: 1 });

/**
 * Get model for a specific client's user session collection
 * @param {string} clientName - The client name for the collection
 * @returns {Model} Mongoose model for the client's user session collection
 */
const getClientUserSessionModel = (clientName) => {
    const collectionName = `${clientName}_user_sessions_v2`;
    
    // Check if model already exists to avoid OverwriteModelError
    if (analyticsDB.models[collectionName]) {
        return analyticsDB.models[collectionName];
    }
    
    return analyticsDB.model(collectionName, clientUserSessionSchema, collectionName);
};

module.exports = { getClientUserSessionModel };

