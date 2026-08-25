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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  if (!(await enforceRateLimit(req, res, { name: "test-email", limit: 5, windowSeconds: 60 }))) {
    return undefined;
  }

  const session = await getAdminSession(req);
  const adminSecret = process.env.EDUREACH_ADMIN_DEBUG_SECRET || process.env.EDUREACH_BACKEND_SECRET;
  const suppliedSecret = getRequestHeader(req, "x-edureach-admin-secret");
  const isSecretValid = Boolean(adminSecret && suppliedSecret && suppliedSecret === adminSecret);

  if (!session && !isSecretValid) {
    return sendJson(res, 401, { ok: false, message: "Unauthorized: Admin authentication required." });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 503, { ok: false, message: "Missing RESEND_API_KEY in server environment." });
  }

  let data;
  try {
    data = await readJsonBody(req, { maxBytes: 16 * 1024 });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid request payload."
    });
  }

  if (!data?.customerEmail) {
    return sendJson(res, 400, { ok: false, message: "customerEmail is required." });
  }

  const email = {
    from: process.env.EDUREACH_EMAIL_FROM || process.env.EDUREACH_FROM_EMAIL || "EduReach <onboarding@resend.dev>",
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
      console.error("Resend test email failed.", { status: resendResponse.status, result });
      return sendJson(res, 502, { ok: false, message: "Failed to send test email." });
    }

    return sendJson(res, 200, { ok: true, id: result?.id });
  } catch (error) {
    console.error("Test email sending failed.", error);
    return sendJson(res, 502, { ok: false, message: "Failed to send test email." });
  }
}
