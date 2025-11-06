const express = require("express");
const router = express.Router();
const adminController = require("../../controllers/admin/adminlogin.controller");
const adminRegisterController = require("../../controllers/admin/adminregister.controller");
const analyticsAdminLoginController = require("../../controllers/admin/analyticsAdminLogin.controller");
const adminDashboardController = require("../../controllers/admin/admindashboard.controller");
const adminLogoutController = require("../../controllers/admin/adminlogout.controller");

const { authenticateToken } = require("../../middleware/authenticate");

// Public routes
router.post("/login", adminController.loginAdmin);
router.post("/register", adminRegisterController.registerAnalyticsAdmin);
router.post("/analytics-login", analyticsAdminLoginController.loginAnalyticsAdmin);

// Admin dashboard route
router.get("/admin-dashboard", authenticateToken("admin"), adminDashboardController.getAdminDashboard);

router.post("/admin-logout", authenticateToken("admin"), adminLogoutController.logoutAdmin);


module.exports = router;
