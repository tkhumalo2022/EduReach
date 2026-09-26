## 2025-05-18 - Admin Authorization on Test Email Endpoint
**Vulnerability:** Unauthenticated API endpoint (`api/send-test-purchase-email.js`) allowed any external caller to trigger test purchase emails using the server's Resend API key.
**Learning:** Development and test utility endpoints created in `api/` are exposed publicly by default on Vercel unless explicitly gated by authentication checks.
**Prevention:** Always ensure endpoints in `api/` that send emails or trigger administrative actions require admin authentication (`getAdminSession`).
