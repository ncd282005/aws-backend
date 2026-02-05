const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

// Function to generate user access token
const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
    expiresIn: "365d",
  });
};

// Function to generate admin access token
const generateAdminAccessToken = (admin) => {
  return jwt.sign({ id: admin._id, email: admin.email }, ADMIN_JWT_SECRET, {
    expiresIn: "365d",
  });
};

// Function to generate analytics admin access token with 24-hour expiration
const generateAnalyticsAdminAccessToken = (admin) => {
  return jwt.sign({ id: admin._id, email: admin.email, type: "analytics_admin" }, ADMIN_JWT_SECRET, {
    expiresIn: "24h",
  });
};

module.exports = { generateAccessToken, generateAdminAccessToken, generateAnalyticsAdminAccessToken, JWT_SECRET, ADMIN_JWT_SECRET };
