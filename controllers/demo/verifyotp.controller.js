const OTP = require("../../models/demo/otp.schema");
const DemoClient = require("../../models/demo/client.schema");

exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const otpDoc = await OTP.findOne({ email, otp });

        if (!otpDoc) {
            return res.status(404).json({ message: "Invalid email or OTP" });
        }

        if (otpDoc.expiresAt < Date.now()) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        otpDoc.isVerified = true;
        await otpDoc.save();

        let clientData = await DemoClient.find({
            email_ids: { $in: [email] },
            status: "Active",
        }).lean(); // Convert Mongoose documents to plain objects

        if (!clientData || clientData.length === 0) {
            return res.status(404).json({ message: "No active client data found for the provided email" });
        }

        clientData = clientData.map(client => {
            if (client.final_data?.qa) {
                client.data = client.data || {}; // Ensure `client.data` exists
                client.data.qa = client.final_data.qa; // Move `qa` from `final_data` to `data`
            }
            delete client.final_data; // Remove `final_data`
            return client;
        });

        return res.status(200).json({
            message: "OTP verified successfully",
            data: clientData,
        });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};
