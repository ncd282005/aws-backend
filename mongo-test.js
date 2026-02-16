require("dotenv").config();

const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("MONGO_URI is undefined");
  process.exit(1);
}

(async () => {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log("MongoDB Connected Successfully");
    process.exit(0);
  } catch (err) {
    console.error("MongoDB Error:", err.message);
    process.exit(1);
  }
})();
