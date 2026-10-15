# Sentinel Security Journal

## 2025-05-18 - Protect Administrative Utility Endpoints
**Vulnerability:** The `/api/send-test-purchase-email` route allowed unauthenticated callers to dispatch arbitrary emails using the server's Resend API key and leaked raw API error payloads.
**Learning:** Development and test utility endpoints created outside the main `adminApi` router can easily bypass authentication and rate-limiting checks if not explicitly protected.
**Prevention:** Always mandate `getAdminSession`, `requireValidCsrf`, and `enforceRateLimit` on any operational or testing utility routes in `api/`.
