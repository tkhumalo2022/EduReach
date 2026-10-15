## 2025-05-18 - Utility test endpoints must require admin session authentication
**Vulnerability:** `/api/send-test-purchase-email` allowed unauthenticated callers to trigger outgoing emails to arbitrary addresses using the server's Resend API key.
**Learning:** Development and test utility endpoints created alongside public API routes can easily bypass session checks if created without importing `getAdminSession` and `requireValidCsrf`.
**Prevention:** Always wrap administrative or diagnostic endpoints with `getAdminSession` and `requireValidCsrf` checks, and enforce payload validation via `readJsonBody`.
