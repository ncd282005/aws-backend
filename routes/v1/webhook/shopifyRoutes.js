const express = require("express");
const router = express.Router();

const shopifyController = require("../../../controllers/webhook/shopify.controller");

router.post("/store", shopifyController.store);

module.exports = router;
