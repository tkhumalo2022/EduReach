## 2025-02-18 - Unauthenticated Serverless Test Endpoints as Open Relays
**Vulnerability:** `api/send-test-purchase-email.js` allowed any unauthenticated caller to send test emails to arbitrary email addresses using the production `RESEND_API_KEY`.
**Learning:** Development and test endpoints in serverless directory structures (`api/`) are automatically exposed as public HTTP routes unless explicitly protected by authentication or disabled in production.
**Prevention:** Always enforce authentication (e.g. `getAdminSession` or administrative secret headers), rate limiting, and strict input validation on all diagnostic and test endpoints in serverless API routes.
