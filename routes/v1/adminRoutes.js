const express = require("express");
const router = express.Router();
const adminController = require("../../controllers/admin/adminlogin.controller");
const adminRegisterController = require("../../controllers/admin/adminregister.controller");
const analyticsAdminLoginController = require("../../controllers/admin/analyticsAdminLogin.controller");
const adminDashboardController = require("../../controllers/admin/admindashboard.controller");
const adminLogoutController = require("../../controllers/admin/adminlogout.controller");
const {
  uploadCsv,
  uploadJsonConfig,
} = require("../../controllers/admin/uploadCsv.controller");
const {
  getSyncErrors,
} = require("../../controllers/admin/syncStatus.controller");
const {
  getPipelineStatus,
} = require("../../controllers/admin/pipelineStatus.controller");
const {
  getProcessedCategorySummary,
  getProcessedCategoryDetails,
} = require("../../controllers/admin/processedProducts.controller");
const {
  runScripts,
} = require("../../controllers/admin/runScripts.controller");
const {
  getGardeniaProducts,
} = require("../../controllers/admin/gardeniaProducts.controller");
const {
  toggleProductStatus,
} = require("../../controllers/admin/toggleProductStatus.controller");
const {
  getActiveProducts,
} = require("../../controllers/admin/activeProducts.controller");
const {
  getAllClients,
  createClient,
} = require("../../controllers/admin/client.controller");
const {
  runNudgeQuality,
  getQuestionnaire,
  updateQuestionnaire,
} = require("../../controllers/admin/nudgeQuality.controller");
const {
  getSyncState,
  saveSyncState,
  completeSync,
  resetSyncState,
} = require("../../controllers/admin/syncState.controller");
const {
  getThemeConfig,
  saveThemeConfig,
  resetThemeConfig,
} = require("../../controllers/admin/themeConfig.controller");

const { authenticateToken } = require("../../middleware/authenticate");
const uploadCsvMulter = require("../../utils/multerCsvConfig");
const uploadClientMulter = require("../../utils/multerClientConfig");

// Public routes
router.post("/login", adminController.loginAdmin);
router.post("/register", adminRegisterController.registerAnalyticsAdmin);
router.post("/analytics-login", analyticsAdminLoginController.loginAnalyticsAdmin);

// Admin dashboard route
router.get("/admin-dashboard", authenticateToken("admin"), adminDashboardController.getAdminDashboard);

router.post("/admin-logout", authenticateToken("admin"), adminLogoutController.logoutAdmin);

// CSV Upload route (requires authentication)
router.post(
  "/upload-csv",
  authenticateToken("admin"),
  uploadCsvMulter.single("csvFile"),
  uploadCsv
);

// JSON Config Upload route (requires authentication)
router.post(
  "/upload-json-config",
  authenticateToken("admin"),
  uploadJsonConfig
);

// Protected routes - require authentication
router.get("/sync-errors", authenticateToken("admin"), getSyncErrors);
router.get("/pipeline-status", authenticateToken("admin"), getPipelineStatus);
router.get("/processed-products", authenticateToken("admin"), getProcessedCategorySummary);
router.post("/processed-products/details", authenticateToken("admin"), getProcessedCategoryDetails);
router.post("/run-scripts", authenticateToken("admin"), runScripts);
router.get("/gardenia-products", authenticateToken("admin"), getGardeniaProducts);
router.get("/active-products", authenticateToken("admin"), getActiveProducts);
router.post("/toggle-product-status", authenticateToken("admin"), toggleProductStatus);
router.post("/nudge-quality", authenticateToken("admin"), runNudgeQuality);
router.get("/nudge-quality/questionnaire", authenticateToken("admin"), getQuestionnaire);
router.put("/nudge-quality/questionnaire", authenticateToken("admin"), updateQuestionnaire);

// Sync state management routes (requires authentication)
router.get("/sync-state", authenticateToken("admin"), getSyncState);
router.post("/sync-state", authenticateToken("admin"), saveSyncState);
router.post("/sync-state/complete", authenticateToken("admin"), completeSync);
router.post("/sync-state/reset", authenticateToken("admin"), resetSyncState);

// Client management routes (requires authentication)
router.get("/clients", authenticateToken("admin"), getAllClients);
router.post(
  "/clients",
  authenticateToken("admin"),
  uploadClientMulter.single("logo"),
  createClient
);

// Theme configuration routes
// Public route for client-side script to fetch theme config by domain
router.get("/public/theme-config", getThemeConfig);
// Admin routes (require authentication)
router.get("/theme-config", authenticateToken("admin"), getThemeConfig);
router.post("/theme-config", authenticateToken("admin"), saveThemeConfig);
router.post("/theme-config/reset", authenticateToken("admin"), resetThemeConfig);

module.exports = router;
