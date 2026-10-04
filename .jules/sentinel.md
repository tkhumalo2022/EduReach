## 2025-05-18 - Protect Utility and Test Email Endpoints with Admin Auth
**Vulnerability:** Unauthenticated `/api/send-test-purchase-email` endpoint permitted arbitrary external users to trigger outgoing emails using server Resend credentials, posing spam relay, rate limit exhaustion, and info disclosure risks.
**Learning:** Test or utility API handlers added during development can easily be overlooked if standard request security helpers (`getAdminSession`, `enforceRateLimit`, `readJsonBody`) are not applied systematically across all `/api` routes.
**Prevention:** Always mandate authentication (`getAdminSession` or backend secret), rate-limiting, body size limits, and email format validation on all email-triggering serverless functions.
