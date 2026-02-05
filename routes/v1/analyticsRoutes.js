const express = require("express");
const router = express.Router();
const gardeniaActivityLogsController = require("../../controllers/analytics/gardeniaActivityLogs.controller");
const clientFingerprintController = require("../../controllers/analytics/clientFingerprint.controller");
const clientNudgeResponseController = require("../../controllers/analytics/clientNudgeResponse.controller");
const clientNudgeRecommendationController = require("../../controllers/analytics/clientNudgeRecommendation.controller");
const clientUserSessionController = require("../../controllers/analytics/clientUserSession.controller");

const { authenticateAnalyticsAdmin } = require("../../middleware/authenticate");

// Protected routes - require analytics admin authentication
router.get(
    "/activity-stats/:clientName", 
    authenticateAnalyticsAdmin, 
    gardeniaActivityLogsController.getActivityStats
);

router.get(
    "/client-fingerprints/:clientName", 
    authenticateAnalyticsAdmin, 
    clientFingerprintController.getClientFingerprints
);

router.get(
    "/client-nudge-responses/:clientName", 
    authenticateAnalyticsAdmin, 
    clientNudgeResponseController.getClientNudgeResponses
);

router.get(
    "/client-nudge-recommendations/:clientName", 
    authenticateAnalyticsAdmin, 
    clientNudgeRecommendationController.getClientNudgeRecommendations
);

router.get(
    "/client-user-sessions/:clientName", 
    authenticateAnalyticsAdmin, 
    clientUserSessionController.getClientUserSessions
);

module.exports = router;

