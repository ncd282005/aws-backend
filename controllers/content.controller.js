const { getCompanyDatabase } = require("../utils/dbUtil");
const CompanyContentSchema = require("../models/companyContent.schema");
const faqSchema = require("../models/faq.schema");
const externalUrlSchema = require("../models/externalURL.schema");
const documentSchema = require("../models/document.schema");
// const reviewRatingSchema = require("../models/reviewRating");

exports.listCompanyContent = async (req, res) => {
  const user = req.user;
  const companyId = user.company_id;

  const { page = 1, limit = 10, filters, search } = req.query;

  try {
    const companyDb = await getCompanyDatabase(companyId);
    const CompanyContent = companyDb.model(
      "CompanyContent",
      CompanyContentSchema
    );
    const FAQ = companyDb.model("FAQ", faqSchema);
    const ExternalURL = companyDb.model("ExternalURL", externalUrlSchema);
    const File = companyDb.model("Document", documentSchema);
    // const ReviewRating = companyDb.model("ReviewRating", reviewRatingSchema);

    const companyContentQuery = {
      company_id: companyId,
      is_deleted: false,
    };

    if (filters && filters.content_state) {
      companyContentQuery.content_state = filters.content_state;
    }

    if (filters && filters.language) {
      companyContentQuery.language = filters.language;
    }

    if (filters && filters.content_type) {
      companyContentQuery.content_type = filters.content_type;
    }

    let faqQuery = {};
    let externalUrlQuery = {};
    let fileQuery = {};
    // let reviewRatingQuery = {};

    if (search) {
      const regexSearch = { $regex: search, $options: "i" };
      faqQuery.title = regexSearch;
      externalUrlQuery.title = regexSearch;
      fileQuery.title = regexSearch;
      // reviewRatingQuery.title = regexSearch;
    }

    const faqs = await FAQ.find({ ...faqQuery, is_deleted: false });
    const externalUrls = await ExternalURL.find({
      ...externalUrlQuery,
      is_deleted: false,
    });
    const files = await File.find({ ...fileQuery, is_deleted: false });
    // const reviewRatings = await ReviewRating.find({
    //   ...reviewRatingQuery,
    //   is_deleted: false,
    // });

    const companyContentIds = new Set();
    faqs.forEach((faq) =>
      companyContentIds.add(faq.company_content_id.toString())
    );
    externalUrls.forEach((url) =>
      companyContentIds.add(url.company_content_id.toString())
    );
    files.forEach((file) =>
      companyContentIds.add(file.company_content_id.toString())
    );
    // reviewRatings.forEach((review) =>
    //   companyContentIds.add(review.company_content_id.toString())
    // );

    if (companyContentIds.size > 0) {
      companyContentQuery._id = { $in: Array.from(companyContentIds) };
    }

    const skip = (page - 1) * limit;
    const companyContents = await CompanyContent.find(companyContentQuery)
      .skip(skip)
      .limit(Number(limit));

    const contentList = companyContents.map((content) => ({
      ...content.toObject(),
      faqs: faqs.filter(
        (faq) => faq.company_content_id.toString() === content._id.toString()
      ),
      externalUrls: externalUrls.filter(
        (url) => url.company_content_id.toString() === content._id.toString()
      ),
      files: files.filter(
        (file) => file.company_content_id.toString() === content._id.toString()
      ),
      // reviewRatings: reviewRatings.filter(
      //   (review) =>
      //     review.company_content_id.toString() === content._id.toString()
      // ),
    }));

    const totalFAQs = await FAQ.countDocuments({ is_deleted: false });
    const totalExternalUrls = await ExternalURL.countDocuments({
      is_deleted: false,
    });
    const totalFiles = await File.countDocuments({ is_deleted: false });
    // const totalReviewRatings = await ReviewRating.countDocuments({
    //   is_deleted: false,
    // });

    const combinedTotalCount = totalFAQs + totalExternalUrls + totalFiles;

    if (contentList.length === 0) {
      return res.status(200).json({
        status: true,
        message: "No company content found",
        data: [],
        totalCounts: {
          combinedTotal: combinedTotalCount,
          totalFAQs,
          totalExternalUrls,
          totalFiles,
          // totalReviewRatings,
        },
      });
    }

    return res.status(200).json({
      status: true,
      message: "Company content retrieved successfully",
      data: contentList,
      pagination: {
        total: contentList.length,
        page: Number(page),
        limit: Number(limit),
      },
      totalCounts: {
        combinedTotal: combinedTotalCount,
        totalFAQs,
        totalExternalUrls,
        totalFiles,
        // totalReviewRatings,
      },
    });
  } catch (error) {
    console.error("Error in listCompanyContent:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};
