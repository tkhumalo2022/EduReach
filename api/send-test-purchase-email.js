import { getAdminSession, requireValidCsrf } from "../src/lib/adminAuth.js";
import {
  ApiRequestError,
  enforceRateLimit,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from "../src/lib/security.js";
import { buildPurchaseEmail } from "./email-template.js";

const RESEND_API_URL = "https://api.resend.com/emails";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  if (
    !(await enforceRateLimit(request, response, {
      name: "send-test-purchase-email",
      limit: 10,
      windowSeconds: 60
    }))
  ) {
    return undefined;
  }

  const session = await getAdminSession(request);
  if (!session) {
    return sendJson(response, 401, {
      ok: false,
      message: "Admin authentication required."
    });
  }

  try {
    requireValidCsrf(request, session);
  } catch (error) {
    return sendJson(response, error.statusCode || 403, {
      ok: false,
      message: error.message || "Invalid CSRF token."
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(response, 503, {
      ok: false,
      message: "Email delivery service is not configured."
    });
  }

  let data;
  try {
    data = await readJsonBody(request, { maxBytes: 16384 });
  } catch (error) {
    return sendJson(response, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid request payload."
    });
  }

  if (!data.customerEmail) {
    return sendJson(response, 400, {
      ok: false,
      message: "customerEmail is required."
    });
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

    const result = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API request failed.", { status: resendResponse.status });
      return sendJson(response, 502, {
        ok: false,
        message: "Failed to send test purchase email."
      });
    }

    return sendJson(response, 200, { ok: true, id: result.id });
  } catch (error) {
    console.error("EduReach test purchase email error.", error);
    return sendJson(response, 500, {
      ok: false,
      message: "An unexpected error occurred while sending the email."
    });
  }
}
