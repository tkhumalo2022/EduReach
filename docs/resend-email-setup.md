# Resend customer email setup

Use Resend to send customer purchase emails as real HTML emails. The Gmail test showed raw HTML because that tool sent plain text. Resend sends the same design with the correct HTML content type.

## Required Vercel environment variables

- `RESEND_API_KEY`
- `EDUREACH_FROM_EMAIL` example: `EduReach <orders@your-domain.co.za>`
- `EDUREACH_EMAIL_TOKEN` optional private token for test requests

## Customer email should include

- Customer name
- Product title
- Amount paid
- Payment status
- Order ID
- Purchase date
- Secure download link
- EduReach support number: +27 81 214 8384

## Flow

1. Customer pays through PayFast.
2. PayFast ITN confirms the payment.
3. Backend verifies the payment.
4. Backend generates a secure download link.
5. Resend sends the branded HTML email to the customer.
