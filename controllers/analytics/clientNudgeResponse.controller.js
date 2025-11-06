const { getClientNudgeResponseModel } = require("../../models/analytics/clientNudgeResponse.schema");

/**
 * Get client nudge responses with date range filter
 * Path params: clientName
 * Query params: startDate, endDate (ISO 8601 format or YYYY-MM-DD)
 */
exports.getClientNudgeResponses = async (req, res) => {
    try {
        const { clientName } = req.params;
        const { startDate, endDate } = req.query;

        // Validate required parameters
        if (!clientName) {
            return res.status(400).json({
                status: false,
                message: "clientName is required in path parameter"
            });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({
                status: false,
                message: "startDate and endDate are required query parameters"
            });
        }

        // Parse and validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                status: false,
                message: "Invalid date format. Use ISO 8601 format (e.g., 2025-11-04 or 2025-11-04T10:29:13.659Z)"
            });
        }

        // Ensure startDate is before endDate
        if (start > end) {
            return res.status(400).json({
                status: false,
                message: "startDate must be before or equal to endDate"
            });
        }

        // Set end date to end of day if only date is provided (no time)
        if (endDate.length === 10) { // Format: YYYY-MM-DD
            end.setHours(23, 59, 59, 999);
        }

        // Get the model for the specific client collection
        const ClientNudgeResponseModel = getClientNudgeResponseModel(clientName);

        // Build query filter
        const filter = {
            createdAt: {
                $gte: start,
                $lte: end
            }
        };

        // Execute parallel queries for statistics and full records
        const [stats, fullRecords] = await Promise.all([
            ClientNudgeResponseModel.aggregate([
                {
                    $match: filter
                },
                {
                    $facet: {
                        totalResponses: [
                            { $count: "count" }
                        ],
                        uniqueFingerprints: [
                            {
                                $group: {
                                    _id: "$fingerprint"
                                }
                            },
                            { $count: "count" }
                        ]
                    }
                }
            ]),
            // Fetch all full records
            ClientNudgeResponseModel.find(filter)
                .sort({ createdAt: -1 }) // Sort by newest first
                .lean()
        ]);

        const result = stats[0];

        res.status(200).json({
            status: true,
            message: "Client nudge responses retrieved successfully",
            data: {
                totalResponses: result.totalResponses[0]?.count || 0,
                uniqueFingerprints: result.uniqueFingerprints[0]?.count || 0,
                records: fullRecords
            }
        });

    } catch (error) {
        console.error("Error fetching client nudge responses:", error);
        
        // Handle collection not found error
        if (error.message && error.message.includes("not found")) {
            return res.status(404).json({
                status: false,
                message: `Collection for client '${req.params.clientName}' not found`
            });
        }

        res.status(500).json({
            status: false,
            message: "Internal server error"
        });
    }
};

