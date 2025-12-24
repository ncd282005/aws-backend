const Client = require("../models/client.schema");
const connectDB = require("../config/db");
require("dotenv").config();

/**
 * Seed the database with the default client
 * This script can be run to add the existing client to the database
 */
const seedClients = async () => {
  try {
    await connectDB();
    
    const defaultClientName = "sunglasses_catalog_v11";
    const defaultDisplayName = "Sunglasses Catalog v11";
    
    // Check if client already exists
    const existingClient = await Client.findOne({ name: defaultClientName });
    
    if (existingClient) {
      console.log(`Client "${defaultClientName}" already exists.`);
      process.exit(0);
    }
    
    // Create the default client
    const newClient = new Client({
      name: defaultClientName,
      displayName: defaultDisplayName,
      isActive: true,
    });
    
    await newClient.save();
    console.log(`Successfully created client: ${defaultDisplayName} (${defaultClientName})`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error seeding clients:", error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedClients();
}

module.exports = seedClients;

