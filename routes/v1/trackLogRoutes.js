const express = require("express");
const router = express.Router();

const trackStoreController = require("../../controllers/tracklog/store.controller");

router.post("/store", trackStoreController.store);


module.exports = router;
