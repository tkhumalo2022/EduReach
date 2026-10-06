## 2026-08-31 - Protect Admin Test Purchase Email Endpoint
**Vulnerability:** Unauthenticated public API endpoint `api/send-test-purchase-email.js` allowed triggering test emails with arbitrary data and leaked internal Resend API error responses.
**Learning:** Utility API routes created for testing or administrative email actions must be guarded by `getAdminSession`, `requireValidCsrf`, and `enforceRateLimit` to prevent email spam/quota exhaustion and information disclosure.
**Prevention:** Whenever adding or inspecting admin/internal utility endpoints, always require admin session authentication, CSRF checks, payload size bounds, rate limiting, and generic error messages.
