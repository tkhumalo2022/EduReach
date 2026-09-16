import { getAdminSession, requireValidCsrf } from "../src/lib/adminAuth.js";
import { buildPurchaseEmail } from "./email-template.js";
import {
  ApiRequestError,
  enforceRateLimit,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from "../src/lib/security.js";

const RESEND_API_URL = "https://api.resend.com/emails";
const EMAIL_BODY_LIMIT_BYTES = 16 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  if (!(await enforceRateLimit(req, res, {
    name: "admin-email-test",
    limit: 5,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  try {
    const session = await getAdminSession(req);
    if (!session) {
      return sendJson(res, 401, {
        ok: false,
        message: "Unauthorized. Admin access required."
      });
    }
    requireValidCsrf(req, session);
  } catch (error) {
    return sendJson(res, error.statusCode || 401, {
      ok: false,
      message: error.message || "Unauthorized."
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
    data = await readJsonBody(req, { maxBytes: EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid request payload."
    });
  }

  if (!data.customerEmail) {
    return sendJson(res, 400, {
      ok: false,
      message: "customerEmail is required."
    });
  }

  const email = {
    from: process.env.EDUREACH_FROM_EMAIL || "EduReach <onboarding@resend.dev>",
    to: String(data.customerEmail).trim().toLowerCase(),
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

    if (!resendResponse.ok) {
      const result = await resendResponse.json().catch(() => null);
      console.error("Resend test email failed.", {
        status: resendResponse.status,
        error: result?.message
      });
      return sendJson(res, 502, {
        ok: false,
        message: "Failed to send test email."
      });
    }

    const result = await resendResponse.json().catch(() => ({}));
    return sendJson(res, 200, { ok: true, id: result.id });
  } catch (error) {
    console.error("Test email handler failed.", error);
    return sendJson(res, 502, {
      ok: false,
      message: "Email service failed."
    });
  }
}
