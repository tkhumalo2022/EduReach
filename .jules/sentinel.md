## 2025-05-18 - Unprotected Admin Utility API Endpoints
**Vulnerability:** Admin helper endpoints in `/api/` (such as `send-test-purchase-email.js`) were created without importing admin authentication or rate limiting utilities, allowing unauthenticated attackers to send arbitrary emails.
**Learning:** Helper or testing serverless functions in the `api/` directory default to publicly accessible routes on Vercel/Node backends if authentication middleware or `getAdminSession` is not explicitly invoked inside the handler.
**Prevention:** Always enforce `getAdminSession`, `requireValidCsrf`, `enforceRateLimit`, and `readJsonBody` on all administrative or utility API routes in `/api/`.
