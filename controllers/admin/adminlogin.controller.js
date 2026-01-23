const Admin = require("../../models/admin/admin.schema");
const bcrypt = require("bcrypt");
const { generateAdminAccessToken } = require("../../config/jwt");
const AdminToken = require("../../models/admin/admintoken.schema");

exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(404).json({ message: "Admin not found." });
        }

        if (!admin.is_active) {
            return res.status(403).json({ message: "Admin account is inactive." });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // Generate a new token for each login session
        // This allows multiple browsers/devices to be logged in simultaneously
        const token = generateAdminAccessToken(admin);

        const adminToken = new AdminToken({
            adminId: admin._id,
            token,
        });
        await adminToken.save();

        res.status(200).json({
            status: true,
            message: "Admin login successful.",
            data: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
            },
            token,
        });
    } catch (error) {
        console.error("Error logging in admin:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};
