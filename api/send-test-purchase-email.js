import crypto from "node:crypto";
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
const TEST_EMAIL_BODY_LIMIT_BYTES = 8 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  if (!(await enforceRateLimit(req, res, {
    name: "test-email",
    limit: 5,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  if (!(await isAuthorizedAdmin(req))) {
    return sendJson(res, 401, {
      ok: false,
      message: "Unauthorized."
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 503, {
      ok: false,
      message: "Email delivery service is not configured."
    });
  }

  let data;
  try {
    data = await readJsonBody(req, { maxBytes: TEST_EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid payload."
    });
  }

  if (!data?.customerEmail) {
    return sendJson(res, 400, {
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

    const result = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      console.error("Resend email delivery failed.", { status: resendResponse.status });
      return sendJson(res, 502, {
        ok: false,
        message: "Failed to send test email."
      });
    }

    return sendJson(res, 200, { ok: true, id: result?.id });
  } catch (error) {
    console.error("Test email endpoint error.", error);
    return sendJson(res, 502, {
      ok: false,
      message: "Email delivery service unavailable."
    });
  }
}

async function isAuthorizedAdmin(req) {
  const session = await getAdminSession(req);
  if (session) return true;

  const secret = process.env.EDUREACH_ADMIN_DEBUG_SECRET || process.env.EDUREACH_BACKEND_SECRET;
  const supplied =
    getRequestHeader(req, "x-edureach-admin-secret") ||
    getRequestHeader(req, "x-edureach-backend-secret");

  if (secret && supplied) {
    const secretBuf = Buffer.from(secret, "utf8");
    const suppliedBuf = Buffer.from(supplied, "utf8");
    if (secretBuf.length === suppliedBuf.length && crypto.timingSafeEqual(secretBuf, suppliedBuf)) {
      return true;
    }
  }

  return false;
}
