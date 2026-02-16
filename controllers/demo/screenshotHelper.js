const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const captureScreenshot = async (url) => {
  try {
    if (!url) return null;

    const webWidth = 430;
    const webHeight = 932;

    const browser = await puppeteer.launch({
      headless: "new",
      defaultViewport: { width: webWidth, height: webHeight },
      executablePath: '/snap/bin/chromium',
      args: ["--disable-gpu", "--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    // Ensure the directory exists
    const dirPath = path.join(__dirname, "..", "..", "public", "demo", "product-images");
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Generate screenshot file name
    const screenshotName = `${Date.now()}.png`;
    const imagePath = path.join(dirPath, screenshotName);
    await page.screenshot({ path: imagePath });

    await browser.close();
    return `/public/demo/product-images/${screenshotName}`; // Returning relative path for database storage
  } catch (error) {
    console.error("Screenshot capture failed:", error);
    return null;
  }
};

module.exports = { captureScreenshot };
