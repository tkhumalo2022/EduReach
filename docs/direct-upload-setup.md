# EduReach Direct Uploads — Owner Publishing Desk

Branch: \`feature/owner-dashboard-direct-uploads\`.
Production \`https://edureach.network\` remains unchanged until a separate owner-approved release.

## What Dad gets
- Login to the existing EduReach \`/admin\` using the established session and optional authenticator.
- **Upload & drafts** section inside the dashboard (no need to open Wix for routine draft editing).
- Three workflows: **Books**, **Free resources**, **Articles**.
- Title, topic, author, description, optional book price, article body; live cover/title/description preview.
- Upload a **cover image** (JPG, PNG, WEBP; <=5 MB) and an explicitly **free PDF** (<=10 MB) directly to Wix Media Manager using a short-lived signed Wix upload URL.
- Save and reopen **Wix CMS draft items**. This is a draft-only integration; no endpoint can publish content in this branch.
- Existing published Wix content and all three paid R75 books remain unchanged.
- Paid book metadata can be drafted, but paid PDFs cannot be uploaded publicly, and paid publishing remains disabled until private delivery is verified.

## One-time connection — owner action
Use the EduReach owner's Wix account in the Wix **API Keys Manager**:
https://manage.wix.com/account/api-keys

1. Create an API key called **EduReach Admin Publishing (Preview)** for **the EduReach Wix site only**, not every site in the account.
2. Select only the rights needed by this endpoint: **Read Data Items**, **Write Data Items**, **Manage Media Manager**. Read the current Wix scope descriptions. Avoid site management, payment, store or customer scopes.
3. For the relevant collections (historic Ebooks ID \`Import5\`, and the exact configured IDs for Downloadable Resources and Articles), ensure draft functionality is enabled. The endpoint lists and writes items in \`<collection-id>__drafts\`; this is the Wix CMS draft plugin, which is still a developer-preview feature.
4. Check field IDs: title, description, author, category, coverImage, pdfFile, price, isFree, body/content, excerpt, image. Because Wix collections can use different field IDs/types, **verify on a non-public test draft** before enabling production. A signed Wix upload may finish asynchronously; ensure media file is ready.
5. In the Vercel project \`edureach-website\`, add a **Sensitive** environment variable:
   \`EDUREACH_WIX_ADMIN_API_KEY\` = the new key. Set target **Preview**, restricted to branch \`feature/owner-dashboard-direct-uploads\` initially. **Never put it in ChatGPT, a repo, HTML, screenshots or browser console.**
6. Add the existing admin login email and password hash to that preview branch via Vercel's private settings, if needed to sign in to the preview. Don't share their values with anyone.
7. Trigger a new preview deployment after setting variables; sign in at preview \`/admin\`, check Wix draft connection, upload a harmless approved cover and free PDF, save/edit a test draft, verify that it is not publicly visible, then inspect the Wix draft record for correct field mapping.
8. After security review and explicit owner approval, promote the exact reviewed admin-only changes; add a separate restricted production API key only when ready.

Official docs:
- Wix API keys: https://dev.wix.com/docs/api-reference/articles/api-keys/generate-an-api-key
- Wix Data Item draft lifecycle: https://dev.wix.com/docs/api-reference/business-solutions/cms/data-items/insert-data-item
- Wix Media signed upload flow: https://dev.wix.com/docs/api-reference/assets/media/media-manager/files/upload-api

## Protections
- Authenticated server-side admin session required for GET and POST; writes also require the existing CSRF token and exact HTTPS origin.
- Access to Wix through a dedicated, server-only API key. Site ID comes from existing \`WIX_SITE_ID\`; no secret is embedded in browser code.
- Media upload URL destination allowlisted to HTTPS Wix upload hosts. The browser uploads directly to Wix with \`PUT\`; it never sees the API key.
- Server-side MIME, extension and size validation; content metadata length and category validation; no public paid PDF linking.
- All output is rendered with \`textContent\` or DOM APIs, not HTML interpolation.
- Draft list excludes private paid PDF URLs; only a \`hasPdf\` indicator can be returned.
- No public publish/delete operation; all saves target the Wix draft shadow collection, never the published collection.
- No extra standalone serverless function: routed through existing \`api/contact.js\`, preserving Vercel Hobby limits.

## Outstanding release checks
- [x] Lint, type check, build and automated tests.
- [x] Anonymous publishing endpoint denied and malicious upload URL formats rejected in unit tests.
- [ ] A real owner-signed-in preview browser and mobile responsive QA.
- [ ] Restricted Wix key configured in Preview, and CMS draft plugin verified.
- [ ] Real signed upload tested for image and a free PDF, including CORS, returned Wix URL and file-ready lifecycle.
- [ ] Article, book and resource test drafts checked against the actual Wix field types, saved, edited, and verified unpublished.
- [ ] All dashboard forms keyboard-accessible and image alt/copyright permissions reviewed.
- [ ] Owner approval before production merge or settings changes.

If Wix auth or draft plugin is not ready, the editor explicitly reports **Wix connection needed** and disables uploads/save. This is intentional; it does not pretend an upload completed.
