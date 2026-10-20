## 2025-05-10 - Protect Test Purchase Email Endpoint from Unauthenticated Relay
**Vulnerability:** `api/send-test-purchase-email.js` was accessible to unauthenticated callers, allowing arbitrary email dispatches using the server's Resend key.
**Learning:** Utility and test API endpoints in serverless functions can easily be overlooked as attack vectors for email relay or quota exhaustion if not protected by `getAdminSession` and rate limiting.
**Prevention:** Always verify that all administrative or test endpoints in `api/` require valid admin session checks (`getAdminSession`) and rate limiting (`enforceRateLimit`).
