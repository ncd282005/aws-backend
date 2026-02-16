const { getCompanyDatabase } = require("../utils/dbUtil");
const CompanyContentSchema = require("../models/companyContent.schema");
const faqSchema = require("../models/faq.schema");
const path = require("path");
const xlsx = require("xlsx");
const fs = require("fs");
const { singleFAQSchema } = require("../validationSchemas/validationSchemas");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

exports.addFAQ = async (req, res) => {
  const user = req.user;

  try {
    const companyId = user.company_id;
    const companyDb = await getCompanyDatabase(companyId);
    const FAQ = companyDb.model("FAQ", faqSchema);
    const CompanyContent = companyDb.model(
      "CompanyContent",
      CompanyContentSchema
    );

    if (req.body.type === "single") {
      const { language, title, question, answer } = req.body;
      const { error } = singleFAQSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        const errorMessages = error.details
          .map((err) => err.message)
          .join(", ");
        return res.status(200).json({
          status: false,
          message: errorMessages,
          data: null,
        });
      }
      // if (error) {
      //   return res.status(200).json({
      //     status: false,
      //     message: "Validation errors",
      //     data: error.details.map((err) => err.message),
      //   });
      // }

      const newCompanyContent = new CompanyContent({
        company_id: companyId,
        content_type: "FAQs",
        language,
        content_audience: 0,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const savedCompanyContent = await newCompanyContent.save();

      const newFAQ = new FAQ({
        company_content_id: savedCompanyContent._id,
        title,
        question,
        answer,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const savedFAQ = await newFAQ.save();

      return res.status(201).json({
        status: true,
        message: "FAQ added successfully",
        data: {
          faq: savedFAQ,
          companyContent: savedCompanyContent,
        },
      });
    }

    if (req.body.type === "multi") {
      if (req.file) {
        const { language } = req.body;
        if (!language) {
          return res.status(200).json({
            status: false,
            message: "Language field is required for file uploads",
            data: null,
          });
        }

        const filePath = path.join(__dirname, "../uploads", req.file.filename);
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: 1,
          defval: "",
        });

        const headers = data[0];
        const rows = data.slice(1);

        const savedFAQs = [];
        const savedCompanyContents = [];

        for (const row of rows) {
          if (row.length < headers.length) {
            continue;
          }

          const faqObject = {};
          headers.forEach((header, index) => {
            faqObject[header.toLowerCase()] = row[index];
          });

          const newCompanyContent = new CompanyContent({
            company_id: companyId,
            content_type: "FAQs",
            language,
            content_audience: 0,
            is_deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
          });
          const savedCompanyContent = await newCompanyContent.save();

          const newFAQ = new FAQ({
            company_content_id: savedCompanyContent._id,
            question: faqObject["questions"],
            answer: faqObject["answer"],
            is_deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
          });

          const savedFAQ = await newFAQ.save();
          savedFAQs.push(savedFAQ);
          savedCompanyContents.push(savedCompanyContent);
        }

        fs.unlinkSync(filePath);

        return res.status(201).json({
          status: true,
          message: "FAQs added successfully from file",
          data: {
            faqs: savedFAQs,
            companyContents: savedCompanyContents,
          },
        });
      }

      if (req.body.faqs) {
        const faqs = JSON.parse(req.body.faqs);

        if (Array.isArray(faqs)) {
          const savedFAQs = [];
          const savedCompanyContents = [];

          for (const faqData of faqs) {
            const { question, answer } = faqData;

            if (!question || !answer) {
              return res.status(200).json({
                status: false,
                message: "Each FAQ must have question, and answer",
                data: null,
              });
            }

            const newCompanyContent = new CompanyContent({
              company_id: companyId,
              content_type: "FAQs",
              content_audience: 0,
              is_deleted: false,
              created_at: new Date(),
              updated_at: new Date(),
            });
            const savedCompanyContent = await newCompanyContent.save();

            const newFAQ = new FAQ({
              company_content_id: savedCompanyContent._id,
              question,
              answer,
              is_deleted: false,
              created_at: new Date(),
              updated_at: new Date(),
            });

            const savedFAQ = await newFAQ.save();
            savedFAQs.push(savedFAQ);
            savedCompanyContents.push(savedCompanyContent);
          }

          return res.status(201).json({
            status: true,
            message: "FAQs added successfully",
            data: {
              faqs: savedFAQs,
              companyContents: savedCompanyContents,
            },
          });
        }

        return res.status(200).json({
          status: false,
          message: "Invalid FAQs data",
          data: null,
        });
      }

      return res.status(200).json({
        status: false,
        message: "No file or FAQ data provided for multiple FAQs",
        data: null,
      });
    }

    return res.status(200).json({
      status: false,
      message: "Invalid type",
      data: null,
    });
  } catch (error) {
    console.error("Error in addFAQ:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};
