const DemoClient = require("../../models/demo/client.schema");

exports.updateQAStatus = async (req, res) => {
    try {
        const { id, q_and_a_status } = req.body;

        const validStatuses = ["-", "In-Progress", "Completed", "Error"];
        if (!validStatuses.includes(q_and_a_status)) {
            return res.status(400).json({ message: "Invalid status value", status: false });
        }

        const updatedClient = await DemoClient.findByIdAndUpdate(
            id,
            { q_and_a_status },
            { new: true }
        );

        if (!updatedClient) {
            return res.status(404).json({ message: "Client not found", status: false });
        }

        res.status(200).json({
            message: "Q&A Status updated successfully",
            data: updatedClient,
            status: true
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message, status: false });
    }
};
