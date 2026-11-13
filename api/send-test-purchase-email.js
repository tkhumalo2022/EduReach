import { buildPurchaseEmail } from './email-template.js';
import { AdminAuthError, getAdminSession, requireValidCsrf } from '../src/lib/adminAuth.js';
import { ApiRequestError, enforceRateLimit, methodNotAllowed, readJsonBody, sendJson } from '../src/lib/security.js';

const RESEND_API_URL = 'https://api.resend.com/emails';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  if (!(await enforceRateLimit(req, res, { name: 'test-email', limit: 5, windowSeconds: 60 }))) {
    return undefined;
  }

  const session = await getAdminSession(req);
  if (!session) {
    return sendJson(res, 401, { ok: false, message: 'Unauthorized admin access required.' });
  }

  try {
    requireValidCsrf(req, session);
  } catch (error) {
    return sendJson(res, error instanceof AdminAuthError ? error.statusCode : 403, {
      ok: false,
      message: 'This admin request could not be verified.'
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 500, { ok: false, message: 'Missing RESEND_API_KEY in Vercel environment variables.' });
  }

  let data;
  try {
    data = await readJsonBody(req, { maxBytes: 16384 });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : 'Invalid JSON payload.'
    });
  }

  const customerEmail = typeof data?.customerEmail === 'string' ? data.customerEmail.trim() : '';
  if (!customerEmail || customerEmail.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(customerEmail)) {
    return sendJson(res, 400, { ok: false, message: 'A valid customerEmail is required.' });
  }

  const customerName = String(data?.customerName || 'Your').replace(/[\r\n]+/g, ' ').trim().slice(0, 120) || 'Your';
  const email = {
    from: process.env.EDUREACH_FROM_EMAIL || 'EduReach <onboarding@resend.dev>',
    to: customerEmail,
    subject: `${customerName} EduReach resource is ready to download`,
    html: buildPurchaseEmail(data),
  };

  const resendResponse = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: ['Bearer', process.env.RESEND_API_KEY].join(' '),
    },
    body: JSON.stringify(email),
  });

  const result = await resendResponse.json();

  if (!resendResponse.ok) {
    return sendJson(res, resendResponse.status, { ok: false, message: 'Resend failed', details: result });
  }

  return sendJson(res, 200, { ok: true, id: result.id });
}
