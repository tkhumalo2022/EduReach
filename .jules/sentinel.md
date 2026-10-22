## 2025-05-20 - Protect send-test-purchase-email endpoint
**Vulnerability:** Unauthenticated test email endpoint allowed arbitrary public email dispatch via Resend API key.
**Learning:** Legacy test endpoints left in `api/` must reuse central `getAdminSession` and `enforceRateLimit` checks.
**Prevention:** Always verify authentication and rate limiting on utility/test endpoints before deploying.
