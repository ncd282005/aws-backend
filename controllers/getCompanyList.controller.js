const Company = require("../models/company.schema");
const User = require("../models/user.schema");

exports.getCompanyList = async (req, res) => {
    try {
        const companyList = await Company.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "userDetails",
                },
            },
            {
                $unwind: "$userDetails",
            },
            {
                $match: {
                    "userDetails.is_deleted": false,
                    is_deleted: false,
                },
            },
            {
                $project: {
                    _id: 1,
                    company_name: 1,
                    email: "$userDetails.email",
                },
            },

        ]);
        if (companyList.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No companies found",
            });
        }
        res.status(200).json({ success: true, message: "Company list retrieved successfully.", data: companyList });
    } catch (error) {
        console.error("Error in getCompanyList:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
