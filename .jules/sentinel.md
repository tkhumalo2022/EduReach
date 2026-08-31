## 2025-05-20 - Unauthenticated Serverless Email Relay Endpoint
**Vulnerability:** `api/send-test-purchase-email.js` was exposed as a public Vercel Serverless Function without admin authentication, CSRF validation, or rate limiting, allowing arbitrary actors to send emails using the server's Resend API key (`RESEND_API_KEY`).
**Learning:** Placing test or utility scripts under Vercel's `api/` directory automatically exposes them as public HTTP endpoints unless protected by server-side session checks (`getAdminSession`), CSRF tokens (`requireValidCsrf`), and body size limits.
**Prevention:** Always enforce `getAdminSession` and `requireValidCsrf` on non-public utility handlers in `api/`, or keep purely helper functions in `src/lib/` instead of `api/`.
