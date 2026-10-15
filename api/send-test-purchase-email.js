import { buildPurchaseEmail } from "./email-template.js";
import { getAdminSession } from "../src/lib/adminAuth.js";
import {
  ApiRequestError,
  enforceRateLimit,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from "../src/lib/security.js";

const RESEND_API_URL = "https://api.resend.com/emails";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

  const session = await getAdminSession(req);
  if (!session) {
    return sendJson(res, 401, {
      ok: false,
      message: "Admin authentication is required."
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 503, {
      ok: false,
      message: "Resend email service is not configured."
    });
  }

  let body;
  try {
    body = await readJsonBody(req, { maxBytes: TEST_EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid email request."
    });
  }

  const customerEmail = String(body?.customerEmail || "").trim().toLowerCase();
  if (!customerEmail || !EMAIL_PATTERN.test(customerEmail)) {
    return sendJson(res, 400, {
      ok: false,
      message: "A valid customer email address is required."
    });
  }

  const email = {
    from: process.env.EDUREACH_FROM_EMAIL || "EduReach <onboarding@resend.dev>",
    to: customerEmail,
    subject: `${body.customerName || "Your"} EduReach resource is ready to download`,
    html: buildPurchaseEmail({ ...body, customerEmail })
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
      console.error("Resend test purchase email failed.", { status: resendResponse.status });
      return sendJson(res, 502, {
        ok: false,
        message: "Failed to send test email through email service."
      });
    }

    const result = await resendResponse.json().catch(() => ({}));
    return sendJson(res, 200, { ok: true, id: result.id });
  } catch (error) {
    console.error("EduReach send test email request failed.", error);
    return sendJson(res, 502, {
      ok: false,
      message: "Failed to send test email due to a network error."
    });
  }
}
