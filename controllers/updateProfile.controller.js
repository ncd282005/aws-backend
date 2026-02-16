const { updateUserSchema } = require("../validationSchemas/validationSchemas");
const User = require("../models/user.schema");

exports.updateProfile = async (req, res) => {
  try {
    const { error } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: false,
        message: error.details[0].message,
        data: null,
      });
    }

    const userId = req.user.id;
    const { name, country_code, mobile_number } = req.body;
    const profilePicture = req.file ? req.file.filename : null;

    const updateData = {
      name,
      country_code,
      mobile_number,
      updated_at: Date.now(),
    };

    if (profilePicture) {
      updateData.profile_picture = profilePicture;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({
        status: false,
        message: "User not found",
        data: null,
      });
    }

    res.status(200).json({
      status: true,
      message: "User profile updated successfully",
      data: {
        email: updatedUser.email,
        country_code: updatedUser.country_code,
        mobile_number: updatedUser.mobile_number,
        name: updatedUser.name,
        profile_picture: updatedUser.profile_picture,
        role_id: updatedUser.role_id,
        company_id: updatedUser.company_id,
        email_verified: updatedUser.email_verified,
        otp_verified: updatedUser.otp_verified,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
      data: null,
    });
  }
};
