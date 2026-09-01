## 2025-05-18 - Unauthenticated Email Relay Endpoint
**Vulnerability:** `api/send-test-purchase-email.js` allowed any unauthenticated client to issue POST requests to send emails using server Resend API credentials.
**Learning:** Development test endpoints in `api/` are compiled into public API routes by serverless platforms (Vercel) without implicit authentication.
**Prevention:** Always enforce admin authentication (`getAdminSession`) and rate limiting (`enforceRateLimit`) on all internal or test utility API handlers.
