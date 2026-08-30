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
const EMAIL_BODY_LIMIT_BYTES = 16 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  if (!(await enforceRateLimit(req, res, {
    name: "test-purchase-email",
    limit: 5,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  const session = await getAdminSession(req);
  if (!session) {
    return sendJson(res, 401, {
      ok: false,
      message: "Admin authentication required."
    });
  }

  try {
    requireValidCsrf(req, session);
  } catch (error) {
    return sendJson(res, error instanceof AdminAuthError ? error.statusCode : 403, {
      ok: false,
      message: error instanceof AdminAuthError ? error.message : "Invalid CSRF token."
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 503, {
      ok: false,
      message: "Email delivery service is not configured."
    });
  }

  let data;
  try {
    data = await readJsonBody(req, { maxBytes: EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid payload."
    });
  }

  const customerEmail = String(data?.customerEmail || "").trim().toLowerCase();
  if (!customerEmail || !EMAIL_PATTERN.test(customerEmail)) {
    return sendJson(res, 400, {
      ok: false,
      message: "A valid customer email is required."
    });
  }

  const email = {
    from: process.env.EDUREACH_FROM_EMAIL || "EduReach <onboarding@resend.dev>",
    to: customerEmail,
    subject: `${String(data.customerName || "Your").trim()} EduReach resource is ready to download`,
    html: buildPurchaseEmail({ ...data, customerEmail })
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

    const result = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      console.error("Resend test email failed.", {
        status: resendResponse.status,
        error: result?.message || result?.error
      });
      return sendJson(res, 502, {
        ok: false,
        message: "Email delivery failed. Please check provider logs."
      });
    }

    return sendJson(res, 200, { ok: true, id: result?.id });
  } catch (error) {
    console.error("Test purchase email request failed.", error);
    return sendJson(res, 502, {
      ok: false,
      message: "Email service request failed."
    });
  }
}
