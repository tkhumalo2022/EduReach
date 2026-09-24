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

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  if (!(await enforceRateLimit(request, response, {
    name: "admin-test-email",
    limit: 5,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  try {
    const session = await getAdminSession(request);
    if (!session) {
      return sendJson(response, 401, { ok: false, message: "Authentication required." });
    }
    requireValidCsrf(request, session);
  } catch (error) {
    return sendJson(response, error instanceof AdminAuthError ? error.statusCode : 403, {
      ok: false,
      message: error instanceof AdminAuthError ? error.message : "Access denied."
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(response, 500, {
      ok: false,
      message: "The email service is not configured yet."
    });
  }

  let body;
  try {
    body = await readJsonBody(request, { maxBytes: TEST_EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(response, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid email request payload."
    });
  }

  if (!body?.customerEmail) {
    return sendJson(response, 400, { ok: false, message: "customerEmail is required." });
  }

  const email = {
    from: process.env.EDUREACH_FROM_EMAIL || "EduReach <onboarding@resend.dev>",
    to: body.customerEmail,
    subject: `${body.customerName || "Your"} EduReach resource is ready to download`,
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
      console.error("Resend test email failed.", {
        status: resendResponse.status,
        error: result?.message || result?.error
      });
      return sendJson(response, 502, { ok: false, message: "Failed to send test email." });
    }

    return sendJson(response, 200, { ok: true, id: result?.id });
  } catch (error) {
    console.error("Test email handler error.", error);
    return sendJson(response, 502, { ok: false, message: "Test email service is unavailable." });
  }
}
