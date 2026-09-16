## 2026-09-16 - Unauthenticated Test API Endpoints
**Vulnerability:** The test email endpoint `/api/send-test-purchase-email` was exposed publicly without admin authentication or CSRF protection, allowing arbitrary POST requests to trigger email sending via Resend API and leaking upstream Resend API error details.
**Learning:** Utility or test endpoints under `api/` can be invoked publicly if left unauthenticated, risking third-party API quota consumption, email spoofing/phishing, and information disclosure.
**Prevention:** All administrative or test API handlers in `api/` must enforce `getAdminSession(req)` and `requireValidCsrf(req, session)`, use `enforceRateLimit`, and sanitize error output using `sendJson`.
