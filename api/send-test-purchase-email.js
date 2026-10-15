import { buildPurchaseEmail } from "./email-template.js";
import { getAdminSession } from "../src/lib/adminAuth.js";
import {
  ApiRequestError,
  enforceRateLimit,
  getRequestHeader,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from "../src/lib/security.js";

const RESEND_API_URL = "https://api.resend.com/emails";
const EMAIL_BODY_LIMIT_BYTES = 16 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const secretHeader = getRequestHeader(request, "x-edureach-secret");
  const backendSecret = process.env.EDUREACH_BACKEND_SECRET;
  const isAuthorizedSecret = Boolean(backendSecret && secretHeader === backendSecret);

  if (!session && !isAuthorizedSecret) {
    return sendJson(response, 401, {
      ok: false,
      message: "Authentication is required to send test purchase emails."
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(response, 503, {
      ok: false,
      message: "Missing RESEND_API_KEY in server environment variables."
    });
  }

  let body;
  try {
    body = await readJsonBody(request, { maxBytes: EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(response, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid email request payload."
    });
  }

  const customerEmail = String(body?.customerEmail || "").trim().toLowerCase();
  if (!customerEmail || !EMAIL_PATTERN.test(customerEmail)) {
    return sendJson(response, 400, {
      ok: false,
      message: "A valid customer email address is required."
    });
  }

  const email = {
    from: process.env.EDUREACH_FROM_EMAIL || "EduReach <onboarding@resend.dev>",
    to: customerEmail,
    subject: `${String(body.customerName || "Your").trim()} EduReach resource is ready to download`,
    html: buildPurchaseEmail(body)
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
      console.error("Resend API failed.", { status: resendResponse.status, result });
      return sendJson(response, 502, {
        ok: false,
        message: "Failed to send test email via Resend."
      });
    }

    return sendJson(response, 200, { ok: true, id: result?.id });
  } catch (error) {
    console.error("Test purchase email delivery failed.", error);
    return sendJson(response, 502, {
      ok: false,
      message: "Test email service is temporarily unavailable."
    });
  }
}
