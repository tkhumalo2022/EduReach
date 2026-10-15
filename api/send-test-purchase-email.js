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
const BODY_LIMIT_BYTES = 16 * 1024;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  if (!(await enforceRateLimit(request, response, {
    name: "test-purchase-email",
    limit: 5,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  const session = await getAdminSession(request);
  const secretHeader = getRequestHeader(request, "x-edureach-admin-secret");
  const expectedSecret = process.env.EDUREACH_ADMIN_DEBUG_SECRET || process.env.EDUREACH_BACKEND_SECRET;
  const hasValidSecret = Boolean(
    expectedSecret && secretHeader && secretHeader === expectedSecret
  );

  if (!session && !hasValidSecret) {
    return sendJson(response, 401, {
      ok: false,
      message: "Unauthorized. Admin authentication is required to send test emails."
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
    data = await readJsonBody(request, { maxBytes: BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(response, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid request body."
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

    const result = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      console.error("Resend API request failed.", {
        status: resendResponse.status,
        error: result
      });
      return sendJson(response, 502, {
        ok: false,
        message: "Failed to send test purchase email."
      });
    }

    return sendJson(response, 200, { ok: true, id: result?.id });
  } catch (error) {
    console.error("Test purchase email delivery error:", error);
    return sendJson(response, 502, {
      ok: false,
      message: "Failed to send test purchase email."
    });
  }
}
