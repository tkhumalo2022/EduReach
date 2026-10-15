## 2025-02-21 - Require Admin Authentication for Email Sending Endpoints
**Vulnerability:** Unauthenticated public access to `/api/send-test-purchase-email` allowed external requests to send test purchase emails via the server's Resend API key without rate limiting or authorization checks.
**Learning:** Standalone test or utility endpoints in `/api/` are automatically published as public serverless routes unless explicitly protected with admin authentication and CSRF checks.
**Prevention:** Always require `getAdminSession`, `requireValidCsrf`, and `enforceRateLimit` on serverless endpoints in `/api/` that send emails or trigger backend utility actions.
