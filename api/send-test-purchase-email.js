import { buildPurchaseEmail } from './email-template.js';
import { getAdminSession } from '../src/lib/adminAuth.js';
import {
  ApiRequestError,
  enforceRateLimit,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from '../src/lib/security.js';

const RESEND_API_URL = 'https://api.resend.com/emails';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  // Security: Require active admin session for sending test emails
  const session = await getAdminSession(req);
  if (!session) {
    return sendJson(res, 401, { ok: false, message: 'Admin authorization required.' });
  }

  // Security: Rate limit request frequency to prevent abuse
  if (!(await enforceRateLimit(req, res, { name: 'send-test-email', limit: 5, windowSeconds: 60 }))) {
    return undefined;
  }

  let data;
  try {
    data = await readJsonBody(req, { maxBytes: 8192 });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : 'Invalid test email payload.'
    });
  }

  const customerEmail = String(data?.customerEmail || '').trim().toLowerCase();
  if (!customerEmail || !EMAIL_PATTERN.test(customerEmail)) {
    return sendJson(res, 400, { ok: false, message: 'Valid customerEmail is required.' });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 500, { ok: false, message: 'Missing RESEND_API_KEY in environment variables.' });
  }

  const email = {
    from: process.env.EDUREACH_FROM_EMAIL || 'EduReach <onboarding@resend.dev>',
    to: customerEmail,
    subject: `${data.customerName || 'Your'} EduReach resource is ready to download`,
    html: buildPurchaseEmail(data),
  };

  try {
    const resendResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ['Bearer', process.env.RESEND_API_KEY].join(' '),
      },
      body: JSON.stringify(email),
    });

    const result = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      console.error('Resend test email failed:', { status: resendResponse.status, result });
      // Security: Do not expose raw third-party error details to client
      return sendJson(res, 502, { ok: false, message: 'Resend email delivery failed.' });
    }

    return sendJson(res, 200, { ok: true, id: result?.id });
  } catch (error) {
    console.error('Test purchase email error:', error);
    return sendJson(res, 502, { ok: false, message: 'Email service failed.' });
  }
}
