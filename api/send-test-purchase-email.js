import { buildPurchaseEmail } from "./email-template.js";
import { AdminAuthError, getAdminSession, requireValidCsrf } from "../src/lib/adminAuth.js";
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
    name: "send-test-email",
    limit: 5,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  try {
    const session = await getAdminSession(req);
    if (!session) {
      return sendJson(res, 401, { error: "Admin authentication required" });
    }
    requireValidCsrf(req, session);
  } catch (error) {
    return sendJson(res, error instanceof AdminAuthError ? error.statusCode : 403, {
      error: error instanceof AdminAuthError ? error.message : "Invalid CSRF token"
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 500, { error: "Missing RESEND_API_KEY in Vercel environment variables" });
  }

  let data;
  try {
    data = await readJsonBody(req, { maxBytes: TEST_EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      error: error instanceof ApiRequestError ? error.message : "Invalid JSON payload"
    });
  }

  if (!data.customerEmail) {
    return sendJson(res, 400, { error: "customerEmail is required" });
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
        Authorization: ["Bearer", process.env.RESEND_API_KEY].join(" ")
      },
      body: JSON.stringify(email)
    });

    const result = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      return sendJson(res, resendResponse.status, { error: "Resend failed", details: result });
    }

    return sendJson(res, 200, { ok: true, id: result.id });
  } catch (error) {
    return sendJson(res, 502, {
      error: error instanceof Error ? error.message : "Failed to send test purchase email"
    });
  }
}
