## 2025-05-10 - Open Email Relay in Vercel API Route
**Vulnerability:** An unauthenticated test endpoint (`/api/send-test-purchase-email.js`) accepted arbitrary recipient email addresses and names, sending arbitrary purchase emails using the production Resend API key.
**Learning:** Vercel automatically exposes any JS file in `/api/` as a public HTTP serverless function. Test or debug endpoints in `/api/` without authentication create open relays or administrative backdoors.
**Prevention:** Never place unauthenticated test endpoints in public API directories. All test code should reside under `/tests` or require strict authentication.
