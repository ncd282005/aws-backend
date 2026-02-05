const WebhookProduct = require("../../models/webhook/webhookProduct.schema");

exports.productUpdate = async (req, res) => {
  try {
    req.body["source_platform"] = "shopify";
    const productData = req.shopifyData || req.body;
    const { admin_graphql_api_id } = productData;
    if (!admin_graphql_api_id) {
      return res.status(400).send("admin_graphql_api_id missing");
    }
    res.status(200).send("OK");
    setImmediate(async () => {
      try {
        // 1️⃣ Delete old product (if exists)
        await WebhookProduct.deleteOne({ admin_graphql_api_id });

        // 2️⃣ Insert new product data
        await WebhookProduct.create(productData);

        console.log("Product updated:", admin_graphql_api_id);
      } catch (dbErr) {
        console.error("DB error (product update):", dbErr);
      }
    });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("Error");
  }
};
