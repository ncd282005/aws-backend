const express = require("express");
const router = express.Router();
const adminController = require("../../controllers/admin/adminlogin.controller");
const adminDashboardController = require("../../controllers/admin/admindashboard.controller");
const adminLogoutController = require("../../controllers/admin/adminlogout.controller");
const { uploadCsv, uploadJsonConfig } = require("../../controllers/admin/uploadCsv.controller");

const { authenticateToken } = require("../../middleware/authenticate");
const uploadCsvMulter = require("../../utils/multerCsvConfig");

// Public routes
router.post("/login", adminController.loginAdmin);

// Admin dashboard route
router.get("/admin-dashboard", authenticateToken("admin"), adminDashboardController.getAdminDashboard);

router.post("/admin-logout", authenticateToken("admin"), adminLogoutController.logoutAdmin);

// CSV Upload route (no authentication required)
router.post(
  "/upload-csv",
  uploadCsvMulter.single("csvFile"),
  uploadCsv
);

// JSON Config Upload route (no authentication required)
router.post(
  "/upload-json-config",
  uploadJsonConfig
);

module.exports = router;
