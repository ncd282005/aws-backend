const path = require("path");
const { getCompanyDatabase } = require("../utils/dbUtil");
const documentSchema = require("../models/document.schema");
const CompanyContentSchema = require("../models/companyContent.schema");
const {
  fileUploadSchema,
  fileUrlSchema,
} = require("../validationSchemas/validationSchemas");

exports.addDocument = async (req, res) => {
  const { title, pdf_url, language } = req.body;
  const user = req.user;

  if (!req.file && (!pdf_url || !language)) {
    return res.status(200).json({
      status: false,
      message:
        "Either a file or a combination of pdf url and language is required",
      data: null,
    });
  }

  let validationError;
  let validationMessage;
  if (req.file) {
    const { error } = fileUploadSchema.validate(req.body);
    validationError = error;
    validationMessage = "File validation failed";
  } else {
    const { error } = fileUrlSchema.validate(req.body);
    validationError = error;
    validationMessage = "PDF URL and language validation failed";
  }

  if (validationError) {
    return res.status(200).json({
      status: false,
      message: validationError.details[0].message,
      data: null,
    });
  }

  try {
    const companyId = user.company_id;
    const companyDb = await getCompanyDatabase(companyId);
    const File = companyDb.model("Document", documentSchema);
    const CompanyContent = companyDb.model(
      "CompanyContent",
      CompanyContentSchema
    );

    const newCompanyContent = new CompanyContent({
      company_id: companyId,
      content_type: "Documents",
      language: language || "English",
      content_audience: 0,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const savedCompanyContent = await newCompanyContent.save();

    const relativeFilePath = req.file ? path.join("uploads", req.file.filename) : "";

    const newFileData = {
      company_content_id: savedCompanyContent._id,
      filename: req.file ? req.file.filename : "",
      filepath: relativeFilePath,
      filesize: req.file ? req.file.size : 0,
      pdf_url: pdf_url || "",
      language: language || "English",
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (title) newFileData.title = title;

    const newFile = new File(newFileData);
    const savedFile = await newFile.save();

    const successMessage = req.file
      ? "File added successfully"
      : "PDF URL and language added successfully";

    res.status(201).json({
      status: true,
      message: successMessage,
      data: savedFile,
    });
  } catch (error) {
    console.error("Error in addDocument:", error);

    res.status(500).json({
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};
