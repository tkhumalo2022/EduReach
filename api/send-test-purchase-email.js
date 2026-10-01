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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  if (!(await enforceRateLimit(req, res, { name: "admin-email", limit: 10, windowSeconds: 60 }))) {
    return undefined;
  }

  try {
    const session = await getAdminSession(req);
    if (!session) {
      return sendJson(res, 401, { ok: false, message: "Unauthorized admin request." });
    }
    requireValidCsrf(req, session);
  } catch (error) {
    return sendJson(res, error instanceof AdminAuthError ? error.statusCode : 403, {
      ok: false,
      message: error instanceof AdminAuthError ? error.message : "CSRF validation failed."
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 503, { ok: false, message: "Email delivery service is not configured." });
  }

  let data;
  try {
    data = await readJsonBody(req, { maxBytes: 16 * 1024 });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid payload."
    });
  }

  if (!data?.customerEmail) {
    return sendJson(res, 400, { ok: false, message: "customerEmail is required." });
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

    const result = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      console.error("Resend API request failed.", { status: resendResponse.status });
      return sendJson(res, 502, { ok: false, message: "Test email sending failed." });
    }

    return sendJson(res, 200, { ok: true, id: result?.id });
  } catch (error) {
    console.error("Test email handler error.", error);
    return sendJson(res, 502, { ok: false, message: "Test email service is unavailable." });
  }
}
