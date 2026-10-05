# Sentinel Security Journal

## 2025-05-18 - Unauthenticated Email Endpoint & API Key Abuse Risk
**Vulnerability:** `api/send-test-purchase-email.js` was accessible without authentication, rate limiting, or input size limits, allowing unauthenticated external callers to trigger email sending via Resend and leak internal error details.
**Learning:** Utility or test endpoints deployed as serverless API routes can easily be overlooked when securing production routes with admin session authentication and rate limiting.
**Prevention:** Ensure all admin and testing API routes require `getAdminSession` authentication, CSRF validation, rate limiting, and generic error messages before deployment.
