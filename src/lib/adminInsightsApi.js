import crypto from "node:crypto";
import { getAdminSession } from "./adminAuth.js";
import { sendJson } from "./security.js";

const GA4_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GA4_DATA_ORIGIN = "https://analyticsdata.googleapis.com";
const DOMAIN_FILTER = {
  filter: {
    fieldName: "hostName",
    stringFilter: { matchType: "FULL_REGEXP", value: "(www\\.)?edureach\\.network", caseSensitive: false }
  }
};

export function ga4Configured(env = process.env) {
  return /^\d{5,20}$/.test(String(env.EDUREACH_GA4_PROPERTY_ID || "").trim()) &&
    /^[^\s@]+@[^\s@]+$/.test(String(env.EDUREACH_GA4_CLIENT_EMAIL || "").trim()) &&
    String(env.EDUREACH_GA4_PRIVATE_KEY || "").includes("BEGIN PRIVATE KEY");
}

function toBase64Url(value) {
  return Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
}

async function postJson(url, body, authorization) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: "POST",
      redirect: "error",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: "Bearer " + authorization } : {})
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error("Analytics upstream unavailable: " + response.status);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function ga4AccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url({ alg: "RS256", typ: "JWT" });
  const claims = toBase64Url({
    iss: env.EDUREACH_GA4_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: GA4_TOKEN_URL,
    iat: now,
    exp: now + 1800
  });
  const unsigned = header + "." + claims;
  const key = String(env.EDUREACH_GA4_PRIVATE_KEY).replace(/\\n/g, "\n");
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), key).toString("base64url");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(GA4_TOKEN_URL, {
      method: "POST",
      redirect: "error",
      signal: controller.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: unsigned + "." + signature
      })
    });
    if (!response.ok) throw new Error("Google Analytics authentication unavailable.");
    const data = await response.json();
    if (!data.access_token) throw new Error("Google Analytics token missing.");
    return String(data.access_token);
  } finally {
    clearTimeout(timer);
  }
}

function reportBody(metrics, dimension, limit = 10) {
  return {
    dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }],
    metrics: metrics.map(name => ({ name })),
    ...(dimension ? {
      dimensions: [{ name: dimension }],
      orderBys: [{ metric: { metricName: metrics[0] }, desc: true }],
      limit: String(limit)
    } : {}),
    dimensionFilter: DOMAIN_FILTER
  };
}

export function safeGa4Report(summary, pages, events) {
  const metric = (row, n) => {
    const value = Number(row?.metricValues?.[n]?.value);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  };
  const total = summary?.rows?.[0];
  const safePages = (pages?.rows || [])
    .map(row => ({ path: String(row.dimensionValues?.[0]?.value || "").slice(0, 160), views: metric(row, 0) }))
    .filter(row => row.path.startsWith("/") && !row.path.startsWith("//") && !/^\/(?:admin|api|checkout|payment-)/.test(row.path));
  const acceptedEvents = new Set(["generate_lead", "select_content", "add_to_cart", "begin_checkout", "purchase"]);
  const safeEvents = (events?.rows || [])
    .map(row => ({ name: String(row.dimensionValues?.[0]?.value || ""), count: metric(row, 0) }))
    .filter(row => acceptedEvents.has(row.name));
  return {
    days: 28,
    dateLabel: "Last 28 days (through yesterday)",
    visitors: metric(total, 0),
    sessions: metric(total, 1),
    pageViews: metric(total, 2),
    engagedSessions: metric(total, 3),
    interactions: safeEvents.reduce((sum, event) => sum + event.count, 0),
    pages: safePages.slice(0, 8),
    events: safeEvents
  };
}

export default async function handleInsightsApi(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.method !== "GET") return sendJson(res, 405, { ok: false, message: "Method not allowed." });

  let session;
  try { session = await getAdminSession(req); }
  catch { return sendJson(res, 503, { ok: false, message: "Admin session unavailable." }); }
  if (!session) return sendJson(res, 401, { ok: false, message: "Sign in to view website analytics." });

  if (!ga4Configured()) {
    return sendJson(res, 200, {
      ok: true, connected: false,
      message: "Traffic reporting is not connected. Link an EduReach Google Analytics 4 property to show verified data."
    });
  }

  try {
    const env = process.env;
    const token = await ga4AccessToken(env);
    const propertyId = String(env.EDUREACH_GA4_PROPERTY_ID).trim();
    const endpoint = GA4_DATA_ORIGIN + "/v1beta/properties/" + propertyId + ":runReport";
    const call = body => postJson(endpoint, body, token);
    const [summary, pages, events] = await Promise.all([
      call(reportBody(["activeUsers", "sessions", "screenPageViews", "engagedSessions"])),
      call(reportBody(["screenPageViews"], "pagePath", 20)),
      call(reportBody(["eventCount"], "eventName", 30))
    ]);
    return sendJson(res, 200, { ok: true, connected: true, report: safeGa4Report(summary, pages, events) });
  } catch {
    return sendJson(res, 502, {
      ok: false, connected: false,
      message: "Traffic reporting cannot be reached. Check the GA4 property and read-only account access."
    });
  }
}
