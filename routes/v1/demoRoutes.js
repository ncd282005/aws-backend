const express = require("express");
const router = express.Router();
const clientController = require("../../controllers/demo/client.controller");
const getClientController = require("../../controllers/demo/getclientinfo.controller")
const loadJsonDataController = require("../../controllers/demo/loadjsondata.controller")
const democlientLogin = require("../../controllers/demo/loginclient.controller")
const clientresendOtp = require("../../controllers/demo/resendotp.controller")
const clientverifyOtp = require("../../controllers/demo/verifyotp.controller")
const loadCleanedTextData = require("../../controllers/demo/loadCleanedText.controller")
const generateQAndAdata = require("../../controllers/demo/genrateQuestionsAnswers.controller")
const generateQAndAdataStatus = require("../../controllers/demo/updateQAStatus.controller")
const submitFinalQuestionsAnswers = require("../../controllers/demo/submitFinalQA.controller")
const submitFinalQAWhyData = require("../../controllers/demo/submitFinalQAwhydata")
const demoClientCron = require("../../controllers/demo/clientCrone.controller")




// Public routes
router.post("/clients/create-or-update", clientController.createOrUpdate);
router.get("/clients/get", getClientController.getClients);
router.post("/clients/demo-login", democlientLogin.clientLogin)
router.post("/clients/resend-otp", clientresendOtp.resendOtp)
router.post("/clients/verify-otp", clientverifyOtp.verifyOtp)



//AI API
router.post("/clients/load-json-data", loadJsonDataController.addQuestionsData);
router.post("/clients/load-cleaned-text", loadCleanedTextData.loadCleanedText);
router.post("/clients/generate-q-and-a", generateQAndAdata.generateQAndA);
router.post("/clients/generate-q-and-a-status", generateQAndAdataStatus.updateQAStatus);
router.post("/clients/submit-final-q-and-a", submitFinalQuestionsAnswers.updateFinalData);
router.post("/clients/submit-final-why-data", submitFinalQAWhyData.submitFinalWhyData);


//CRON API
router.get("/clients/cron/update-status", demoClientCron.clientCrone);




module.exports = router;
