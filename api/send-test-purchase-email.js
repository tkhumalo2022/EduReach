import crypto from 'node:crypto';
import { buildPurchaseEmail } from './email-template.js';
import { getAdminSession } from '../src/lib/adminAuth.js';
import {
  ApiRequestError,
  enforceRateLimit,
  getRequestHeader,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from '../src/lib/security.js';

const RESEND_API_URL = 'https://api.resend.com/emails';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEST_EMAIL_BODY_LIMIT_BYTES = 16 * 1024;

/**
 * Validates whether the supplied admin secret matches the expected secret using timing-safe comparison.
 */
function verifyAdminSecret(supplied, expected) {
  if (!supplied || !expected) return false;
  const suppliedBuffer = Buffer.from(String(supplied), 'utf8');
  const expectedBuffer = Buffer.from(String(expected), 'utf8');
  return suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export default async function handler(req, res) {
  // Security: Enforce HTTP method restriction to prevent improper method invocation.
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  // Security: Rate limiting prevents abuse and resource exhaustion of external Resend API credits.
  if (!(await enforceRateLimit(req, res, { name: 'test-email', limit: 5, windowSeconds: 60 }))) {
    return undefined;
  }

  // Security: Require an active admin session or a valid admin secret header to prevent arbitrary email relaying.
  const session = await getAdminSession(req);
  const suppliedSecret = getRequestHeader(req, 'x-edureach-admin-secret');
  const expectedSecret = process.env.EDUREACH_BACKEND_SECRET || process.env.EDUREACH_ADMIN_DEBUG_SECRET;
  const isSecretValid = verifyAdminSecret(suppliedSecret, expectedSecret);

  if (!session && !isSecretValid) {
    return sendJson(res, 401, { ok: false, error: 'Unauthorized admin access required.' });
  }

  let data;
  try {
    data = await readJsonBody(req, { maxBytes: TEST_EMAIL_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(res, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      error: error instanceof ApiRequestError ? error.message : 'Invalid request payload'
    });
  }

  // Security: Validate customer email format and reject empty/invalid targets.
  const recipientEmail = String(data?.customerEmail || '').trim();
  if (!recipientEmail || !EMAIL_PATTERN.test(recipientEmail)) {
    return sendJson(res, 400, { ok: false, error: 'Valid customerEmail is required' });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 500, { ok: false, error: 'Missing RESEND_API_KEY in environment variables' });
  }

  const email = {
    from: process.env.EDUREACH_FROM_EMAIL || 'EduReach <onboarding@resend.dev>',
    to: recipientEmail,
    subject: `${data.customerName || 'Your'} EduReach resource is ready to download`,
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

    const result = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      return sendJson(res, resendResponse.status, { ok: false, error: 'Resend failed', details: result });
    }

    return sendJson(res, 200, { ok: true, id: result.id });
  } catch (error) {
    return sendJson(res, 502, { ok: false, error: 'Failed to communicate with Resend API' });
  }
}
