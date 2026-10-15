## 2025-05-18 - Protect standalone utility/test endpoints with admin session and CSRF checks
**Vulnerability:** Unauthenticated public serverless endpoint `api/send-test-purchase-email.js` allowed arbitrary senders to dispatch emails via Resend API key with no rate limiting or input validation.
**Learning:** Standalone utility endpoints created for testing or administrative debugging must enforce the same session and CSRF checks (`getAdminSession` and `requireValidCsrf`) as administrative API handlers.
**Prevention:** Ensure all non-public API endpoints in `api/` import and check `getAdminSession` and `enforceRateLimit` before handling requests.
