import { buildPurchaseEmail } from './email-template.js';

const RESEND_API_URL = 'https://api.resend.com/emails';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY in Vercel environment variables' });
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
