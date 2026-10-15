import { buildPurchaseEmail } from './email-template.js';
import { getAdminSession } from '../src/lib/adminAuth.js';
import { enforceRateLimit, readJsonBody, sendJson } from '../src/lib/security.js';

const RESEND_API_URL = 'https://api.resend.com/emails';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Use POST' });
  }

  if (!(await enforceRateLimit(req, res, { name: 'send-test-email', limit: 5, windowSeconds: 60 }))) {
    return undefined;
  }

  const session = await getAdminSession(req);
  if (!session) {
    return sendJson(res, 401, { error: 'Unauthorized: Admin authentication required' });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 500, { error: 'Missing RESEND_API_KEY in Vercel environment variables' });
  }

  let data;
  try {
    data = await readJsonBody(req, { maxBytes: 16384 });
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { error: error.message || 'Invalid payload' });
  }

  if (!data.customerEmail) {
    return sendJson(res, 400, { error: 'customerEmail is required' });
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

  const result = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    return sendJson(res, resendResponse.status, { error: 'Resend failed', details: result });
  }

  return sendJson(res, 200, { ok: true, id: result.id });
}
