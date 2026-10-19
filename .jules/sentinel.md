## 2025-05-18 - Protect Serverless Test/Utility Endpoints
**Vulnerability:** Unauthenticated serverless test endpoints (e.g., `api/send-test-purchase-email.js`) can act as open email relays or consume third-party API quotas (Resend, OpenAI) if rate limiting, body size limits, and admin authentication/secret checks are omitted.
**Learning:** Standalone utility endpoints in the `api/` directory bypass central router middleware and must individually enforce rate limiting (`enforceRateLimit`) and admin session/secret checks (`getAdminSession`).
**Prevention:** Always verify `req.method`, call `enforceRateLimit()`, check admin session or timing-safe admin secret header, and validate inputs using `readJsonBody()` before invoking external APIs in serverless endpoints.
