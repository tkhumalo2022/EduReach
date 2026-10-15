## 2025-05-18 - Securing Utility/Test Email Endpoints
**Vulnerability:** Unauthenticated public API endpoint (`api/send-test-purchase-email.js`) allowed arbitrary email sending using the server's Resend key, exposing the application to open email relay abuse, quota exhaustion, and raw error detail leakage.
**Learning:** Utility and test endpoints created for development or administrative testing can be left exposed if not integrated into standard admin middleware.
**Prevention:** Always enforce rate limiting, admin session checks (`getAdminSession`), CSRF token validation (`requireValidCsrf`), and payload size validation (`readJsonBody`) on utility/test endpoints.
