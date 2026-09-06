## 2025-05-10 - Unprotected Admin Utility Endpoints
**Vulnerability:** Publicly accessible utility endpoints (like `api/send-test-purchase-email.js`) can act as open email relays or spam triggers if admin authentication and CSRF checks are omitted.
**Learning:** Utility API routes placed alongside public endpoints in `api/` must explicitly enforce `getAdminSession` and `requireValidCsrf` rather than assuming they are only reachable from the admin UI.
**Prevention:** Always mandate rate limiting (`enforceRateLimit`), admin session lookup (`getAdminSession`), CSRF token validation (`requireValidCsrf`), and payload size restriction (`readJsonBody`) for utility endpoints handling sensitive third-party integrations (e.g. Resend).
