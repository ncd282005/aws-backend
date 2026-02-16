const DemoClient = require("../../models/demo/client.schema");
const OTP = require("../../models/demo/otp.schema");
const { sendMail } = require("../../utils/demo/demo_email");

exports.clientLogin = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const client = await DemoClient.findOne({ 
            email_ids: { $in: [email] },
            status: "Active",
        });

        if (!client) {
            return res.status(404).json({ message: "Data not found" });
        }

        if (client.status !== 'Active') {
            return res.status(403).json({ message: "Data is not active" });
        }

        if (client.data== "" || client.data==null) {
            return res.status(404).json({ message: "Product details not found" });
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        let otpDoc = await OTP.findOne({ email });

        if (otpDoc) {
            otpDoc.otp = otp;
            otpDoc.expiresAt = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes
            otpDoc.isVerified = false; // Reset verification status
            await otpDoc.save();
        } else {
            otpDoc = new OTP({
                // name: client.name, 
                email: email,
                otp: otp,
                expiresAt: Date.now() + 5 * 60 * 1000,
                isVerified: false,
            });
            await otpDoc.save();
        }

        try {
            await sendMail(email, "Your OTP Code", otp);
            res.status(200).json({ message: "OTP sent successfully" });
        } catch (emailError) {
            console.error("Email Error:", emailError);
            return res.status(500).json({ message: "Failed to send OTP", error: emailError.message });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};
