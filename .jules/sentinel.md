## 2025-08-21 - Unauthenticated Test Email Endpoint (Open Email Relay)
**Vulnerability:** The `/api/send-test-purchase-email` serverless function was exposed without authentication, rate limiting, or CSRF validation, allowing unauthenticated remote attackers to send arbitrary emails via Resend and leaking upstream API errors.
**Learning:** Utility or test serverless endpoints placed in the `api/` directory automatically become public endpoints on Vercel unless explicitly protected using the application's session authentication (`getAdminSession` and `requireValidCsrf`).
**Prevention:** Always require admin session authentication (`getAdminSession`) and CSRF validation on all administrative, utility, and email-triggering serverless functions.
