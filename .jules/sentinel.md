## 2025-02-25 - Protect test purchase email API endpoint
**Vulnerability:** `api/send-test-purchase-email.js` was accessible publicly without authentication, allowing unauthenticated users to trigger email dispatch through Resend.
**Learning:** Endpoints created for internal testing or administrative utility may easily be missed during security sweeps if they are placed directly in the `api/` directory without authentication middleware or session checks.
**Prevention:** Ensure all administrative or utility API endpoints verify admin sessions via `getAdminSession` before processing request payloads.
