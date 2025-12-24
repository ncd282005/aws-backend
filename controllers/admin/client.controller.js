const Client = require("../../models/client.schema");

/**
 * Get all clients
 */
const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find({ isActive: true })
      .sort({ displayName: 1 })
      .select("name displayName createdAt");

    return res.status(200).json({
      status: true,
      message: "Clients fetched successfully",
      data: clients,
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch clients",
      error: error.message,
    });
  }
};

/**
 * Create a new client
 */
const createClient = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: false,
        message: "Client name is required",
      });
    }

    // Normalize the name (lowercase, replace spaces with underscores)
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, "_");
    
    // Check if client already exists
    const existingClient = await Client.findOne({ name: normalizedName });
    if (existingClient) {
      return res.status(409).json({
        status: false,
        message: "Client with this name already exists",
      });
    }

    // Create new client
    const newClient = new Client({
      name: normalizedName,
      displayName: name.trim(),
      isActive: true,
    });

    await newClient.save();

    return res.status(201).json({
      status: true,
      message: "Client created successfully",
      data: {
        name: newClient.name,
        displayName: newClient.displayName,
        createdAt: newClient.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating client:", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        status: false,
        message: "Client with this name already exists",
      });
    }

    return res.status(500).json({
      status: false,
      message: "Failed to create client",
      error: error.message,
    });
  }
};

module.exports = {
  getAllClients,
  createClient,
};

