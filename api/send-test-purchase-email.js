import { buildPurchaseEmail } from "./email-template.js";
import { getAdminSession, requireValidCsrf } from "../src/lib/adminAuth.js";
import {
  ApiRequestError,
  enforceRateLimit,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from "../src/lib/security.js";

const RESEND_API_URL = "https://api.resend.com/emails";
const TEST_EMAIL_BODY_LIMIT_BYTES = 16 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  if (!(await enforceRateLimit(req, res, {
    name: "admin-test-email",
    limit: 5,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  const session = await getAdminSession(req);
  if (!session) {
    return sendJson(res, 401, { ok: false, error: "Admin authentication required." });
  }

  try {
    requireValidCsrf(req, session);
  } catch {
    return sendJson(res, 403, { ok: false, error: "CSRF verification failed." });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 500, { ok: false, error: "Missing RESEND_API_KEY in environment variables." });
  }

  let data;
  try {
    data = await readJsonBody(req, { maxBytes: TEST_EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      error: error instanceof ApiRequestError ? error.message : "Invalid request body."
    });
  }

  if (!data.customerEmail) {
    return sendJson(res, 400, { ok: false, error: "customerEmail is required." });
  }

  const email = {
    from: process.env.EDUREACH_FROM_EMAIL || "EduReach <onboarding@resend.dev>",
    to: data.customerEmail,
    subject: `${data.customerName || "Your"} EduReach resource is ready to download`,
    html: buildPurchaseEmail(data)
  };

  try {
    const resendResponse = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify(email)
    });

    const result = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      return sendJson(res, resendResponse.status, { ok: false, error: "Resend failed", details: result });
    }

    return sendJson(res, 200, { ok: true, id: result.id });
  } catch (error) {
    console.error("Test purchase email dispatch failed.", error);
    return sendJson(res, 502, { ok: false, error: "Failed to reach email service." });
  }
}
