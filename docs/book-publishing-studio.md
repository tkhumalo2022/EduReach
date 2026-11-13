# EduReach Book Publishing Studio — Owner Setup

This branch keeps edureach.network on Vercel and Wix as the content store. It adds an easier /admin/books interface and a new /resources/ebooks public shop. Nothing should be merged until the owner approves it and all checks pass.

## What this branch provides

- Private book editor: title, author, description, topic, price, featured status, live preview.
- Short-lived Wix upload URLs for **cover images only**. PDF uploads inside Book Studio are disabled until private-file delivery is available. Cover upload browser CORS and readiness must still be tested.
- Save new drafts in Wix, reopen and update drafts, publish approved complete free PDFs.
- Public bookshop showcases real published Wix books, not fictitious bestsellers.
- Paid books can be drafted. Paid-book publishing is blocked until secure PDF delivery is audited.

## One-time setup in Vercel

Open Vercel project edureach-website → Settings → Environment Variables. Do not send secret values over chat or commit them.

1. Add EDUREACH_ADMIN_EMAIL with the owner's chosen sign-in email.
2. Add EDUREACH_ADMIN_PASSWORD_HASH in the scrypt format documented in the existing .env.example; create the password and its hash privately.
3. Add EDUREACH_WIX_ADMIN_API_KEY with access restricted to the EduReach Wix site only and minimum necessary scopes: Read Data Items, Write Data Items, and Manage Media Manager.
4. Confirm WIX_SITE_ID and WIX_EBOOKS_COLLECTION_ID are correctly set. The historic ebook collection ID is Import5.
5. Enable Wix draft-items support on the Ebooks collection. The API creates content inside the collection's __drafts shadow collection. This Wix draft API is in developer preview.
6. Confirm the fields: title, author, description, category, price, isFree, featured, coverImage, pdfFile, publishedDate.
7. Set these values in Preview first. Production must not be changed until the owner approves deployment.

Wix API key documentation: https://dev.wix.com/docs/api-reference/articles/rest-authentication/rest-api-authentication
Wix draft documentation: https://dev.wix.com/docs/api-reference/business-solutions/cms/data-items/insert-data-item
Media upload documentation: https://dev.wix.com/docs/api-reference/assets/media/media-manager/files/importing-files

## How to publish

1. Sign in at /admin.
2. Open Book Studio.
3. Enter book details, cover and PDF.
4. Preview the title, description, category and price.
5. Save to Wix as a private draft.
6. Edit the draft until correct.
7. Publish a completed free book, with owner approval.
8. Verify the live public book page and file access.

## Release checklist

- [ ] Vercel preview READY. Publishing uses the existing api/contact.js bundle to remain under the Hobby 12-function cap.
- [ ] npm run lint, npm run typecheck, npm test and npm run build pass.
- [ ] Anonymous /api/admin/books calls return 401.
- [ ] Invalid CSRF and missing admin sessions deny writes.
- [ ] Restricted Wix API key stays only in Vercel server-side environment variables.
- [ ] Create, edit, list, publish and unpublish a real free test book through the entire flow.
- [ ] Confirm CORS for **cover** media uploads and mobile browser support. Book Studio issues no public PDF upload URLs.
- [ ] Public bookshop contains no sample products and only displays real published Wix records.
- [ ] Screen-reader labels, responsiveness, contrast and keyboard navigation verified.
- [ ] Private paid-file storage and download delivery tested with PayFast ITN and durable order records in a separate phase.
- [ ] Owner approves changes before any production release.

## Current limitations

This is an implemented review-stage feature. It cannot publish through Wix before the owner configures the separate Wix API key, admin login and CMS draft lifecycle. Paid books must stay as drafts until protected download delivery is verified.

## Verified live Wix audit — 13 November 2026

Inspected the signed-in Edu Reach owner CMS on the authorized laptop, without modifying any records. Site dashboard points to Wix CMS Ebooks collection ID `Import5`.

The collection currently has 3 published, paid ebooks at R75 each:
- Teaching Strategies That Make a Difference
- Autism and the Challenges
- Understanding Autism in Inclusive Classrooms

The live public EduReach CMS endpoint returns all three with valid cover images and accessType=paid. Protected PDF URLs are absent from public item responses; **this alone does not prove the underlying Wix Media Manager files are private**. No paid delivery was attempted.

The Wix table visibly uses these columns: Title, Cover Image, description, PDF File, price, and is Free. Public API responses currently have empty author, category, and featured values. Before using the new Book Studio in production, verify or add those optional fields in Wix with the exact IDs `author` (text), `category` (text), `featured` (boolean), and optionally `publishedDate` (date). Do not change current pricing or existing publication states as part of this setup.

The public bookshop preview renders all three real books. Browser QA confirmed Add to Cart increases to 1, cart totals R75 and checkout shows R75. The test cart was cleared, and no payment was made. Owner login and new authenticated Wix write operations remain unverified until restricted credentials and the Wix draft plugin are configured.

## API leak and publishing security review — 13 November 2026

- The Wix admin API key is read only in the server-side Book Studio library; no credential is placed in HTML, JavaScript bundles, or public API responses.
- A previously available `uploadUrl` branch allowed a client to request a public PDF upload by falsifying a `paid` flag. **Closed:** the server now rejects all PDF upload URL requests, even when a client sends `paid:false`. Cover-only upload URLs are validated against HTTPS Wix domains.
- Paid draft PDF URLs are masked in admin list responses; a boolean `hasPdf` is returned instead. Saved paid-draft PDF references can be preserved during metadata edits without sending those URLs to the browser.
- The publish handler requires an exact free price **and** `isFree === true`, rather than assuming any nonpositive or invalid price is free.
- Admin mutations require a same-origin browser `Origin` header, existing signed-in session and matching CSRF token. Responses are marked private/no-store, noindex and no-referrer.
- The Book Studio now reports disconnected if Wix draft queries fail, instead of reporting a healthy connection.
- Important **unresolved preexisting commerce risk**: current paid download fulfillment redirects customers to Wix media URLs after purchase. A buyer may share that media URL outside checkout. This feature branch does **not** modify the live checkout or its paid download handler; a protected file storage and delivery redesign is required before treating paid PDFs as non-shareable.
- A redacted source audit found no committed environment-secret file beyond template `.env.example`; this is not proof that previously shared credentials or Wix media files have never leaked. Rotate any credential known to be exposed and move paid PDFs out of public storage after choosing a protected delivery system.

## Preview-only owner sign-in preparation — 13 November 2026

- Verified the live Vercel project's environment-variable **names only**, without decrypting secret values. `EDUREACH_ADMIN_EMAIL` and `EDUREACH_ADMIN_PASSWORD_HASH` are not yet configured, so sign-in fails closed.
- The authenticated owner dashboard lives at `/admin`. Book Studio is `/admin/books`. When a visitor opens Book Studio without a session, they are directed to `/admin?next=%2Fadmin%2Fbooks`; this return path is explicitly allowlisted and cannot redirect externally.
- Removed the localhost `?preview=dashboard` demo bypass so the UI only renders an authenticated dashboard from a real server-verified session.
- The owner has a private, local PowerShell script on the authorised laptop that prompts for an email and a password (16+ characters) without echoing the password; it generates a salted scrypt verifier with `N=16384,r=8,p=1` and copies only the verifier to the clipboard.
- To activate **review** access, the owner must set `EDUREACH_ADMIN_EMAIL` and `EDUREACH_ADMIN_PASSWORD_HASH` as **sensitive Preview variables scoped to this review branch**, then redeploy this branch to pick them up. Do not expose the password or verifier in chat, source control, logs or screenshots.
- Do not add these variables to Production until the owner explicitly authorises launch. Do not attach a broad Wix administrative API key while testing login.
- After preview variables are set, verify login, session renewal, protection of `/api/admin/books`, redirect back to the Book Studio, logout and cookie invalidation without publishing any books.

## Owner traffic insights, security and SEO — 13 November 2026 (review branch)

The existing public site already uses Google Analytics 4 measurement ID `G-FXDS1M5CFN` in `script.js`. The ID is public metadata, not a credential. New changes keep **the same** GA4 property rather than create an empty replacement, and require affirmative visitor consent before loading the Google tag. Visitors can decline or revisit Analytics choices. Custom click events include contact methods (WhatsApp/email/phone), ebook-detail clicks, add-to-cart clicks, and checkout starts, **without names, email addresses, book-file URLs or order details**. Page URLs and referrers are stripped of query strings to avoid collecting checkout/order tokens.

### Connect real GA4 metrics to Dad's private dashboard

The new Admin → **Visitor insights** area reads the Google Analytics Data API only from the server-side endpoint `GET /api/admin/insights` (existing Vercel `api/contact.js` function with protected session). It displays real **28-day** active users, sessions, page views and tracked useful actions, plus top pages and action categories. If not connected or upstream data is inaccessible, it displays **Not connected / unavailable**, never invented numbers. There are direct links to Google Analytics and Search Console if the owner already has access. No Analytics account credentials or customer-level records are returned to the browser.

1. In the **existing** Google Analytics property receiving `G-FXDS1M5CFN`, find its **numeric Property ID** in Admin → Property details.
2. In a Google Cloud project with Google Analytics Data API enabled, create a **dedicated** service account for server-side read-only reporting. Add the service account **email as Viewer only** under this GA4 property's access management. Do **not** grant Editor or Admin.
3. Create a private JSON key and configure just these values in Vercel **Preview only**, for `feature/owner-book-publishing-studio`: `EDUREACH_GA4_PROPERTY_ID` (numeric), `EDUREACH_GA4_CLIENT_EMAIL` (service account email), `EDUREACH_GA4_PRIVATE_KEY` (private key PEM; escaped newlines are supported). Use encrypted/sensitive project environment variables, **never** GitHub or public JavaScript.
4. Redeploy the preview to pick up variables. Sign in at `/admin`, open Visitor insights, and compare numbers with the original GA4 property for the same 28-day window. Historical numbers can show if they were recorded previously; new custom event labels show only after deploying consent-gated tracking and people opting in.
5. The connected Search Console account currently accessible through the TK Web Studio integration did **not** include `edureach.network`. The owner should verify/access EduReach under its correct Google account, open Search Console via the new dashboard link, check indexing and submit `https://edureach.network/sitemap.xml` after release. No Search Console account, integration, or access permissions were changed.

### Sign-in protections

- **Preview password rule remains at least six characters and a special character.** This is weak for a sensitive admin panel; use a longer unique password in production.
- Login throttle is 5 requests per 10 minutes **per network address**, independent of user-agent. In production the admin login **fails closed** if persistent rate-limiting storage becomes unavailable, rather than permitting unlimited guesses. Existing secure HTTP-only, SameSite=Strict cookies and short-lived server sessions remain.
- Optional authenticator-app verification is supported using `EDUREACH_ADMIN_TOTP_SECRET` (Base32 authenticator seed, secret). If set, the server requires a valid six-digit authenticator code in addition to password. Do not enable this until the owner has successfully enrolled the seed into an authenticator application and verified a live test sign-in. Do not store QR code seed in code or chat.
- Keep `EDUREACH_ADMIN_EMAIL`, `EDUREACH_ADMIN_PASSWORD_HASH`, `EDUREACH_ADMIN_TOTP_SECRET` and GA4 service-account credentials **Preview branch-scoped** until owner approval. No production deployment or permissions change is authorized by these review changes.

### SEO fixes in review

- Homepage metadata now accurately describes inclusive education workshops, teacher training, school inclusion audits, autism awareness and learner support in Richards Bay.
- Ebook shop metadata names its actual South African audience (teachers, families and school support teams), with truthful `CollectionPage` JSON-LD.
- Published ebook pages have server-rendered schema.org `Book` metadata and a real `Offer` in ZAR only when the Wix record contains a valid price/access status; no invented ratings, ISBNs, authors or reviews.
- Checkout, cart and payment pages are removed from the XML sitemap and served with an `X-Robots-Tag: noindex` rule. These pages are **not** blocked by robots.txt because crawlers must be able to see the noindex directive. Admin routes remain excluded.
- Existing real CMS slugs and canonical URLs remain unchanged. No claims of higher rankings or indexed status before checking Search Console.

### QA and release gates

- [ ] Automated lint, TypeScript checks, tests and build pass on the review branch.
- [ ] Anonymous `/api/admin/insights` GET is denied with HTTP 401.
- [ ] Analytics reports cannot expose service-account credentials or raw private user-level records.
- [ ] Check consent decline, accept, re-open settings, and that new GA4 events omit URL query tokens.
- [ ] Test owner login after preview credentials are set; optional TOTP only after enrollment.
- [ ] Confirm Google sees `noindex` on cart and checkout and not in sitemap.
- [ ] Check Book JSON-LD in rendered book page and in Schema.org Validator.
- [ ] Compare GA4 aggregate metrics to Analytics UI after permissions are configured.
- [ ] Owner explicitly approves any production merge/deployment.
