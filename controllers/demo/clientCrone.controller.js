const mongoose = require("mongoose");
const DemoClient = require("../../models/demo/client.schema");

exports.clientCrone = async (req, res) => {
  try {
    const currentTime = new Date();

    const result = await DemoClient.updateMany(
      { ttl: { $lt: currentTime }, status: { $ne: "Expired" } },
      { $set: { status: "Expired" } }
    ).lean();

    console.log(`Updated ${result.modifiedCount} documents to Expired status.`);

//    res.status(200).json({
//      message: "Cron job executed successfully",
//      updatedRecords: result.modifiedCount || 0,
//    });
  } catch (error) {
    console.error("Error updating expired clients:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
