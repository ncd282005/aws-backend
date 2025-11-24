const https = require("https");
const fs = require('fs');
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");
const userRoutes = require("./routes/v1/userRoutes");
const demoRoutes = require("./routes/v1/demoRoutes");
const adminRoutes = require("./routes/v1/adminRoutes")
const trackLogRoutes = require("./routes/v1/trackLogRoutes");
require("dotenv").config();

const cron = require("node-cron");
const { clientCrone } = require("./controllers/demo/clientCrone.controller");

const sslKeyPath = process.env.SSL_KEY_PATH || "/var/www/ssl/playground.mprompto.com/24-03-2025/private.key";
const sslCertPath = process.env.SSL_CERT_PATH || "/var/www/ssl/playground.mprompto.com/24-03-2025/playground.mprompto.com.chained+root.crt";

let credentials = null;

if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
  credentials = {
    key: fs.readFileSync(sslKeyPath),
    cert: fs.readFileSync(sslCertPath),
  };
} else {
  console.warn(
    `SSL certificates not found. Expected key at ${sslKeyPath} and cert at ${sslCertPath}. Falling back to HTTP server.`
  );
}

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
app.use("/api/v1/track", trackLogRoutes);


cron.schedule("0 * * * *", async () => {
  await clientCrone();
});

if (credentials) {
  const httpsServer = https.createServer(credentials, app);
  httpsServer.listen(PORT, () => {
    console.log(`HTTPS server running on port ${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
  });
}
