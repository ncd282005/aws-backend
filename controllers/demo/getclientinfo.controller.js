const DemoClient = require("../../models/demo/client.schema");

exports.getClients = async (req, res) => {
    try {
        const { page = 1, limit = 10, status = "", language = "English", search = "" } = req.query;
        const skip = (page - 1) * limit;
        const query = {};

        // Filter by status if not "ALL"
        if (status !== "") {
            query.status = status;
        }

        // Filter by language
        if (language) {
            query.language = language;
        }

        // Search by name, email_ids, or title
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email_ids: { $regex: search, $options: "i" } },
                { title: { $regex: search, $options: "i" } }
            ];
        }

        let clients = await DemoClient.find(query)
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 })
            .lean();

        clients = clients.map(client => {
            // Append final_data.qa to data.qa
            const finalQa = client.final_data?.qa || [];
            delete client.final_data;
            client.data = client.data || {};
            const existingQa = client.data.qa || [];
            client.data.qa = [...existingQa, ...finalQa];

            // Append final_why_data.qa to whyData.qa
            const finalWhyQa = client.final_why_data?.qa || [];
            const finalIntelligence = client.final_why_data?.intelligence || [];
            delete client.final_why_data;

            client.whyData = client.whyData || {};

            // Merge QA data
            const existingWhyQa = client.whyData.qa || [];
            client.whyData.qa = [...existingWhyQa, ...finalWhyQa];

            // Merge Intelligence data
            const existingIntelligence = client.whyData.intelligence || [];
            client.whyData.intelligence = [...existingIntelligence, ...finalIntelligence];

            return client;
        });

        const totalCount = await DemoClient.countDocuments(query);

        return res.status(200).json({
            status: true,
            message: "Clients fetched successfully.",
            data: {
                clients,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: Number(page),
            },
        });
    } catch (err) {
        console.error("Error fetching clients:", err);
        return res.status(500).json({
            status: false,
            message: "An internal server error occurred.",
            data: null,
        });
    }
};
