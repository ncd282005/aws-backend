const AnalyticsAdmin = require("../../models/admin/analyticsAdmin.schema");
const AnalyticsAdminToken = require("../../models/admin/analyticsAdminToken.schema");
const bcrypt = require("bcrypt");
const { generateAnalyticsAdminAccessToken } = require("../../config/jwt");

/**
 * Login analytics admin with 24-hour token expiration
 */
exports.loginAnalyticsAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ 
                status: false,
                message: "Email and password are required" 
            });
        }

        // Find admin by email
        const admin = await AnalyticsAdmin.findOne({ 
            email: email.toLowerCase() 
        });

        if (!admin) {
            return res.status(404).json({ 
                status: false,
                message: "Invalid email or password" 
            });
        }

        // Check if admin account is active
        if (!admin.is_active) {
            return res.status(403).json({ 
                status: false,
                message: "Account is inactive. Please contact support." 
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                status: false,
                message: "Invalid email or password" 
            });
        }

        // Check if a valid token already exists
        let adminToken = await AnalyticsAdminToken.findOne({ 
            adminId: admin._id 
        });

        let token;
        
        if (!adminToken) {
            // Generate new token with 24-hour expiration
            token = generateAnalyticsAdminAccessToken(admin);

            // Store token in database
            adminToken = new AnalyticsAdminToken({
                adminId: admin._id,
                token,
            });
            await adminToken.save();
        } else {
            // Use existing valid token
            token = adminToken.token;
        }

        // Update last login time
        admin.last_login = new Date();
        await admin.save();

        // Return success response
        res.status(200).json({
            status: true,
            message: "Login successful",
            data: {
                id: admin._id,
                email: admin.email,
                is_active: admin.is_active,
                last_login: admin.last_login,
            },
            token,
            token_expires_in: "24 hours"
        });

    } catch (error) {
        console.error("Error logging in analytics admin:", error);
        res.status(500).json({ 
            status: false,
            message: "Internal server error" 
        });
    }
};

