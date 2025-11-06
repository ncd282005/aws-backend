const AnalyticsAdmin = require("../../models/admin/analyticsAdmin.schema");
const bcrypt = require("bcrypt");

/**
 * Validates password strength
 * @param {string} password 
 * @returns {object} { isValid: boolean, message: string }
 */
const validatePasswordStrength = (password) => {
    if (password.length < 8) {
        return { 
            isValid: false, 
            message: "Password must be at least 8 characters long" 
        };
    }
    
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
        return { 
            isValid: false, 
            message: "Password must contain at least one uppercase letter" 
        };
    }
    
    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
        return { 
            isValid: false, 
            message: "Password must contain at least one lowercase letter" 
        };
    }
    
    // Check for at least one number
    if (!/[0-9]/.test(password)) {
        return { 
            isValid: false, 
            message: "Password must contain at least one number" 
        };
    }
    
    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return { 
            isValid: false, 
            message: "Password must contain at least one special character" 
        };
    }
    
    return { isValid: true, message: "Password is strong" };
};

/**
 * Register a new analytics admin
 */
exports.registerAnalyticsAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ 
                status: false,
                message: "Email and password are required" 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                status: false,
                message: "Please provide a valid email address" 
            });
        }

        // Validate password strength
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ 
                status: false,
                message: passwordValidation.message 
            });
        }

        // Check if admin already exists
        const existingAdmin = await AnalyticsAdmin.findOne({ 
            email: email.toLowerCase() 
        });
        
        if (existingAdmin) {
            return res.status(409).json({ 
                status: false,
                message: "An admin with this email already exists" 
            });
        }

        // Hash the password with bcrypt (salt rounds: 12 for strong security)
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new analytics admin
        const newAdmin = new AnalyticsAdmin({
            email: email.toLowerCase(),
            password: hashedPassword,
            is_active: true,
        });

        await newAdmin.save();

        // Return success response (without password)
        res.status(201).json({
            status: true,
            message: "Analytics admin registered successfully",
            data: {
                id: newAdmin._id,
                email: newAdmin.email,
                is_active: newAdmin.is_active,
                createdAt: newAdmin.createdAt,
            }
        });

    } catch (error) {
        console.error("Error registering analytics admin:", error);
        
        // Handle mongoose validation errors
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                status: false,
                message: messages.join(", ") 
            });
        }

        // Handle duplicate key error (in case unique index fails)
        if (error.code === 11000) {
            return res.status(409).json({ 
                status: false,
                message: "An admin with this email already exists" 
            });
        }

        res.status(500).json({ 
            status: false,
            message: "Internal server error" 
        });
    }
};

