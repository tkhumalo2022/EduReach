import { buildPurchaseEmail } from './email-template.js';
import { getAdminSession, requireValidCsrf } from '../src/lib/adminAuth.js';
import {
  enforceRateLimit,
  methodNotAllowed,
  sendJson
} from '../src/lib/security.js';

const RESEND_API_URL = 'https://api.resend.com/emails';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  if (!(await enforceRateLimit(req, res, {
    name: 'send-test-email',
    limit: 5,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  try {
    const session = await getAdminSession(req);
    if (!session) {
      return sendJson(res, 401, {
        ok: false,
        message: 'Admin authorization required.'
      });
    }

    requireValidCsrf(req, session);
  } catch (error) {
    return sendJson(res, error.statusCode || 403, {
      ok: false,
      message: error.message || 'Forbidden.'
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 500, {
      ok: false,
      message: 'Missing RESEND_API_KEY in Vercel environment variables'
    });
  }

  const data = req.body || {};
  if (!data.customerEmail) {
    return sendJson(res, 400, {
      ok: false,
      message: 'customerEmail is required'
    });
  }

  const email = {
    from: process.env.EDUREACH_FROM_EMAIL || 'EduReach <onboarding@resend.dev>',
    to: data.customerEmail,
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
      return sendJson(res, 502, {
        ok: false,
        message: 'Resend email request failed.'
      });
    }

    return sendJson(res, 200, { ok: true, id: result?.id });
  } catch {
    return sendJson(res, 502, {
      ok: false,
      message: 'Failed to send test email.'
    });
  }
}
