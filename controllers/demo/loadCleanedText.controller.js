const DemoClient = require("../../models/demo/client.schema");

exports.loadCleanedText = async (req, res) => {
    try {
        const { id, primary_text, secondary_text } = req.body;

        if (!id) {
            return res.status(400).json({
                status: false,
                message: "Client ID is required.",
                data: null,
            });
        }

        const data_cleaned_status = primary_text && primary_text.trim() !== "" ? "Completed" : "In-Progress";

        const updatedClient = await DemoClient.findByIdAndUpdate(
            id,
            {
                primary_text,
                secondary_text,
                data_cleaned_status
            },
            { new: true }
        );

        if (!updatedClient) {
            return res.status(404).json({
                status: false,
                message: "Demo client not found.",
                data: null,
            });
        }

        return res.status(200).json({
            status: true,
            message: `Cleaned text updated successfully. Status: ${data_cleaned_status}`,
            data: updatedClient,
        });
    } catch (err) {
        console.error("Error in loadCleanedText API:", err);
        return res.status(500).json({
            status: false,
            message: "An internal server error occurred.",
            data: null,
        });
    }
};
