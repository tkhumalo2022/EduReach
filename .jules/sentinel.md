## 2025-05-24 - Unauthenticated Test API Endpoints Can Act as Open Email Relays
**Vulnerability:** The `/api/send-test-purchase-email` route allowed any unauthenticated client to trigger outbound emails via Resend to arbitrary recipients.
**Learning:** Test utility endpoints deployed under `/api/` in Vercel serverless environments bypass frontend restrictions and can be directly invoked over HTTP unless protected with session authentication and rate limits.
**Prevention:** Always enforce admin session validation (`getAdminSession`), rate limiting (`enforceRateLimit`), and body size limits (`readJsonBody`) on utility and testing API routes.
