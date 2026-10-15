## 2025-05-18 - Unauthenticated Test & Utility API Endpoints

**Vulnerability:**
The `api/send-test-purchase-email.js` serverless function allowed any unauthenticated caller to send emails to arbitrary recipients via Resend without rate limits, body size restrictions, or admin authentication.

**Learning:**
Utility or test endpoints created alongside production handlers can easily be overlooked during security hardening, leaving sensitive external capabilities (like email sending) exposed to abuse, quota exhaustion, or email spoofing.

**Prevention:**
Always mandate centralized request validation (`src/lib/security.js`) and administrative authentication/authorization checks for all utility or test endpoints before deploying.
