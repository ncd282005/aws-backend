//const https = require('https');
const fs = require('fs');
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");
const userRoutes = require("./routes/v1/userRoutes");
const demoRoutes = require("./routes/v1/demoRoutes");
const adminRoutes = require("./routes/v1/adminRoutes");
const analyticsRoutes = require("./routes/v1/analyticsRoutes");
const trackLogRoutes = require("./routes/v1/trackLogRoutes");
const webhookShopifyRoutes = require("./routes/v1/webhook/shopifyRoutes");
require("dotenv").config();

connectDB();


const cron = require("node-cron");
const { clientCrone } = require("./controllers/demo/clientCrone.controller");

//const privateKey = fs.readFileSync('/home/ubuntu/ssl/mprompto.in/29-07-2025/mprompto.key');
//const certificate = fs.readFileSync('/home/ubuntu/ssl/mprompto.in/29-07-2025/fullchain.crt');

//const credentials = {
// key: privateKey,
// cert: certificate,
//};

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/public", express.static(path.join(__dirname, "public")));

connectDB();

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/demo", demoRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/track", trackLogRoutes);
app.use("/api/v1/webhook/shopify", webhookShopifyRoutes);

// ✅ Health check route (Very important for Docker / CI/CD)
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "hello !!! API is running 🚀"
  });
});

cron.schedule("0 * * * *", async () => {
  await clientCrone();
});

 app.listen(PORT,"0.0.0.0", () => {
   console.log(`Server is running on port ${PORT}`);
 });
//const httpsServer = https.createServer(credentials, app);
//httpsServer.listen(PORT);
