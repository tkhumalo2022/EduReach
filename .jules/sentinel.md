## 2025-05-18 - Admin Utility Endpoints Lacking Auth
**Vulnerability:** Unauthenticated test email endpoint (`/api/send-test-purchase-email`) was publicly accessible, allowing potential email relay abuse and information disclosure via Resend error responses.
**Learning:** Utility endpoints created for testing or administrative tasks must explicitly integrate `getAdminSession` and `requireValidCsrf` rather than relying on route obscurity.
**Prevention:** Enforce admin authentication, CSRF checks, rate limiting, and sanitized error responses on all non-public API endpoints in the `api/` directory.
