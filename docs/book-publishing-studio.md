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
