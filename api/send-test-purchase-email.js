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
const SEND_TEST_EMAIL_BODY_LIMIT_BYTES = 16 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  // Security: Enforce rate limiting to protect email endpoint against abuse
  if (!(await enforceRateLimit(req, res, {
    name: "send-test-email",
    limit: 5,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  // Security: Restrict test email sending to authenticated admin sessions only
  const session = await getAdminSession(req);
  if (!session) {
    return sendJson(res, 401, {
      ok: false,
      error: "Admin authentication required."
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 500, {
      ok: false,
      error: "Missing RESEND_API_KEY in Vercel environment variables"
    });
  }

  let data;
  try {
    data = await readJsonBody(req, { maxBytes: SEND_TEST_EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      error: error instanceof ApiRequestError ? error.message : "Invalid request body."
    });
  }

  if (!data?.customerEmail) {
    return sendJson(res, 400, {
      ok: false,
      error: "customerEmail is required"
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
        Authorization: ["Bearer", process.env.RESEND_API_KEY].join(" ")
      },
      body: JSON.stringify(email)
    });

    const result = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      return sendJson(res, resendResponse.status, {
        ok: false,
        error: "Resend failed",
        details: result
      });
    }

    return sendJson(res, 200, { ok: true, id: result.id });
  } catch (error) {
    console.error("Test purchase email dispatch failed.", error);
    return sendJson(res, 502, {
      ok: false,
      error: "Email delivery failed."
    });
  }
}
