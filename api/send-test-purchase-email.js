import crypto from "node:crypto";
import { buildPurchaseEmail } from "./email-template.js";
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

function timingSafeMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyEmailToken(request) {
  const configuredToken = process.env.EDUREACH_EMAIL_TOKEN;
  if (!configuredToken) {
    return { configured: false, valid: false };
  }

  const rawHeaderToken =
    getRequestHeader(request, "x-edureach-email-token") ||
    String(getRequestHeader(request, "authorization") || "").replace(/^Bearer\s+/i, "");

  const valid = timingSafeMatch(String(rawHeaderToken || "").trim(), configuredToken.trim());
  return { configured: true, valid };
}

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

  const tokenStatus = verifyEmailToken(request);
  if (!tokenStatus.configured) {
    return sendJson(response, 503, {
      ok: false,
      message: "Test email endpoint is not configured."
    });
  }

  if (!tokenStatus.valid) {
    return sendJson(response, 401, {
      ok: false,
      message: "Unauthorized: Invalid email test token."
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(response, 503, {
      ok: false,
      message: "Missing RESEND_API_KEY configuration."
    });
  }

  let body;
  try {
    body = await readJsonBody(request, { maxBytes: EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(response, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid request payload."
    });
  }

  const customerEmail = String(body.customerEmail || "").trim().toLowerCase();
  if (!customerEmail || !EMAIL_PATTERN.test(customerEmail)) {
    return sendJson(response, 400, {
      ok: false,
      message: "A valid customerEmail is required."
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

    const result = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error("Resend API rejected test email request", {
        status: resendResponse.status
      });
      return sendJson(response, 502, {
        ok: false,
        message: "Email delivery failed."
      });
    }

    return sendJson(response, 200, { ok: true, id: result.id });
  } catch (error) {
    console.error("Test purchase email handler error", error);
    return sendJson(response, 502, {
      ok: false,
      message: "Email delivery service temporarily unavailable."
    });
  }
}
