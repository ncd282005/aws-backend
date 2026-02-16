const DemoClient = require("../../models/demo/client.schema");

exports.submitFinalWhyData = async (req, res) => {
    try {
        const { id, qa, intelligence } = req.body;

        if (!id || !Array.isArray(qa) || !Array.isArray(intelligence)) {
            return res.status(400).json({ status: false, message: "Invalid request data." });
        }

        const updatedQa = qa.map(item => ({
            ...item,
            is_checked: true
        }));

        const updatedIntelligence = intelligence.map(item => ({
            ...item,
            is_checked: true
        }));

        const updatedClient = await DemoClient.findByIdAndUpdate(
            id,
            {
                $set: {
                    final_why_data: {
                        qa: updatedQa,
                        intelligence: updatedIntelligence
                    },
                    "whyData.qa": [],
                    "whyData.intelligence": []
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedClient) {
            return res.status(404).json({ status: false, message: "Client not found." });
        }

        return res.status(200).json({
            status: true,
            message: "Final why data submitted successfully.",
            data: updatedClient.final_why_data
        });
    } catch (error) {
        console.error("Error submitting final why data:", error);
        return res.status(500).json({ status: false, message: "Internal server error." });
    }
};
