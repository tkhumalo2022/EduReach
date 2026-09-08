# Sentinel Security Journal

## 2025-05-18 - Unauthenticated Serverless Test Endpoints
**Vulnerability:** The `/api/send-test-purchase-email` endpoint was publicly accessible without authentication, allowing unauthenticated callers to trigger email dispatches and leaking upstream Resend error details.
**Learning:** Utility or test endpoints placed in `/api` are automatically deployed as public serverless functions by Vercel unless explicitly gated with session checks.
**Prevention:** Always enforce admin session validation using `getAdminSession(req)` and rate limiting using `enforceRateLimit(req, res)` on all administrative or internal utility endpoints.
