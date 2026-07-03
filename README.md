# EduReach Website

A modern, responsive one-page website for EduReach, an Inclusive Education Consultancy based in South Africa.

## What is included

- Sticky navigation with smooth scrolling
- Full-screen storytelling hero with local education imagery
- Our Story section focused on learners, schools, barriers, hope and inclusion
- Editable founder information section
- Philosophy, services and trust-building cards without fake statistics
- Five-School Learner Support Pilot presented as Our Vision
- Resources section with coming-soon cards and future gallery placeholders
- Wix Headless-ready resources, articles, ebooks, blog, downloads and galleries
- Large consultation call-to-action with background imagery
- Contact form with secure Vercel endpoint support
- WhatsApp buttons configured through `site-config.js`
- Google Maps placeholder
- SEO metadata and accessible semantic HTML

## Before publishing

Open `site-config.js` and update:

- `whatsappNumber` in international format without spaces or `+`
- `contactEmail` for form enquiries
- `formEndpoint` only if using a form service or custom API

Example:

```js
window.EDUREACH_CONFIG = {
  whatsappNumber: "27821234567",
  contactEmail: "hello@example.com",
  formEndpoint: ""
};
```

## Customise content

Search for `TODO:` comments in `index.html`, `site-config.js` and `styles.css`. They mark the places a beginner developer can safely update founder details, verified qualifications, research interests, approved imagery, resources, social links and contact settings.

Do not add fake statistics, fake testimonials, fake partner logos, fake awards or claims that make EduReach appear older than it is. Build trust through verified founder expertise, mission clarity, practical services and authentic storytelling.

## Wix Headless CMS

The site is static HTML/CSS/JavaScript with Vercel Functions. It is not a Next.js App Router or Pages Router project.

Wix Headless content is loaded through:

- `api/wix-content.js`
- `src/lib/wixClient.js`
- `src/lib/wixContent.js`
- `cms.js`
- `resources/*`
- `blog/*`

Real Wix credentials and collection IDs must be stored in Vercel environment variables. Use `.env.example` only as a placeholder reference.

Read:

- `docs/wix-cms-setup.md`
- `docs/edureach-owner-guide.md`

The expected Wix CMS collection IDs are `articles`, `blogPosts`, `Import5`, `downloadableResources`, `workshopAlbums`, `galleryAlbums`, `teamMembers`, `partnersSponsors` and `testimonials`. Wix's built-in draft/publish controls manage visibility; do not add a separate manual status field.

## Shopping cart and PayFast checkout

Paid `Ebooks` and `Downloadable Resources` are added to a local shopping cart and checked out through `/checkout`. Free items still download directly from Wix.

PayFast credentials must be stored in Vercel environment variables:

- `PAYFAST_MERCHANT_ID`
- `PAYFAST_MERCHANT_KEY`
- `PAYFAST_PASSPHRASE` if the same passphrase is configured in the PayFast dashboard
- `PAYFAST_MODE` as `sandbox` or `production`, or `PAYFAST_SANDBOX=true/false`
- `SITE_URL` or `NEXT_PUBLIC_SITE_URL` for the public site origin

Paid-order email delivery uses Resend and requires:

- `RESEND_API_KEY`
- `EDUREACH_EMAIL_FROM`, using a sender address on a domain verified in Resend
- `EDUREACH_EMAIL_REPLY_TO` if replies should go to a different address
- `EDUREACH_DOWNLOAD_LINK_SECRET`, set to a long random secret
- `EDUREACH_EMAIL_DOWNLOAD_TTL_SECONDS` if the default seven-day link lifetime should be changed

Set the PayFast ITN/notify URL to:

```text
https://edureach.network/api/payfast/notify
```

The checkout API validates cart items against Wix CMS before signing the PayFast payload. The ITN webhook at `/api/payfast/notify` validates the PayFast signature, posts the ITN data back to PayFast for server-side confirmation, checks the merchant ID, amount and `payment_status`, and only then marks the order paid. Pending, cancelled or failed orders never receive `downloadUrl` values from `/api/orders`. Confirmed order state is stored server-side through Vercel Runtime Cache as a lightweight bridge until a permanent database is added. Do not add manual payment links to CMS products.

After a verified `COMPLETE` ITN, the backend sends the customer a transactional email containing signed, expiring links for the purchased files. The order records the email delivery result, and the Resend request uses an order-specific idempotency key so duplicate PayFast notifications do not send duplicate emails.

Order lookups require both the order ID and the browser's order access token. The access token is generated during checkout, stored as a hash with the order, and kept only in the purchasing browser session or the secure order cookie. `/api/orders` returns only safe public order fields. Browser downloads continue to require that token, while emailed links use a separate server-signed bearer link that verifies the paid order, purchased item, signature and expiry before redirecting to the Wix file.

API rate limits use Vercel Runtime Cache rather than an in-memory JavaScript map. Configure `EDUREACH_RATE_LIMIT_SECRET` in Vercel, then adjust the optional `EDUREACH_RATE_LIMIT_CONTACT_*`, `EDUREACH_RATE_LIMIT_CHECKOUT_*`, `EDUREACH_RATE_LIMIT_ORDERS_*` and `EDUREACH_RATE_LIMIT_DOWNLOADS_*` values if the defaults need to change.

## Images

Current images are placeholder assets in `assets/images`. Replace them with final approved images when ready. Do not add personal founder images until the founder has approved the final file.

Suggested final names:

- `assets/images/hero.jpg`
- `assets/images/founder.jpg`
- `assets/images/classroom.jpg`

## Run locally

Install dependencies, then run a local static server from this folder:

```powershell
npm install
npm run lint
npm run typecheck
npm run build
py -m http.server 4173
```

Open `http://localhost:4173/`.
