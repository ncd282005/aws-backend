const { getCompanyDatabase } = require("../utils/dbUtil");
const CompanyContentSchema = require("../models/companyContent.schema");
const faqSchema = require("../models/faq.schema");
const externalUrlSchema = require("../models/externalURL.schema");
const documentSchema = require("../models/document.schema");

exports.getCompanyContent = async (req, res) => {
    const { company_id } = req.body;

    if (!company_id) {
        return res.status(400).json({
            status: false,
            message: "Company ID is required",
        });
    }

    try {
        const companyDb = await getCompanyDatabase(company_id);
        const FAQ = companyDb.model("FAQ", faqSchema);
        const ExternalURL = companyDb.model("ExternalURL", externalUrlSchema);
        const File = companyDb.model("Document", documentSchema);
        const CompanyContent = companyDb.model("CompanyContent", CompanyContentSchema);

        const companyContents = await CompanyContent.find({ company_id });
        if (!companyContents || companyContents.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No content found for the provided company ID",
            });
        }
        const company_content_ids = companyContents.map(content => content._id);

        const faqs = await FAQ.aggregate([
            {
                $match: {
                    company_content_id: { $in: company_content_ids },
                    is_deleted: false,
                },
            },
            {
                $project: { _id: 1, question: 1, answer: 1 },
            },
        ]);

        const externalUrls = await ExternalURL.aggregate([
            {
                $match: {
                    company_content_id: { $in: company_content_ids },
                    is_deleted: false,
                },
            },
            {
                $project: { _id: 1, title: 1, content_url: 1 },
            },
        ]);

        const files = await File.aggregate([
            {
                $match: {
                    company_content_id: { $in: company_content_ids },
                    is_deleted: false,
                },
            },
            {
                $project: { _id: 1, filename: 1, filepath: 1, language: 1 },
            },
        ]);

        return res.status(200).json({
            status: true,
            message: "Company content retrieved successfully",
            data: {
                faqs,
                externalUrls,
                files,
            },
        });
    } catch (error) {
        console.error("Error in getCompanyContent:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            data: null,
        });
    }
};
