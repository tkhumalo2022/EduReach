# EduReach

A production education consultancy platform built for EduReach in South Africa. The project combines a responsive public website, CMS-managed resources, an owner publishing workspace and a secure digital-resource checkout flow.

Live site: https://edureach.network

## What I built

EduReach started as a public-facing consultancy website and grew into a practical content and commerce platform. The implementation focuses on keeping everyday content manageable for the organisation while sensitive operations remain server-side.

Key features include:

- Responsive public website with accessible semantic HTML
- Wix Headless CMS integration for articles, blog posts, resources, galleries and organisational content
- Secure owner/admin workspace
- Contact and consultation enquiry workflow
- Shopping cart for paid digital resources
- PayFast checkout and server-side ITN verification
- Transactional email delivery through Resend
- Signed, expiring download links for purchased files
- Order-access controls that avoid exposing private order data
- API rate limiting and environment-based secret management
- SEO metadata and mobile-friendly layouts

## Architecture

```text
Visitor / Owner
      |
      v
Static HTML, CSS and JavaScript frontend
      |
      +---- Wix Headless CMS
      |
      +---- Vercel Functions
               |
               +---- Contact API
               +---- Admin authentication
               +---- Checkout / Orders
               +---- PayFast ITN verification
               +---- Signed downloads
               `---- Resend transactional email
```

## Technology

- HTML5, CSS3 and JavaScript
- Vercel Functions
- Wix Headless CMS
- PayFast
- Resend
- Server-side session and order handling

## Engineering highlights

### Payment verification

The checkout flow does not trust a browser redirect as proof of payment. PayFast ITN data is verified server-side before an order is marked as paid or a protected download becomes available.

### Protected digital delivery

Paid resources use signed, expiring links. Browser order lookups require both an order ID and a separate access token, while emailed download links use server-generated signatures and expiry checks.

### CMS integration

Content that changes regularly is loaded through Wix Headless rather than duplicated throughout the frontend. Credentials and privileged CMS operations remain server-side.

### Admin security

The owner workspace uses server-side authentication, rate limiting and HttpOnly/SameSite session handling. Deployment credentials and administrator account details are intentionally not documented in this public README.

## Project structure

```text
admin/          Owner publishing workspace
api/            Server-side Vercel functions
assets/         Public website assets
blog/           Blog interface
cart/           Shopping cart interface
checkout/       Checkout interface
docs/           Operational documentation
resources/      CMS-backed resource interface
src/lib/        Shared CMS/client modules
```

## Local development

Install dependencies and run the project checks:

```bash
npm install
npm run lint
npm run typecheck
npm run build
```

Then serve the static frontend locally, for example:

```bash
python -m http.server 4173
```

Open `http://localhost:4173/`.

Use `.env.example` as a reference for required environment-variable names. Never commit real CMS, payment, email or authentication credentials.

## What this project demonstrates

- Building software around a real organisation's workflow
- Frontend development without depending on a large UI framework
- Serverless API development
- Headless CMS integration
- Payment-provider integration and webhook verification
- Authentication and access-control fundamentals
- Secure secret handling
- Transactional email workflows
- Progressive improvement of an existing production system

## Status

Active production project. Operational setup and private handover details are intentionally kept separate from this public portfolio documentation.
