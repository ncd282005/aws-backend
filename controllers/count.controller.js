const { getCompanyDatabase } = require("../utils/dbUtil");
const faqSchema = require("../models/faq.schema");
const externalUrlSchema = require("../models/externalURL.schema");
const documentSchema = require("../models/document.schema");
// const reviewRatingSchema = require("../models/reviewRating");

exports.getTotalCounts = async (req, res) => {
  const user = req.user;
  const companyId = user.company_id;

  try {
    const companyDb = await getCompanyDatabase(companyId);
    const FAQ = companyDb.model("FAQ", faqSchema);
    const ExternalURL = companyDb.model("ExternalURL", externalUrlSchema);
    const File = companyDb.model("Document", documentSchema);
    // const ReviewRating = companyDb.model("ReviewRating", reviewRatingSchema);

    const totalFAQs = await FAQ.countDocuments({ is_deleted: false });
    const totalExternalUrls = await ExternalURL.countDocuments({
      is_deleted: false,
    });
    const totalFiles = await File.countDocuments({ is_deleted: false });
    // const totalReviewRatings = await ReviewRating.countDocuments({
    //   is_deleted: false,
    // });

    const combinedTotalCount = totalFAQs + totalExternalUrls + totalFiles;

    return res.status(200).json({
      status: true,
      message: "Total counts retrieved successfully",
      totalCounts: {
        combinedTotal: combinedTotalCount,
        totalFAQs,
        totalExternalUrls,
        totalFiles,
        // totalReviewRatings,
      },
    });
  } catch (error) {
    console.error("Error in getTotalCounts:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};
