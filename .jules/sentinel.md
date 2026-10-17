# Sentinel Security Journal

## 2025-05-18 - Unauthenticated Transactional Test Email Endpoint
**Vulnerability:** Public API endpoint `/api/send-test-purchase-email` allowed unauthenticated HTTP POST requests to send emails via Resend with arbitrary user-controlled parameters (`customerEmail`, `customerName`, etc.), acting as an open email relay / spam vector and leaking internal Resend API error responses.
**Learning:** Development/utility test endpoints that interact with third-party messaging services can easily be overlooked during security audits if created as standalone API routes without default auth middleware or session checks.
**Prevention:** Always require admin session authentication (`getAdminSession`) and rate limiting (`enforceRateLimit`) on all test, utility, or transactional email endpoints. Never return raw upstream error objects (`details: result`) to clients.
