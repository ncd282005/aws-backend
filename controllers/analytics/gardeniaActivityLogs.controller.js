const { getClientActivityLogModel } = require("../../models/analytics/clientActivityLog.schema");

/**
 * Get activity statistics for a date range
 * Path params: clientName
 * Query params: startDate, endDate (ISO 8601 format or YYYY-MM-DD)
 */
exports.getActivityStats = async (req, res) => {
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
                message: "startDate and endDate are required parameters"
            });
        }

        // Parse dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                status: false,
                message: "Invalid date format"
            });
        }

        // Set end date to end of day
        if (endDate.length === 10) {
            end.setHours(23, 59, 59, 999);
        }

        // Build query filter
        const filter = {
            time: { $gte: start, $lte: end }
        };

        // Get the model for the specific client collection
        const ClientActivityLogModel = getClientActivityLogModel(clientName);

        // Execute parallel queries for statistics and full records
        const [stats, fullRecords] = await Promise.all([
            ClientActivityLogModel.aggregate([
                {
                    $match: filter
                },
                {
                    $facet: {
                        totalActivities: [
                            { $count: "count" }
                        ],
                        uniqueFingerprints: [
                            {
                                $group: {
                                    _id: "$fingerprint"
                                }
                            },
                            { $count: "count" }
                        ],
                        uniqueIPs: [
                            {
                                $group: {
                                    _id: "$ip"
                                }
                            },
                            { $count: "count" }
                        ]
                    }
                }
            ]),
            // Fetch all full records
            ClientActivityLogModel.find(filter)
                .sort({ time: -1 })
                .lean()
        ]);

        const result = stats[0];

        res.status(200).json({
            status: true,
            message: "Activity statistics retrieved successfully",
            data: {
                totalActivities: result.totalActivities[0]?.count || 0,
                uniqueVisitors: result.uniqueFingerprints[0]?.count || 0,
                uniqueIPs: result.uniqueIPs[0]?.count || 0,
                records: fullRecords
            }
        });

    } catch (error) {
        console.error("Error fetching activity statistics:", error);
        
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

