const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middleware/authenticate");
const userController = require("../../controllers/user.controller");
const viewProfileController = require("../../controllers/viewProfile.controller");
const updateProfileController = require("../../controllers/updateProfile.controller");
const registerController = require("../../controllers/register.controller");
const verifyOtpController = require("../../controllers/verifyOtp.controller");
const { addExternalURL } = require("../../controllers/externalURL.Controller");
const { addDocument } = require("../../controllers/document.controller");
const { addFAQ } = require("../../controllers/faq.controller");
const { listCompanyContent } = require("../../controllers/content.controller");
const {
  addCustomizationData,
} = require("../../controllers/customization.controller");

const {
  getCustomizationData,
} = require("../../controllers/getCustomizationData.controller");

const { getTotalCounts } = require("../../controllers/count.controller");

const upload = require("../../utils/multerConfig");
const { logoutUser } = require("../../controllers/logout.controller");
const { getCompanyList } = require("../../controllers/getCompanyList.controller");

const { getCompanyContent } = require("../../controllers/getCompanyContent.controller");



// Public routes
router.post("/check-mail", registerController.registerUser);
router.post("/verify-otp", verifyOtpController.verifyOTP);

// Protected routes
router.put(
  "/save-basic-information",
  authenticateToken("user"),
  userController.updateUserAndCreateCompany
);

router.get(
  "/view-profile",
  authenticateToken("user"),
  viewProfileController.viewProfile
);

router.put(
  "/update-profile",
  authenticateToken("user"),
  upload.single("profilePicture"),
  updateProfileController.updateProfile
);

router.post(
  "/add-external-url",
  authenticateToken("user"),
  upload.single("file"),
  addExternalURL
);
router.post( 
  "/add-document",
  authenticateToken("user"),
  upload.single("file"),
  addDocument
);
router.post("/add-faq", authenticateToken("user"), upload.single("file"), addFAQ);

router.get("/content-listing", authenticateToken("user"), listCompanyContent);

router.post(
  "/customize-data-add",
  authenticateToken("user"),
  upload.single("logo"),
  addCustomizationData
);

router.get("/get-customizations", authenticateToken("user"), getCustomizationData);

router.get("/total-counts", authenticateToken("user"), getTotalCounts);

router.post("/logout", authenticateToken("user"), logoutUser);


//COMPANY
router.get("/company-list", getCompanyList);

router.post("/get-company-content", getCompanyContent);



module.exports = router;
