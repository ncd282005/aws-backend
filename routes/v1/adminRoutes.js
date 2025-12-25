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
  getAllClients,
  createClient,
} = require("../../controllers/admin/client.controller");
const {
  runNudgeQuality,
  getQuestionnaire,
} = require("../../controllers/admin/nudgeQuality.controller");
const {
  getSyncState,
  saveSyncState,
  completeSync,
  resetSyncState,
} = require("../../controllers/admin/syncState.controller");

const { authenticateToken } = require("../../middleware/authenticate");
const uploadCsvMulter = require("../../utils/multerCsvConfig");

// Public routes
router.post("/login", adminController.loginAdmin);
router.post("/register", adminRegisterController.registerAnalyticsAdmin);
router.post("/analytics-login", analyticsAdminLoginController.loginAnalyticsAdmin);

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

router.get("/sync-errors", getSyncErrors);
router.get("/pipeline-status", getPipelineStatus);
router.get("/processed-products", getProcessedCategorySummary);
router.post("/processed-products/details", getProcessedCategoryDetails);
router.post("/run-scripts", runScripts);
router.get("/gardenia-products", getGardeniaProducts);
router.post("/toggle-product-status", toggleProductStatus);
router.post("/nudge-quality", runNudgeQuality);
router.get("/nudge-quality/questionnaire", getQuestionnaire);

// Sync state management routes
router.get("/sync-state", getSyncState);
router.post("/sync-state", saveSyncState);
router.post("/sync-state/complete", completeSync);
router.post("/sync-state/reset", resetSyncState);

// Client management routes (no authentication required for now)
router.get("/clients", getAllClients);
router.post("/clients", createClient);

module.exports = router;
