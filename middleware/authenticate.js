const jwt = require("jsonwebtoken");
const { JWT_SECRET, ADMIN_JWT_SECRET } = require("../config/jwt");
const User = require("../models/user.schema");
const Admin = require("../models/admin/admin.schema");
const AnalyticsAdmin = require("../models/admin/analyticsAdmin.schema");
const UserToken = require("../models/token.schema");
const AdminToken = require("../models/admin/admintoken.schema");
const AnalyticsAdminToken = require("../models/admin/analyticsAdminToken.schema");

const authenticateToken = (type = "user") => {
  const secrets = {
    user: JWT_SECRET,
    admin: ADMIN_JWT_SECRET,
  };

  const models = {
    user: User,
    admin: Admin,
  };

  return async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    const unauthorizedResponse = (res, message) => {
      res.status(401).json({
        status: false,
        message: message || "Unauthorized",
        data: null,
      });
    };

    if (!token) {
      return unauthorizedResponse(res, "No token provided");
    }

    const secretKey = secrets[type];
    const Model = models[type];

    jwt.verify(token, secretKey, async (err, decoded) => {
      if (err) {
        console.error(`Error verifying ${type} token:`, err);
        return res.status(403).json({
          status: false,
          message: "Invalid token",
          data: null,
        });
      }

      try {
        const entity = await Model.findById(decoded.id);
        if (!entity) {
          return unauthorizedResponse(res, `${type.charAt(0).toUpperCase() + type.slice(1)} not found`);
        }

        if (type === "user") {
          const userToken = await UserToken.findOne({ user_id: entity._id })
          if (userToken.token != token) {
            return res.status(403).json({
              status: false,
              message: "Invalid token",
            });
          }

        } else {
          // Check if this specific token exists for the admin
          // This allows multiple tokens (multiple browser sessions) per admin
          const adminToken = await AdminToken.findOne({ 
            adminId: entity._id,
            token: token 
          });

          if (!adminToken) {
            return res.status(403).json({
              status: false,
              message: "Invalid token",
            });
          }
        }

        req[type] = entity; // Attach user/admin object to the request
        next();
      } catch (error) {
        console.error(`Error in ${type} authentication:`, error);
        res.status(500).json({
          status: false,
          message: "Internal server error",
          data: null,
        });
      }
    });
  };
};

/**
 * Middleware to authenticate analytics admin tokens
 * Specifically for analytics_admins collection with 24-hour token expiration
 */
const authenticateAnalyticsAdmin = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  const unauthorizedResponse = (res, message) => {
    res.status(401).json({
      status: false,
      message: message || "Unauthorized",
      data: null,
    });
  };

  if (!token) {
    return unauthorizedResponse(res, "No token provided");
  }

  jwt.verify(token, ADMIN_JWT_SECRET, async (err, decoded) => {
    if (err) {
      console.error("Error verifying analytics admin token:", err);
      return res.status(403).json({
        status: false,
        message: "Invalid or expired token",
        data: null,
      });
    }

    try {
      // Verify token type from JWT payload
      if (decoded.type !== "analytics_admin") {
        return res.status(403).json({
          status: false,
          message: "Invalid token type. Analytics admin token required.",
          data: null,
        });
      }

      // Check if analytics admin exists
      const analyticsAdmin = await AnalyticsAdmin.findById(decoded.id);
      if (!analyticsAdmin) {
        return unauthorizedResponse(res, "Analytics admin not found");
      }

      // Check if admin account is active
      if (!analyticsAdmin.is_active) {
        return res.status(403).json({
          status: false,
          message: "Account is inactive. Please contact support.",
          data: null,
        });
      }

      // Verify token exists in database (and hasn't expired - TTL handles this)
      const analyticsAdminToken = await AnalyticsAdminToken.findOne({
        adminId: analyticsAdmin._id
      });

      if (!analyticsAdminToken || analyticsAdminToken.token !== token) {
        return res.status(403).json({
          status: false,
          message: "Invalid or expired token. Please login again.",
          data: null,
        });
      }

      // Attach analytics admin object to the request
      req.analyticsAdmin = analyticsAdmin;
      next();
    } catch (error) {
      console.error("Error in analytics admin authentication:", error);
      res.status(500).json({
        status: false,
        message: "Internal server error",
        data: null,
      });
    }
  });
};

module.exports = { authenticateToken, authenticateAnalyticsAdmin };
