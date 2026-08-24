import { getAdminSession, requireValidCsrf } from '../src/lib/adminAuth.js';
import {
  ApiRequestError,
  enforceRateLimit,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from '../src/lib/security.js';
import { buildPurchaseEmail } from './email-template.js';

const RESEND_API_URL = 'https://api.resend.com/emails';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEST_EMAIL_BODY_LIMIT_BYTES = 16 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  if (!(await enforceRateLimit(req, res, { name: 'send-test-email', limit: 5, windowSeconds: 60 }))) {
    return undefined;
  }

  const session = await getAdminSession(req);
  if (!session) {
    return sendJson(res, 401, { ok: false, message: 'Admin authorization required.' });
  }

  try {
    requireValidCsrf(req, session);
  } catch {
    return sendJson(res, 403, { ok: false, message: 'Invalid CSRF token.' });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 503, { ok: false, message: 'Email service is not configured.' });
  }

  let data;
  try {
    data = await readJsonBody(req, { maxBytes: TEST_EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : 'Invalid JSON payload.'
    });
  }

  if (!data?.customerEmail || !EMAIL_PATTERN.test(String(data.customerEmail).trim())) {
    return sendJson(res, 400, { ok: false, message: 'A valid customerEmail is required.' });
  }

  const email = {
    from: process.env.EDUREACH_FROM_EMAIL || 'EduReach <onboarding@resend.dev>',
    to: String(data.customerEmail).trim().toLowerCase(),
    subject: `${data.customerName ? String(data.customerName).slice(0, 100) : 'Your'} EduReach resource is ready to download`,
    html: buildPurchaseEmail(data),
  };

  try {
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
      console.error('Resend test purchase email failed.', { status: resendResponse.status, error: result });
      return sendJson(res, 502, { ok: false, message: 'Failed to send test email via email provider.' });
    }

    return sendJson(res, 200, { ok: true, id: result?.id });
  } catch (error) {
    console.error('Test purchase email handler error.', error);
    return sendJson(res, 502, { ok: false, message: 'Email sending failed due to a service error.' });
  }
}
