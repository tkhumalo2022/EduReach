# Sentinel Security Journal

## 2026-10-02 - Unauthenticated Test Email Endpoints as Open Email Relays
**Vulnerability:** The serverless endpoint `api/send-test-purchase-email.js` allowed any unauthenticated client to issue HTTP POST requests to trigger emails sent via Resend API to arbitrary recipient addresses (`customerEmail`).
**Learning:** Utility and test endpoints created for development convenience often omit security middleware (rate limiting, authentication, CSRF validation), turning them into open email relays and exposing third-party API keys to quota abuse or phishing exploits.
**Prevention:** Always enforce admin session authentication (`getAdminSession`), CSRF protection (`requireValidCsrf`), rate limiting (`enforceRateLimit`), and input body size limits (`readJsonBody`) on all administrative test or helper endpoints.
