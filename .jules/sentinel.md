## 2025-05-20 - Unauthenticated Test Email Endpoints Expose SaaS Quotas
**Vulnerability:** `api/send-test-purchase-email.js` was accessible publicly without authentication or rate limiting, allowing unauthenticated users to trigger outbound Resend emails.
**Learning:** Test and helper endpoints deployed alongside production API routes can easily bypass authentication checks if created as standalone handler files without inheriting global or modular auth middleware.
**Prevention:** Always require admin session authentication (`getAdminSession`), CSRF protection (`requireValidCsrf`), and rate limiting (`enforceRateLimit`) on administrative or diagnostic endpoints.
