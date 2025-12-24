const express = require("express");
const router = express.Router();

const shopifyProductStore = require("../../../controllers/webhook/shopifyProductStore.controller");
const shopifyProductUpdate = require("../../../controllers/webhook/shopifyProductUpdate.controller");

router.post(
  "/product/store",
  express.raw({ type: "application/json" }),
  shopifyProductStore.productStore
);

router.post(
  "/product/update",
  express.raw({ type: "application/json" }),
  shopifyProductUpdate.productUpdate
);
module.exports = router;
