## 2025-05-20 - Unauthenticated Test API Endpoints in Vercel Serverless Functions
**Vulnerability:** `api/send-test-purchase-email.js` was exposed as a public endpoint without session authentication or rate limiting, allowing unauthenticated attackers to trigger outbound emails via Resend.
**Learning:** Any file placed in the `/api` directory on Vercel automatically becomes a publicly accessible route. Auxiliary or test utilities (such as test email triggers) must enforce admin session checks (`getAdminSession`) and rate limits.
**Prevention:** Always wrap test and admin API endpoints with `getAdminSession(req)` authentication and rate limiting (`enforceRateLimit`) before processing requests.
