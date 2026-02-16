const express = require("express");
const router = express.Router();

const shopifyProductStore = require("../../../controllers/webhook/shopifyProductStore.controller");
const shopifyProductUpdate = require("../../../controllers/webhook/shopifyProductUpdate.controller");
const cryptoParamsMiddleware = require("../../../middleware/cryptoMiddleware");

router.post(
  "/product/store/:client_domain/:client_domain_token",
  cryptoParamsMiddleware({
    client_domain: "client_domain",
    client_domain_token: "client_domain_token",
  }),
  express.raw({ type: "application/json" }),
  shopifyProductStore.productStore
);

router.post(
  "/product/update/:client_domain/:client_domain_token",
  cryptoParamsMiddleware({
    client_domain: "client_domain",
    client_domain_token: "client_domain_token",
  }),
  express.raw({ type: "application/json" }),
  shopifyProductUpdate.productUpdate
);
module.exports = router;
