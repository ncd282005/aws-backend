const ThemeConfig = require("../../models/themeConfig.schema");
const Client = require("../../models/client.schema");

/**
 * Extract client name from domain
 * Example: www.google.com -> google_tech
 */
const extractClientNameFromDomain = (domain) => {
  if (!domain) return null;

  // Remove protocol if present
  let cleanDomain = domain.replace(/^https?:\/\//, "");

  // Remove trailing slash
  cleanDomain = cleanDomain.replace(/\/$/, "");

  // Extract just the domain (remove path if any)
  const domainOnly = cleanDomain.split("/")[0];

  // Split domain into parts
  const domainParts = domainOnly.split(".");

  // Extract the middle/second-level domain
  // For www.google.com -> ['www', 'google', 'com'] -> 'google'
  // For google.com -> ['google', 'com'] -> 'google'
  // For shop.kesari.in -> ['shop', 'kesari', 'in'] -> 'kesari'
  if (domainParts.length >= 2) {
    // If 2 parts, return the first (e.g., google.com -> google)
    // If 3+ parts, return the second (e.g., www.google.com -> google)
    const middleDomain = domainParts.length === 2 ? domainParts[0] : domainParts[1];
    return `${middleDomain.toLowerCase()}_tech`;
  }

  return null;
};

/**
 * Get theme configuration for a specific client
 */
const getThemeConfig = async (req, res) => {
  try {
    const { clientName, domain } = req.query;

    let finalClientName = null;

    // If domain is provided, extract client name from it
    if (domain) {
      finalClientName = extractClientNameFromDomain(domain);
      if (!finalClientName) {
        return res.status(400).json({
          status: false,
          message: "Invalid domain format",
        });
      }
    } else if (clientName) {
      finalClientName = clientName.toLowerCase().trim();
    } else {
      return res.status(400).json({
        status: false,
        message: "Either clientName or domain is required",
      });
    }

    const themeConfig = await ThemeConfig.findOne({
      clientName: finalClientName,
    });

    if (!themeConfig) {
      // Return default configuration if not found
      const defaultConfig = new ThemeConfig({
        clientName: finalClientName,
      });
      return res.status(200).json({
        status: true,
        message: "Theme configuration retrieved successfully (default)",
        data: defaultConfig.toObject(),
      });
    }

    return res.status(200).json({
      status: true,
      message: "Theme configuration retrieved successfully",
      data: themeConfig,
    });
  } catch (error) {
    console.error("Error fetching theme configuration:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch theme configuration",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Create or update theme configuration for a specific client
 */
const saveThemeConfig = async (req, res) => {
  try {
    const { clientName } = req.body;

    if (!clientName) {
      return res.status(400).json({
        status: false,
        message: "Client name is required",
      });
    }

    const normalizedClientName = clientName.toLowerCase().trim();

    // Prepare update data (exclude clientName from updates)
    const {
      nudgeTheme,
      cardTopLeftRadius,
      cardTopRightRadius,
      cardBottomLeftRadius,
      cardBottomRightRadius,
      fontFamily,
      faqFontSize,
      optionButtonFontSize,
      selectedOptionButtonColor,
      selectedOptionButtonFontColor,
    } = req.body;

    const updateData = {
      nudgeTheme,
      cardTopLeftRadius,
      cardTopRightRadius,
      cardBottomLeftRadius,
      cardBottomRightRadius,
      fontFamily,
      faqFontSize,
      optionButtonFontSize,
      selectedOptionButtonColor,
      selectedOptionButtonFontColor,
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Use upsert to create if doesn't exist, update if exists
    const themeConfig = await ThemeConfig.findOneAndUpdate(
      { clientName: normalizedClientName },
      updateData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      status: true,
      message: "Theme configuration saved successfully",
      data: themeConfig,
    });
  } catch (error) {
    console.error("Error saving theme configuration:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to save theme configuration",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Reset theme configuration to default values for a client
 */
const resetThemeConfig = async (req, res) => {
  try {
    const { clientName } = req.body;

    if (!clientName) {
      return res.status(400).json({
        status: false,
        message: "Client name is required",
      });
    }

    const normalizedClientName = clientName.toLowerCase().trim();

    // Create default configuration
    const defaultConfig = {
      nudgeTheme: "dark",
      cardTopLeftRadius: "20px",
      cardTopRightRadius: "20px",
      cardBottomLeftRadius: "20px",
      cardBottomRightRadius: "20px",
      fontFamily: "Arial",
      faqFontSize: "14px",
      optionButtonFontSize: "12px",
      selectedOptionButtonColor: "#EEEEEE",
      selectedOptionButtonFontColor: "#1F2937",
    };

    const themeConfig = await ThemeConfig.findOneAndUpdate(
      { clientName: normalizedClientName },
      defaultConfig,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      status: true,
      message: "Theme configuration reset to default successfully",
      data: themeConfig,
    });
  } catch (error) {
    console.error("Error resetting theme configuration:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to reset theme configuration",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getThemeConfig,
  saveThemeConfig,
  resetThemeConfig,
};
