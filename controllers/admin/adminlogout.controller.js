const jwt = require("jsonwebtoken");
const AdminToken = require("../../models/admin/admintoken.schema");
const { ADMIN_JWT_SECRET } = require("../../config/jwt");

exports.logoutAdmin = async (req, res) => {
    try {
        const adminId = req.admin._id; 
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1]; 

        if (!token) {
            return res.status(400).json({ message: "Token missing from request." });
        }

        jwt.verify(token, ADMIN_JWT_SECRET, async (err) => {
            if (err) {
                console.error("Token verification failed:", err);
                return res.status(403).json({
                    status: false,
                    message: "Invalid token",
                });
            }

            // Delete only the specific token being used
            // This allows other browser sessions to remain active
            const deletedToken = await AdminToken.findOneAndDelete({ 
                adminId,
                token 
            });

            if (!deletedToken) {
                return res.status(404).json({
                    status: false,
                    message: "Admin token not found.",
                });
            }

            res.status(200).json({
                status: true,
                message: "Admin logged out successfully.",
            });
        });
    } catch (error) {
        console.error("Error logging out admin:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};
