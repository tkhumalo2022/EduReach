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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Security: Require admin authentication, rate limiting, and input validation to prevent email relay abuse.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  if (!(await enforceRateLimit(req, res, { name: "admin-test-email", limit: 5, windowSeconds: 60 }))) {
    return undefined;
  }

  try {
    const session = await getAdminSession(req);
    if (!session) {
      return sendJson(res, 401, { ok: false, message: "Admin authentication required." });
    }
    requireValidCsrf(req, session);

    if (!process.env.RESEND_API_KEY) {
      return sendJson(res, 503, { ok: false, message: "Email delivery service is not configured." });
    }

    const data = await readJsonBody(req, { maxBytes: 8192 });
    const customerEmail = String(data.customerEmail || "").trim().toLowerCase();

    if (!customerEmail || !EMAIL_PATTERN.test(customerEmail)) {
      return sendJson(res, 400, { ok: false, message: "A valid customer email address is required." });
    }

    const email = {
      from: process.env.EDUREACH_EMAIL_FROM || process.env.EDUREACH_FROM_EMAIL || "EduReach <onboarding@resend.dev>",
      to: customerEmail,
      subject: `${String(data.customerName || "Your").trim()} EduReach resource is ready to download`,
      html: buildPurchaseEmail(data)
    };

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
      return sendJson(res, 502, { ok: false, message: "Resend email delivery failed." });
    }

    return sendJson(res, 200, { ok: true, id: result.id });
  } catch (error) {
    const status = error instanceof AdminAuthError || error instanceof ApiRequestError ? error.statusCode : 500;
    return sendJson(res, status, { ok: false, message: error.message || "An unexpected error occurred." });
  }
}
