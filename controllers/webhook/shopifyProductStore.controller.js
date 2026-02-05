const WebhookProduct = require("../../models/webhook/webhookProduct.schema");

exports.productStore = async (req, res) => {
  try {
    req.body["source_platform"] = "shopify";
    const product = new WebhookProduct(req.body); // 👈 store exactly as sent
    await product.save();

    res.status(200).send("OK");
  } catch (err) {
    console.error("Error storing shopify webhook log:", err);
    return res.status(500).json({
      status: false,
      message: "An internal server error occurred.",
      data: null,
    });
  }
};
