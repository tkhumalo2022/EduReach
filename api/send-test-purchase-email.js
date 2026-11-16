import { methodNotAllowed, sendJson } from '../src/lib/security.js';

// Legacy QA email sending must not be exposed on a public production API.
// The real paid-purchase notifications remain handled by the PayFast ITN flow.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  return sendJson(res, 410, {
    ok: false,
    message: 'The test purchase email endpoint is disabled.'
  });
}
