const path = require("path");
const { getCompanyDatabase } = require("../utils/dbUtil");
const Customization = require("../models/customization.schema");

exports.addCustomizationData = async (req, res) => {
  const user = req.user;
  const companyId = user.company_id;

  const customizationData = req.body;
  const newLogo = req.file ? path.basename(req.file.path) : null;

  try {
    const companyDb = await getCompanyDatabase(companyId);

    const CustomizationModel = companyDb.model(
      "Customization",
      Customization.schema
    );

    const existingCustomization = await CustomizationModel.findOne({
      company_id: companyId,
      is_deleted: false,
    });

    const logo =
      newLogo || (existingCustomization && existingCustomization.logo);

    const customization = await CustomizationModel.findOneAndUpdate(
      { company_id: companyId, is_deleted: false },
      { ...customizationData, logo, updated_at: new Date() },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      status: true,
      message: "Customization data saved successfully",
      data: customization,
    });
  } catch (error) {
    console.error("Error in addCustomizationData:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};
