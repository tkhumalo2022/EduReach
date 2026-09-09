## 2025-05-18 - Protect Test/Utility API Endpoints with Admin Auth
**Vulnerability:** Public API endpoint `api/send-test-purchase-email.js` allowed unauthenticated callers to trigger email sends via Resend, acting as an open email relay.
**Learning:** Utility or test endpoints placed in the `api/` directory are automatically exposed as public serverless functions unless explicitly protected with admin authentication session checks (`getAdminSession`) and rate limiting (`enforceRateLimit`).
**Prevention:** All non-public utility and test API endpoints in `api/` must verify active admin sessions or authorization headers and enforce rate limiting before executing external side effects like sending emails or calling upstream APIs.
