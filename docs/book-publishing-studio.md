# EduReach Book Publishing Studio — Owner Setup

This branch keeps edureach.network on Vercel and Wix as the content store. It adds an easier /admin/books interface and a new /resources/ebooks public shop. Nothing should be merged until the owner approves it and all checks pass.

## What this branch provides

- Private book editor: title, author, description, topic, price, featured status, live preview.
- Short-lived Wix upload URLs for public covers and free PDFs under 10 MB. Browser CORS and readiness must still be tested.
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
- [ ] Confirm CORS for media uploads and mobile browser support. Do not upload paid PDFs as public files.
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
