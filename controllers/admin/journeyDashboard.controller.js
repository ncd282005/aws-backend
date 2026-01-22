/* global process */
const Papa = require("papaparse");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../../config/s3Config");

const DEFAULT_BUCKET = "mongodatamprompt";
const DEFAULT_PREFIX = "dashboard_data/kesari";

const streamToString = async (stream) => {
  if (!stream) return "";
  if (typeof stream.transformToString === "function") {
    return stream.transformToString();
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
};

const parseCsv = (csvText) => {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (h) => (typeof h === "string" ? h.trim() : h),
  });

  if (result.errors && result.errors.length > 0) {
    const first = result.errors[0];
    throw new Error(first?.message || "Failed to parse CSV");
  }

  return Array.isArray(result.data) ? result.data : [];
};

const getCsvFromS3 = async ({ bucket, key }) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  const csvText = await streamToString(response.Body);
  if (!csvText || csvText.trim().length === 0) return [];
  return parseCsv(csvText);
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toPercentTriplet = (engagedCount, exposedCount, notExposedCount) => {
  const engaged = toNumber(engagedCount);
  const exposed = toNumber(exposedCount);
  const notExposed = toNumber(notExposedCount);
  const total = engaged + exposed + notExposed;
  if (total <= 0) {
    return {
      engaged: 0,
      exposed: 0,
      notExposed: 0,
      total,
    };
  }

  const toPct = (x) => Number(((x / total) * 100).toFixed(2));

  return {
    engaged: toPct(engaged),
    exposed: toPct(exposed),
    notExposed: toPct(notExposed),
    total,
  };
};

exports.getJourneyDashboard = async (req, res) => {
  try {
    const window = String(req.query.window || "30d").trim() || "30d";
    const bucket = String(req.query.bucket || DEFAULT_BUCKET).trim() || DEFAULT_BUCKET;

    const prefix = `${DEFAULT_PREFIX}/${window}`;
    const keys = {
      overview: `${prefix}/chart1_user_journey_performance.csv`,
      engagementTrend: `${prefix}/chart2_engagement_funnel.csv`,
      conversionTrend: `${prefix}/chart3_atc_attribution.csv`,
      timeSpentTrend: `${prefix}/chart4_time_spent_analysis.csv`,
      deviceDistribution: `${prefix}/chart5_device_distribution.csv`,
      browserDistribution: `${prefix}/chart6_browser_tech_radar.csv`,
    };

    const [
      overviewRows,
      engagementRows,
      conversionRows,
      timeSpentRows,
      deviceRows,
      browserRows,
    ] = await Promise.all([
      getCsvFromS3({ bucket, key: keys.overview }),
      getCsvFromS3({ bucket, key: keys.engagementTrend }),
      getCsvFromS3({ bucket, key: keys.conversionTrend }),
      getCsvFromS3({ bucket, key: keys.timeSpentTrend }),
      getCsvFromS3({ bucket, key: keys.deviceDistribution }),
      getCsvFromS3({ bucket, key: keys.browserDistribution }),
    ]);

    const overview = overviewRows?.[0] || {};

    const clientTotalUsers = toNumber(overview.client_total_users);
    const clientTotalAtc = toNumber(overview.client_total_atc);
    const clientTotalPurchase = toNumber(overview.client_total_purchase);

    const mpTotalUsers = toNumber(overview.mprompto_total_users);
    const mpEngagedUsers = toNumber(overview.mprompto_engaged_users);
    const mpAtc = toNumber(overview.mprompto_atc);
    const mpPurchase = toNumber(overview.mprompto_purchase);
    const liftMultiplierAtc = toNumber(overview.lift_multiplier_atc);

    // Chart 1 (Journey): current UI expects { label, strict, inSession, total }
    // CSV provides totals only; we map totals to inSession and keep strict as 0 for now.
    const journey = {
      mprompto: [
        { label: "Total Users", strict: 0, inSession: mpTotalUsers, total: mpTotalUsers },
        { label: "Engaged Users", strict: 0, inSession: mpEngagedUsers, total: mpEngagedUsers },
        { label: "Add to Cart", strict: 0, inSession: mpAtc, total: mpAtc },
        { label: "Purchase", strict: 0, inSession: mpPurchase, total: mpPurchase },
      ],
      client: [
        { label: "Total Users", strict: 0, inSession: clientTotalUsers, total: clientTotalUsers },
        // Client engaged users not available in chart_1_overview; keep 0 for now
        { label: "Engaged Users", strict: 0, inSession: 0, total: 0 },
        { label: "Add to Cart", strict: 0, inSession: clientTotalAtc, total: clientTotalAtc },
        { label: "Purchase", strict: 0, inSession: clientTotalPurchase, total: clientTotalPurchase },
      ],
    };

    // Chart 2 (Engagement Trend): aggregate by month from new format
    // New format: date, category, device_category, total_users, not_exposed_users, exposed_users, engaged_users
    // segment1=Not Exposed (red), segment2=Engaged (dark blue), segment3=Exposed (light grey)
    // Extract month from date
    // Handles both formats: YYYY-MM-DD (e.g., "2025-12-20" -> "12-2025") and DD-MM-YY (e.g., "17-01-26" -> "01-2026")
    const extractMonth = (dateStr) => {
      if (!dateStr) return null;
      // Convert to string and trim, handle cases where it might be a number or other type
      const trimmed = String(dateStr).trim();
      if (!trimmed) return null;
      
      const parts = trimmed.split("-");
      if (parts.length === 3) {
        // Check if first part is 4 digits (YYYY-MM-DD format)
        if (String(parts[0]).length === 4) {
          // Format: YYYY-MM-DD (e.g., "2025-12-20")
          const year = String(parts[0]);
          const month = String(parts[1]).padStart(2, "0");
          return `${month}-${year}`;
        } else {
          // Format: DD-MM-YY (e.g., "17-01-26", "27-12-25")
          const month = String(parts[1]).padStart(2, "0");
          const year = String(parts[2]);
          // Convert 2-digit year to 4-digit (e.g., "26" -> "2026", "25" -> "2025")
          const fullYear = year.length === 2 ? `20${year}` : year;
          return `${month}-${fullYear}`;
        }
      }
      return null;
    };

    const engagementTrendMap = new Map();
    (engagementRows || []).forEach((row) => {
      // Handle different possible field names for date
      const date = String(row.date || row["date"] || "").trim();
      if (!date) return;

      const monthKey = extractMonth(date);
      if (!monthKey) {
        console.warn(`Failed to extract month from date: ${date}`);
        return;
      }

      const notExposed = toNumber(row.not_exposed_users ?? row["not_exposed_users"]);
      const exposed = toNumber(row.exposed_users ?? row["exposed_users"]);
      const engaged = toNumber(row.engaged_users ?? row["engaged_users"]);

      if (engagementTrendMap.has(monthKey)) {
        const existing = engagementTrendMap.get(monthKey);
        existing.segment1 += notExposed;
        existing.segment2 += engaged;
        existing.segment3 += exposed;
      } else {
        engagementTrendMap.set(monthKey, {
          month: monthKey,
          segment1: notExposed,
          segment2: engaged,
          segment3: exposed,
        });
      }
    });
    const engagementTrend = Array.from(engagementTrendMap.values()).sort((a, b) => {
      // Sort by month (format: MM-YYYY)
      return a.month.localeCompare(b.month);
    });

    // Chart 3 (Conversion Trend): aggregate by date from new format
    // New format: date, category, device_category, atc_not_exposed, atc_total_exposed, atc_engaged, ...
    // cart=Not Exposed ATC (red), purchase=Exposed ATC (light grey), impact=Engaged ATC (dark blue)
    const conversionTrendMap = new Map();
    (conversionRows || []).forEach((row) => {
      const date = String(row.date || "").trim();
      if (!date) return;

      const atcNotExposed = toNumber(row.atc_not_exposed ?? row["atc_not_exposed"]);
      const atcExposed = toNumber(row.atc_total_exposed ?? row["atc_total_exposed"]);
      const atcEngaged = toNumber(row.atc_engaged ?? row["atc_engaged"]);

      if (conversionTrendMap.has(date)) {
        const existing = conversionTrendMap.get(date);
        existing.cart += atcNotExposed;
        existing.purchase += atcExposed;
        existing.impact += atcEngaged;
      } else {
        conversionTrendMap.set(date, {
          month: date,
          cart: atcNotExposed,
          purchase: atcExposed,
          impact: atcEngaged,
        });
      }
    });
    const conversionTrend = Array.from(conversionTrendMap.values()).sort((a, b) => {
      // Sort by date (assuming format like DD-MM-YY or similar)
      return a.month.localeCompare(b.month);
    });

    // Chart 4 (Time Spent Trend): aggregate by date from new format
    // New format: date, device_type, user_segment, total_sessions, avg_time_spent_sec
    // Calculate weighted average time spent per segment (weighted by total_sessions)
    const timeSpentTrendMap = new Map();
    (timeSpentRows || []).forEach((row) => {
      const date = String(row.date || "").trim();
      if (!date) return;

      const userSegment = String(row.user_segment ?? row["user_segment"] ?? "").trim();
      const avgTimeSpent = toNumber(row.avg_time_spent_sec ?? row["avg_time_spent_sec"]);
      const totalSessions = toNumber(row.total_sessions ?? row["total_sessions"]);

      if (!timeSpentTrendMap.has(date)) {
        timeSpentTrendMap.set(date, {
          month: date,
          engaged: { total: 0, sessions: 0 },
          exposed: { total: 0, sessions: 0 },
          notExposed: { total: 0, sessions: 0 },
        });
      }

      const dateData = timeSpentTrendMap.get(date);
      
      // Match user_segment to the expected keys (case-insensitive)
      if (userSegment.toLowerCase().includes("engaged")) {
        dateData.engaged.total += avgTimeSpent * totalSessions;
        dateData.engaged.sessions += totalSessions;
      } else if (userSegment.toLowerCase().includes("exposed") && !userSegment.toLowerCase().includes("not exposed")) {
        dateData.exposed.total += avgTimeSpent * totalSessions;
        dateData.exposed.sessions += totalSessions;
      } else if (userSegment.toLowerCase().includes("not exposed")) {
        dateData.notExposed.total += avgTimeSpent * totalSessions;
        dateData.notExposed.sessions += totalSessions;
      }
    });

    const timeSpentTrend = Array.from(timeSpentTrendMap.values())
      .map((item) => ({
        month: item.month,
        engaged: item.engaged.sessions > 0 ? Number((item.engaged.total / item.engaged.sessions).toFixed(2)) : 0,
        exposed: item.exposed.sessions > 0 ? Number((item.exposed.total / item.exposed.sessions).toFixed(2)) : 0,
        notExposed: item.notExposed.sessions > 0 ? Number((item.notExposed.total / item.notExposed.sessions).toFixed(2)) : 0,
      }))
      .sort((a, b) => {
        // Sort by date (assuming format like DD-MM-YY or similar)
        return a.month.localeCompare(b.month);
      });

    // Chart 5 (Device Distribution): aggregate by device_category from new format
    // New format: date, device_category, status, user_count
    // Aggregate across all dates and normalize device names
    const deviceDistributionMap = new Map();
    (deviceRows || []).forEach((row) => {
      const deviceCategory = String(row.device_category ?? row["device_category"] ?? "").trim();
      if (!deviceCategory) return;

      // Normalize device names: Desktop/PC -> Desktop, Mobile/Tablet -> Mobile
      let deviceName = deviceCategory;
      if (deviceCategory.includes("Desktop") || deviceCategory.includes("PC")) {
        deviceName = "Desktop";
      } else if (deviceCategory.includes("Mobile") || deviceCategory.includes("Tablet")) {
        deviceName = "Mobile";
      }

      const status = String(row.status ?? row["status"] ?? "").trim();
      const userCount = toNumber(row.user_count ?? row["user_count"]);

      if (!deviceDistributionMap.has(deviceName)) {
        deviceDistributionMap.set(deviceName, {
          device: deviceName,
          engagedCount: 0,
          exposedCount: 0,
          notExposedCount: 0,
        });
      }

      const deviceData = deviceDistributionMap.get(deviceName);
      // Match status to the expected keys (case-insensitive)
      if (status.toLowerCase() === "engaged") {
        deviceData.engagedCount += userCount;
      } else if (status.toLowerCase() === "exposed") {
        deviceData.exposedCount += userCount;
      } else if (status.toLowerCase().includes("not exposed")) {
        deviceData.notExposedCount += userCount;
      }
    });

    const deviceDistribution = Array.from(deviceDistributionMap.values()).map((deviceData) => {
      const pct = toPercentTriplet(deviceData.engagedCount, deviceData.exposedCount, deviceData.notExposedCount);
      return {
        device: deviceData.device,
        engaged: pct.engaged,
        exposed: pct.exposed,
        notExposed: pct.notExposed,
        engagedCount: deviceData.engagedCount,
        exposedCount: deviceData.exposedCount,
        notExposedCount: deviceData.notExposedCount,
        total: pct.total,
      };
    });

    // Chart 6 (Browser Distribution): aggregate by browser_category from new format
    // New format: date, device_type, browser_category, engaged_users, exposed_users, not_exposed_users, total_users
    // Aggregate across all dates and device types
    const browserDistributionMap = new Map();
    (browserRows || []).forEach((row) => {
      const browserCategory = String(row.browser_category ?? row["browser_category"] ?? "").trim();
      if (!browserCategory) return;

      const engagedUsers = toNumber(row.engaged_users ?? row["engaged_users"]);
      const exposedUsers = toNumber(row.exposed_users ?? row["exposed_users"]);
      const notExposedUsers = toNumber(row.not_exposed_users ?? row["not_exposed_users"]);

      if (!browserDistributionMap.has(browserCategory)) {
        browserDistributionMap.set(browserCategory, {
          browser: browserCategory,
          engagedCount: 0,
          exposedCount: 0,
          notExposedCount: 0,
        });
      }

      const browserData = browserDistributionMap.get(browserCategory);
      browserData.engagedCount += engagedUsers;
      browserData.exposedCount += exposedUsers;
      browserData.notExposedCount += notExposedUsers;
    });

    const browserDistribution = Array.from(browserDistributionMap.values()).map((browserData) => {
      const pct = toPercentTriplet(browserData.engagedCount, browserData.exposedCount, browserData.notExposedCount);
      return {
        browser: browserData.browser,
        engaged: pct.engaged,
        exposed: pct.exposed,
        notExposed: pct.notExposed,
        engagedCount: browserData.engagedCount,
        exposedCount: browserData.exposedCount,
        notExposedCount: browserData.notExposedCount,
        total: pct.total,
      };
    });

    return res.status(200).json({
      status: true,
      message: "Journey dashboard data fetched successfully",
      data: {
        s3: {
          bucket,
          window,
          keys,
        },
        overview: {
          client: {
            totalUsers: clientTotalUsers,
            addToCart: clientTotalAtc,
            purchase: clientTotalPurchase,
          },
          mprompto: {
            totalUsers: mpTotalUsers,
            engagedUsers: mpEngagedUsers,
            addToCart: mpAtc,
            purchase: mpPurchase,
            liftMultiplierAtc,
          },
        },
        journey,
        engagementTrend,
        conversionTrend,
        timeSpentTrend,
        deviceDistribution,
        browserDistribution,
      },
    });
  } catch (error) {
    console.error("Error fetching journey dashboard data:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch journey dashboard data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      data: null,
    });
  }
};

