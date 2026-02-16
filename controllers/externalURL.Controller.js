const { getCompanyDatabase } = require("../utils/dbUtil");
const externalUrlSchema = require("../models/externalURL.schema");
const companyContentSchema = require("../models/companyContent.schema");
const fs = require("fs");
const XLSX = require("xlsx");
const path = require("path");
const {
  externalUrlValidationSchema,
} = require("../validationSchemas/validationSchemas");

exports.addExternalURL = async (req, res) => {
  const { title, content_url, type } = req.body;
  const user = req.user;

  if (!type || !["single", "multi"].includes(type)) {
    return res.status(200).json({
      status: false,
      message: "Invalid type specified",
      data: null,
    });
  }

  try {
    const companyId = user.company_id;
    const companyDb = await getCompanyDatabase(companyId);
    const ExternalURL = companyDb.model("ExternalURL", externalUrlSchema);
    const CompanyContent = companyDb.model(
      "CompanyContent",
      companyContentSchema
    );

    if (type === "single") {
      const { error } = externalUrlValidationSchema.validate({
        title,
        content_url,
      });
      if (error) {
        return res.status(200).json({
          status: false,
          message: error.details[0].message,
          data: null,
        });
      }

      const newCompanyContent = new CompanyContent({
        company_id: companyId,
        content_type: "URLs",
        language: "English",
        content_audience: 0,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const savedCompanyContent = await newCompanyContent.save();

      const newExternalURL = new ExternalURL({
        company_content_id: savedCompanyContent._id,
        title: title || "",
        content_url,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const savedExternalURL = await newExternalURL.save();

      return res.status(201).json({
        status: true,
        message: "Single external url added successfully",
        data: {
          externalURL: savedExternalURL,
          companyContent: savedCompanyContent,
        },
      });
    } else if (type === "multi") {
      const savedUrls = [];
      const savedCompanyContents = [];
      let source = "";

      if (content_url) {
        const urlRegex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
        const urls = content_url
          .split(/\r?\n/)
          .map((url) => url.trim())
          .filter((url) => urlRegex.test(url) && url);

        if (urls.length === 0) {
          return res.status(200).json({
            status: false,
            message: "No valid urls found in content url",
            data: null,
          });
        }

        for (const url of urls) {
          const newCompanyContent = new CompanyContent({
            company_id: companyId,
            content_type: "URLs",
            language: "English",
            content_audience: 0,
            is_deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
          });
          const savedCompanyContent = await newCompanyContent.save();

          const newExternalURL = new ExternalURL({
            company_content_id: savedCompanyContent._id,
            title: title || "",
            content_url: url,
            is_deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
          });

          const savedExternalURL = await newExternalURL.save();
          savedUrls.push(savedExternalURL);
          savedCompanyContents.push(savedCompanyContent);
        }
        source = "content url";
      } else if (req.file) {
        const filePath = path.join(__dirname, "../uploads", req.file.filename); // eslint-disable-line no-undef
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const urls = XLSX.utils
          .sheet_to_json(worksheet, { header: 1 })
          .flat()
          .filter((url) => {
            const urlRegex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
            return urlRegex.test(url);
          });

        for (const url of urls) {
          const newCompanyContent = new CompanyContent({
            company_id: companyId,
            content_type: "URLs",
            language: "English",
            content_audience: 0,
            is_deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
          });
          const savedCompanyContent = await newCompanyContent.save();

          const newExternalURL = new ExternalURL({
            company_content_id: savedCompanyContent._id,
            title: title || "",
            content_url: url,
            is_deleted: false,
            created_at: new Date(),
            updated_at: new Date(),
          });

          const savedExternalURL = await newExternalURL.save();
          savedUrls.push(savedExternalURL);
          savedCompanyContents.push(savedCompanyContent);
        }

        fs.unlinkSync(filePath);
        source = "file";
      } else {
        return res.status(200).json({
          status: false,
          message: "CSV file or content url is required",
          data: null,
        });
      }

      return res.status(201).json({
        status: true,
        message: `Multi external urls added successfully from ${source}`,
        data: {
          externalURLs: savedUrls,
          companyContents: savedCompanyContents,
        },
      });
    } else {
      return res.status(400).json({
        status: false,
        message: "Invalid type specified",
        data: null,
      });
    }
  } catch (error) {
    // console.error("Error in addExternalURL:", error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};
