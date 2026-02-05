const { getCompanyDatabase } = require("../utils/dbUtil");
const customizationModel = require("../models/customization.schema");

exports.getCustomizationData = async (req, res) => {
  const user = req.user;
  const companyId = user.company_id;

  try {
    const companyDb = await getCompanyDatabase(companyId);
    const CustomizationModel = companyDb.model(
      "Customization",
      customizationModel.schema
    );

    let customization = await CustomizationModel.findOne({
      company_id: companyId,
      is_deleted: false,
    });

    if (!customization) {
      customization = {
        brand_color_code: "#292929",
        right_left: "Right",
        right_left_px: "20px",
        bottom_top_px: "20px",
        heading_size: "26px",
        font_size: "18px",
        actions_color_code: "#555555",
        logo: null,
      };
    }

    return res.status(200).json({
      status: true,
      message: "Customization data retrieved successfully",
      data: customization,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};
