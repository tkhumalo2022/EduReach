import { buildPurchaseEmail } from './email-template.js';
import { getAdminSession, requireValidCsrf, AdminAuthError } from '../src/lib/adminAuth.js';
import {
  ApiRequestError,
  enforceRateLimit,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from '../src/lib/security.js';

const RESEND_API_URL = 'https://api.resend.com/emails';
const BODY_LIMIT_BYTES = 16 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  if (!(await enforceRateLimit(req, res, { name: 'send-test-email', limit: 5, windowSeconds: 60 }))) {
    return undefined;
  }

  try {
    const session = await getAdminSession(req);
    if (!session) {
      return sendJson(res, 401, { ok: false, message: 'Admin authentication required.' });
    }
    requireValidCsrf(req, session);

    if (!process.env.RESEND_API_KEY) {
      return sendJson(res, 503, { ok: false, message: 'Resend API key is not configured.' });
    }

    const data = await readJsonBody(req, { maxBytes: BODY_LIMIT_BYTES });
    if (!data.customerEmail) {
      return sendJson(res, 400, { ok: false, message: 'customerEmail is required.' });
    }

    const email = {
      from: process.env.EDUREACH_FROM_EMAIL || 'EduReach <onboarding@resend.dev>',
      to: data.customerEmail,
      subject: `${data.customerName || 'Your'} EduReach resource is ready to download`,
      html: buildPurchaseEmail(data),
    };

    const resendResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(email),
    });

    const result = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      console.error('Resend test email delivery failed.', { status: resendResponse.status });
      return sendJson(res, 502, { ok: false, message: 'Failed to send test email.' });
    }

    return sendJson(res, 200, { ok: true, id: result?.id });
  } catch (error) {
    if (error instanceof ApiRequestError || error instanceof AdminAuthError) {
      return sendJson(res, error.statusCode, { ok: false, message: error.message });
    }
    console.error('Test purchase email handler error:', error);
    return sendJson(res, 500, { ok: false, message: 'An internal error occurred.' });
  }
}
