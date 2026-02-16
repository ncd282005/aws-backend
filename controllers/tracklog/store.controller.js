const fs = require('fs');
const path = require('path');

exports.store = async (req, res) => {
  try {
    // 1️⃣ Get URL and extract domain/subdomain
    const referer = req.headers.referer || req.headers.host || req.headers.origin;
    if (!referer) {
      return res.status(400).json({
        status: false,
        message: 'Referer or host not provided.',
        data: null,
      });
    }

    // Extract domain/subdomain
    const domain = new URL(referer).hostname.replace(/^www\./, ''); // Remove www if exists

    // 2️⃣ Create folder with domain/subdomain name
    const baseDir = path.join('public/logs', domain);
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    // 3️⃣ Create subfolder with today’s date
    const today = new Date();
    const dateFolder = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    const dateDir = path.join(baseDir, dateFolder);
    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }

    // 4️⃣ Get IP and create file name
    const userIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const ipAddress = userIp.replace(/:/g, '-'); // Replace ":" in IPv6

    // 5️⃣ Create file path with IP as file name
    const filePath = path.join(dateDir, `${ipAddress}.json`);

    // 6️⃣ Create log entry for the request
    const logData = {
      body: req.body || {},
    };

    // 7️⃣ Check if file exists and append or create new
    if (!fs.existsSync(filePath)) {
      // Create new file with initial array if not exists
      fs.writeFileSync(filePath, JSON.stringify([logData], null, 2));
    } else {
      // Read existing logs and append new log
      const existingLogs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      existingLogs.push(logData);
      fs.writeFileSync(filePath, JSON.stringify(existingLogs, null, 2));
    }

    // ✅ Response
    return res.status(200).json({
      status: true,
      message: 'Success',
    });
  } catch (err) {
    console.error('Error storing track log:', err);
    return res.status(500).json({
      status: false,
      message: 'An internal server error occurred.',
      data: null,
    });
  }
};
