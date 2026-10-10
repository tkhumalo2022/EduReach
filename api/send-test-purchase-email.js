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
const TEST_EMAIL_BODY_LIMIT_BYTES = 16 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  if (!(await enforceRateLimit(req, res, { name: "test-email", limit: 5, windowSeconds: 60 }))) {
    return undefined;
  }

  const session = await getAdminSession(req);
  if (!session) {
    return sendJson(res, 401, { ok: false, message: "Unauthorized" });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 500, { ok: false, message: "Missing RESEND_API_KEY in environment variables." });
  }

  let data;
  try {
    data = await readJsonBody(req, { maxBytes: TEST_EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid test email request."
    });
  }

  if (!data.customerEmail) {
    return sendJson(res, 400, { ok: false, message: "customerEmail is required" });
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

    if (!resendResponse.ok) {
      console.error("Resend test purchase email failed.", { status: resendResponse.status });
      return sendJson(res, 502, { ok: false, message: "Resend email delivery failed." });
    }

    const result = await resendResponse.json().catch(() => null);
    return sendJson(res, 200, { ok: true, id: result?.id });
  } catch (error) {
    console.error("Test purchase email failed.", error);
    return sendJson(res, 502, { ok: false, message: "Test email service is temporarily unavailable." });
  }
}
