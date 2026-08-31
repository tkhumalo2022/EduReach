import { getAdminSession } from '../src/lib/adminAuth.js';
import { enforceRateLimit, sendJson } from '../src/lib/security.js';
import { buildPurchaseEmail } from './email-template.js';

const RESEND_API_URL = 'https://api.resend.com/emails';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, error: 'Use POST' });
  }

  if (!(await enforceRateLimit(req, res, {
    name: "send-test-purchase-email",
    limit: 5,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  const session = await getAdminSession(req);
  if (!session) {
    return sendJson(res, 401, { ok: false, error: 'Unauthorized. Admin authentication required.' });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 500, { ok: false, error: 'Missing RESEND_API_KEY in Vercel environment variables' });
  }

  const data = req.body || {};
  if (!data.customerEmail) {
    return sendJson(res, 400, { ok: false, error: 'customerEmail is required' });
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
    return sendJson(res, resendResponse.status, { ok: false, error: 'Resend failed', details: result });
  }

  return sendJson(res, 200, { ok: true, id: result.id });
}
