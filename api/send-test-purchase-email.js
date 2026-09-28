import { buildPurchaseEmail } from './email-template.js';
import { AdminAuthError, getAdminSession, requireValidCsrf } from '../src/lib/adminAuth.js';
import { sendJson } from '../src/lib/security.js';

const RESEND_API_URL = 'https://api.resend.com/emails';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Use POST' });
  }

  const session = await getAdminSession(req);
  if (!session) {
    return sendJson(res, 401, { ok: false, error: 'Admin authentication required' });
  }

  try {
    requireValidCsrf(req, session);
  } catch (error) {
    return sendJson(res, error instanceof AdminAuthError ? error.statusCode : 403, {
      ok: false,
      error: error instanceof AdminAuthError ? error.message : 'CSRF validation failed'
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 500, { error: 'Missing RESEND_API_KEY in Vercel environment variables' });
  }

  const data = req.body || {};
  if (!data.customerEmail) {
    return res.status(400).json({ error: 'customerEmail is required' });
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
      Authorization: ['Bearer', process.env.RESEND_API_KEY].join(' '),
    },
    body: JSON.stringify(email),
  });

  const result = await resendResponse.json();

  if (!resendResponse.ok) {
    return res.status(resendResponse.status).json({ error: 'Resend failed', details: result });
  }

  return res.status(200).json({ ok: true, id: result.id });
}
