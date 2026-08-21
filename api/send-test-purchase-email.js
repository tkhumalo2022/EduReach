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
const TEST_EMAIL_BODY_LIMIT_BYTES = 16 * 1024;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  if (!(await enforceRateLimit(request, response, {
    name: "send-test-email",
    limit: 5,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  const session = await getAdminSession(request);
  if (!session) {
    return sendJson(response, 401, {
      ok: false,
      message: "Authentication required."
    });
  }

  try {
    requireValidCsrf(request, session);
  } catch (error) {
    return sendJson(response, error instanceof AdminAuthError ? error.statusCode : 403, {
      ok: false,
      message: error instanceof AdminAuthError ? error.message : "CSRF validation failed."
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(response, 503, {
      ok: false,
      message: "Email service is not configured."
    });
  }

  let data;
  try {
    data = await readJsonBody(request, { maxBytes: TEST_EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(response, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid request payload."
    });
  }

  const customerEmail = String(data?.customerEmail || "").trim().toLowerCase();
  if (!customerEmail || !EMAIL_PATTERN.test(customerEmail)) {
    return sendJson(response, 400, {
      ok: false,
      message: "A valid customer email address is required."
    });
  }

  const customerName = String(data?.customerName || "Your").trim().slice(0, 100);
  const email = {
    from: process.env.EDUREACH_FROM_EMAIL || "EduReach <onboarding@resend.dev>",
    to: customerEmail,
    subject: `${customerName} EduReach resource is ready to download`,
    html: buildPurchaseEmail({ ...data, customerEmail, customerName })
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
      console.error("Resend API rejected test purchase email request.", {
        status: resendResponse.status,
        message: result?.message || result?.error?.message
      });
      return sendJson(response, 502, {
        ok: false,
        message: "Email delivery failed."
      });
    }

    return sendJson(response, 200, { ok: true, id: result?.id });
  } catch (error) {
    console.error("Test purchase email sending failed.", error);
    return sendJson(response, 502, {
      ok: false,
      message: "Email delivery failed."
    });
  }
}
