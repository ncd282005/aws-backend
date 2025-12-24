const WebhookProduct = require("../../models/webhook/product.schema");

exports.store = async (req, res) => {
  try {
    const product = new WebhookProduct(req.body); // 👈 store exactly as sent
    await product.save();

    return res.status(201).json({
      success: true,
      data: product,
    });
  } catch (err) {
    console.error("Error storing shopify webhook log:", err);
    return res.status(500).json({
      status: false,
      message: "An internal server error occurred.",
      data: null,
    });
  }
};
