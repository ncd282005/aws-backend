/* global process */
const Papa = require("papaparse");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../../config/s3Config");

const DEFAULT_BUCKET = process.env.DASHBOARD_DATA_BUCKET || "mongodatamprompt";
const DEFAULT_PREFIX = process.env.DASHBOARD_DATA_PREFIX || "dashboard_data/kesari";

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
      overview: `${prefix}/chart_1_overview.csv`,
      engagementTrend: `${prefix}/chart_2_engagement_trend.csv`,
      conversionTrend: `${prefix}/chart_3_conversion_trend.csv`,
      timeSpentTrend: `${prefix}/chart_4_time_spent_trend.csv`,
      deviceDistribution: `${prefix}/chart_5_device_distribution.csv`,
      browserDistribution: `${prefix}/chart_6_browser_distribution.csv`,
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

    // Chart 2 (Engagement Trend): map to existing keys { month, segment1, segment2, segment3 }
    // segment1=Not Exposed (red), segment2=Engaged (dark blue), segment3=Exposed (light grey)
    const engagementTrend = (engagementRows || []).map((row) => ({
      month: String(row.date || "").trim(),
      segment1: toNumber(row["Not Exposed"]),
      segment2: toNumber(row["Engaged"]),
      segment3: toNumber(row["Exposed"]),
    }));

    // Chart 3 (Conversion Trend): map to existing keys { month, cart, purchase, impact }
    // cart=Not Exposed ATC (red), purchase=Exposed ATC (light grey), impact=Engaged ATC (dark blue)
    const conversionTrend = (conversionRows || []).map((row) => ({
      month: String(row.date || "").trim(),
      cart: toNumber(row["Not Exposed ATC"]),
      purchase: toNumber(row["Exposed ATC"]),
      impact: toNumber(row["Engaged ATC"]),
    }));

    // Chart 4 (Time Spent Trend): existing UI expects { month, notExposed, exposed, engaged }
    const timeSpentTrend = (timeSpentRows || []).map((row) => ({
      month: String(row.date || "").trim(),
      engaged: toNumber(row["Engaged"]),
      exposed: toNumber(row["Exposed"]),
      notExposed: toNumber(row["Not Exposed"]),
    }));

    // Chart 5 (Device Distribution): existing UI expects percentages 0-100 for engaged/exposed/notExposed.
    // CSV provides counts; we return both % and raw counts for tooltips/labels.
    const deviceDistribution = (deviceRows || []).map((row) => {
      const engagedCount = toNumber(row["Engaged"]);
      const exposedCount = toNumber(row["Exposed"]);
      const notExposedCount = toNumber(row["Not Exposed"]);
      const pct = toPercentTriplet(engagedCount, exposedCount, notExposedCount);
      return {
        device: String(row.device || "").trim(),
        engaged: pct.engaged,
        exposed: pct.exposed,
        notExposed: pct.notExposed,
        engagedCount,
        exposedCount,
        notExposedCount,
        total: pct.total,
      };
    });

    // Chart 6 (Browser Distribution): existing UI expects percentages 0-100 for engaged/exposed/notExposed.
    // CSV headers vary in casing; normalize them.
    const browserDistribution = (browserRows || []).map((row) => {
      const engagedCount = toNumber(row.engaged ?? row.Engaged);
      const exposedCount = toNumber(row.exposed ?? row.Exposed);
      const notExposedCount = toNumber(row.notExposed ?? row["notExposed"] ?? row["Not Exposed"]);
      const pct = toPercentTriplet(engagedCount, exposedCount, notExposedCount);
      return {
        browser: String(row.browser || "").trim(),
        engaged: pct.engaged,
        exposed: pct.exposed,
        notExposed: pct.notExposed,
        engagedCount,
        exposedCount,
        notExposedCount,
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

