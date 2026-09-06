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
const SEND_TEST_EMAIL_BODY_LIMIT_BYTES = 16 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  if (!(await enforceRateLimit(req, res, {
    name: "send-test-email",
    limit: 10,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  try {
    const session = await getAdminSession(req);
    if (!session) {
      return sendJson(res, 401, {
        ok: false,
        message: "Authentication required."
      });
    }
    requireValidCsrf(req, session);
  } catch (error) {
    return sendJson(res, error instanceof AdminAuthError ? error.statusCode : 403, {
      ok: false,
      message: error instanceof AdminAuthError ? error.message : "Forbidden request."
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 503, {
      ok: false,
      message: "Email service is not configured."
    });
  }

  let data;
  try {
    data = await readJsonBody(req, { maxBytes: SEND_TEST_EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid request payload."
    });
  }

  const customerEmail = String(data?.customerEmail || "").trim();
  if (!customerEmail) {
    return sendJson(res, 400, {
      ok: false,
      message: "customerEmail is required."
    });
  }

  const email = {
    from: process.env.EDUREACH_FROM_EMAIL || "EduReach <onboarding@resend.dev>",
    to: customerEmail,
    subject: `${data.customerName ? String(data.customerName).trim() : "Your"} EduReach resource is ready to download`,
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

    const result = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      console.error("Resend test purchase email failed.", {
        status: resendResponse.status,
        error: result?.message || result?.error
      });
      return sendJson(res, 502, {
        ok: false,
        message: "Email delivery failed."
      });
    }

    return sendJson(res, 200, { ok: true, id: result?.id });
  } catch (error) {
    console.error("Failed to send test purchase email.", error);
    return sendJson(res, 500, {
      ok: false,
      message: "Failed to send test purchase email."
    });
  }
}
