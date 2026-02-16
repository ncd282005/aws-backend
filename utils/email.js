const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME, // eslint-disable-line no-undef
    pass: process.env.EMAIL_PASSWORD, // eslint-disable-line no-undef
    authMethod: "PLAIN",
  },
  debug: true,
  logger: false,
});

const sendMail = async (to, subject, otp) => {
  const templatePath = path.join(
    __dirname,
    "../utils/templates/otpTemplate.html"
  );
  let html = fs.readFileSync(templatePath, "utf8");

  html = html.replace("{{OTP}}", otp);

  const mailOptions = {
    from: process.env.EMAIL_USERNAME, // eslint-disable-line no-undef
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    // console.log(`Email sent to ${to}`);
  } catch (error) {
    // console.error(`Failed to send email to ${to}:`, error);
    throw new Error("Email sending failed");
  }
};

module.exports = { sendMail };
