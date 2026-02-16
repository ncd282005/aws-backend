const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("../models/admin/admin.schema");
require("dotenv").config();

/**
 * Seed super admin user
 * Run this script once to create the initial super admin
 * @param {boolean} shouldDisconnect - Whether to disconnect from MongoDB after seeding (default: true)
 */
const seedSuperAdmin = async (shouldDisconnect = true) => {
  try {
    // Check if already connected to MongoDB
    const isConnected = mongoose.connection.readyState === 1;
    
    if (!isConnected) {
      // Connect to MongoDB if not already connected
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        console.error("MONGODB_URI not found in environment variables");
        if (shouldDisconnect) process.exit(1);
        return;
      }

      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log("Connected to MongoDB");
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: "admin@mprompto.in" });
    if (existingAdmin) {
      console.log("Super admin already exists. Skipping seed.");
      if (shouldDisconnect && !isConnected) {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
      }
      return;
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash("Admin@123", saltRounds);

    // Create super admin
    const superAdmin = new Admin({
      name: "Super Admin",
      email: "admin@mprompto.in",
      password: hashedPassword,
      is_active: true,
    });

    await superAdmin.save();
    console.log("Super admin created successfully!");
    console.log("Email: admin@mprompto.in");
    console.log("Password: Admin@123");

    if (shouldDisconnect && !isConnected) {
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
    }
  } catch (error) {
    console.error("Error seeding super admin:", error);
    if (shouldDisconnect && mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    if (shouldDisconnect) process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedSuperAdmin();
}

module.exports = seedSuperAdmin;

