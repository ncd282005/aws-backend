
exports.getAdminDashboard = async (req, res) => {
    try {
        return res.status(200).json({
            status: true,
            message: "You can explore your admin dashboard!",
            data: null, 
        });
    } catch (error) {
        console.error("Error in getAdminDashboard:", error);
        res.status(500).json({
            status: false,
            message: "Internal server error",
            data: null,
        });
    }
};
