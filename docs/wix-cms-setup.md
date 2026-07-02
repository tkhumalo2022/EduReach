# Wix CMS setup for EduReach

EduReach remains a GitHub/Vercel website. Wix is used only as the headless content dashboard for articles, blogs, ebooks, downloads, albums and paid digital products.

## 1. Create or open the Wix Headless project

1. Sign in to Wix.
2. Open the EduReach Wix site or create a Wix Headless project for EduReach.
3. Keep ownership, billing and domain settings in Wix/Vercel as they already are.
4. Do not paste private credentials into GitHub.

## 2. Install required Wix applications

Install these Wix apps:

- Wix CMS / Content Manager
- Wix CMS / Content Manager is enough for the PayFast digital marketplace

## 3. Create the OAuth application

1. Open the Wix Developers / Headless settings for the project.
2. Create an OAuth app for the EduReach website.
3. Copy the public Client ID into Vercel as `NEXT_PUBLIC_WIX_CLIENT_ID`.
4. Copy the Wix Site ID into `WIX_SITE_ID`.
5. If you have the Wix Account ID, you may copy it into `WIX_ACCOUNT_ID` for reference, but the current SDK client does not require it.

The Client ID is not a private secret, but the real values still belong in Vercel environment variables rather than hardcoded files.

## 4. Required API permissions

Enable these permissions for the Wix Headless project:

- Read Data Items
- Read Data Collections

The website only reads published content. It does not create, update or delete Wix content.

## 5. Vercel environment variables

Add these in Vercel Project Settings -> Environment Variables for Production, Preview and Development:

```text
NEXT_PUBLIC_WIX_CLIENT_ID=
WIX_SITE_ID=
WIX_ARTICLES_COLLECTION_ID=articles
WIX_BLOGS_COLLECTION_ID=blogPosts
WIX_EBOOKS_COLLECTION_ID=Import5
WIX_DOWNLOADS_COLLECTION_ID=downloadableResources
WIX_WORKSHOP_ALBUMS_COLLECTION_ID=workshopAlbums
WIX_GALLERY_ALBUMS_COLLECTION_ID=galleryAlbums
WIX_TEAM_MEMBERS_COLLECTION_ID=teamMembers
WIX_PARTNERS_SPONSORS_COLLECTION_ID=partnersSponsors
WIX_TESTIMONIALS_COLLECTION_ID=testimonials
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
# Optional if the same passphrase is configured in PayFast.
PAYFAST_PASSPHRASE=
PAYFAST_MODE=sandbox
PAYFAST_SANDBOX=true
SITE_URL=https://edureach.network
NEXT_PUBLIC_SITE_URL=https://edureach.network
EDUREACH_RATE_LIMIT_SECRET=
EDUREACH_RATE_LIMIT_CONTACT_MAX=10
EDUREACH_RATE_LIMIT_CONTACT_WINDOW_SECONDS=60
EDUREACH_RATE_LIMIT_CHECKOUT_MAX=20
EDUREACH_RATE_LIMIT_CHECKOUT_WINDOW_SECONDS=60
EDUREACH_RATE_LIMIT_ORDERS_MAX=60
EDUREACH_RATE_LIMIT_ORDERS_WINDOW_SECONDS=60
EDUREACH_RATE_LIMIT_DOWNLOADS_MAX=60
EDUREACH_RATE_LIMIT_DOWNLOADS_WINDOW_SECONDS=60
EDUREACH_ADMIN_DEBUG_SECRET=
# Optional/reference only:
WIX_ACCOUNT_ID=
```

Use `.env.example` as a reference only. Do not commit `.env.local`.

Use long random values for `EDUREACH_RATE_LIMIT_SECRET` and `EDUREACH_ADMIN_DEBUG_SECRET` in Vercel. Do not commit real secret values.

## 6. Collection permissions and publishing

For every CMS collection:

- Use the exact collection IDs and field IDs below.
- Enable read access for the Headless API.
- Use Wix CMS built-in draft/publish controls.
- Do not create a separate manual `status` field.
- Unpublished or draft Wix items should stay hidden from the website.
- Workshop and gallery albums also require `consentConfirmed` to be true.

## 7. Articles collection

Collection ID: `articles`

| Field ID | Wix field type | Notes |
|---|---|---|
| `title` | Text | Required |
| `slug` | Text | Optional; if missing, the website generates a URL-safe slug from `title` |
| `excerpt` | Text | Short card summary |
| `content` | Rich Content | Article body |
| `featuredImage` | Image | Main image |
| `imageAlt` | Text | Alternative text for the image |
| `author` | Text | Author name |
| `publishDate` | Date and Time | Used for sorting |
| `category` | Text | Category label |
| `tags` | Tags | Optional keywords |
| `references` | Rich Content or Text | Citations or reading list |
| `featured` | Boolean | Featured items sort first |
| `seoTitle` | Text | Optional SEO title |
| `seoDescription` | Text | Optional meta description |

## 8. Blog Posts collection

Collection ID: `blogPosts`

| Field ID | Wix field type | Notes |
|---|---|---|
| `title` | Text | Required |
| `slug` | Text | Optional but recommended; code can generate one from title |
| `excerpt` | Text | Short card summary |
| `content` | Rich Content or Text | Main post body |
| `featuredImage` | Image | Optional card/detail image |
| `imageAlt` | Text | Alternative text |
| `author` | Text | Optional |
| `publishDate` | Date and Time | Used for sorting |
| `category` | Text | Category label |
| `tags` | Tags or Text | Optional |
| `featured` | Boolean | Featured posts sort first |
| `seoTitle` | Text | Optional SEO title |
| `seoDescription` | Text | Optional meta description |

## 9. Ebooks collection

Collection ID: `Import5`

This collection is intentionally simple. The owner should not need Wix Stores or manual payment links for the ebook workflow.

| Field ID | Wix field type | Notes |
|---|---|---|
| `title` | Text | Required |
| `coverImage` | Image | Ebook cover |
| `description` | Rich Content or Text | Full ebook description |
| `pdfFile` | Document | Uploaded PDF file |
| `price` | Number | Use `0` for free ebooks |
| `isFree` | Boolean | Yes/true means the PDF is downloadable |
| `paymentLink` | URL | Legacy/reference only. PayFast checkout ignores manual payment links. |
| `featured` | Boolean | Featured ebooks sort first |
| `publishedDate` | Date and Time | Used for sorting |

Website behavior:

- If `isFree` is true, the website shows a Download button for `pdfFile`.
- If `isFree` is false, the website shows Add to Cart and uses the CMS `price` during checkout validation.
- The code can generate a URL slug from the title, so the owner does not need to manage a slug for basic ebook setup.

## 10. Downloadable Resources collection

Collection ID: `downloadableResources`

| Field ID | Wix field type | Notes |
|---|---|---|
| `title` | Text | Required |
| `slug` | Text | Required, URL-safe and unique |
| `shortDescription` | Text | Card summary |
| `fullDescription` | Rich Content | Detail page content |
| `thumbnail` | Image | Card image |
| `thumbnailAlt` | Text | Alternative text |
| `category` | Text | Category label |
| `tags` | Tags | Optional keywords |
| `resourceFile` | Document | Resource file. Paid files are hidden until PayFast confirms the order. |
| `fileType` | Text | PDF, DOCX, ZIP, etc. |
| `author` | Text | Optional author |
| `publicationDate` | Date and Time | Used for sorting |
| `accessType` | Dropdown | `free` or `paid` |
| `price` | Number | Paid resources |
| `purchaseLink` | URL | Legacy/reference only. PayFast checkout ignores manual payment links. |
| `storeProductId` | Text | Optional reference field |
| `previewAllowed` | Boolean | Whether public preview is allowed |
| `featured` | Boolean | Featured items sort first |
| `seoTitle` | Text | Optional SEO title |
| `seoDescription` | Text | Optional meta description |

For paid resources, set `accessType` to `paid`, add `price`, and upload the final file to `resourceFile`. The public CMS API hides paid file URLs; downloads are returned only for paid orders.

## 11. Workshop Albums collection

Collection ID: `workshopAlbums`

| Field ID | Wix field type | Notes |
|---|---|---|
| `title` | Text | Required |
| `slug` | Text | Required, URL-safe and unique |
| `workshopDate` | Date and Time | Used for sorting |
| `location` | Text | Workshop location |
| `description` | Rich Content or Text | Album description |
| `coverImage` | Image | Album cover |
| `coverAlt` | Text | Alternative text |
| `mediaGallery` | Media Gallery | Multiple approved images |
| `photographerCredit` | Text | Optional |
| `relatedProgramme` | Text | Optional |
| `consentConfirmed` | Boolean | Must be true to show publicly |
| `featured` | Boolean | Featured items sort first |

Only publish albums after written media consent has been confirmed.

## 12. Gallery Albums collection

Collection ID: `galleryAlbums`

| Field ID | Wix field type | Notes |
|---|---|---|
| `title` | Text | Required |
| `slug` | Text | Required, URL-safe and unique |
| `description` | Rich Content or Text | Album description |
| `albumDate` | Date and Time | Used for sorting |
| `location` | Text | Optional |
| `category` | Text | Category label |
| `coverImage` | Image | Album cover |
| `coverAlt` | Text | Alternative text |
| `mediaGallery` | Media Gallery | Multiple approved images |
| `imageCredits` | Text | Optional |
| `consentConfirmed` | Boolean | Must be true to show publicly |
| `featured` | Boolean | Featured items sort first |

Only publish albums after written media consent has been confirmed.

## 13. Category labels

No separate category collection is required. Use the `category` text field inside Articles, Blog Posts, Downloadable Resources and Gallery Albums. Keep category names short and consistent, such as Inclusion, Parent Guidance or Learner Support.

## 14. Blog Posts setup

1. Open CMS -> Blog Posts.
2. Confirm the collection ID is `blogPosts`.
3. Add real blog posts in the Blog Posts CMS collection.
4. Publish the posts in Wix.

If Blog Posts permissions are missing, `/blog` and `/blog/[slug]` show the normal empty/error state without fake posts. The API type is `blogs`, for example `/api/wix-content?type=blogs`.

## 15. Team Members collection

Collection ID: `teamMembers`

| Field ID | Wix field type | Notes |
|---|---|---|
| `name` | Text | Required; displayed as the team member name |
| `slug` | Text | Optional; generated from `name` when blank |
| `role` | Text | Role or professional title |
| `shortBio` | Text | Card summary |
| `biography` | Rich Content | Detail page body |
| `profileImage` | Image | Profile photo |
| `photoAlt` | Text | Accessible image description |
| `qualifications` | Text | Optional |
| `specialties` | Tags | Optional |
| `email` | Text | Optional public email link |
| `linkedinUrl` | URL | Optional public profile link |
| `featured` | Boolean | Optional homepage priority |

## 16. Partners / Sponsors collection

Collection ID: `partnersSponsors`

| Field ID | Wix field type | Notes |
|---|---|---|
| `partnerName` | Text | Required; organization or sponsor name |
| `slug` | Text | Optional; generated from `partnerName` when blank |
| `partnerType` | Text or Dropdown | Partner, sponsor, funder, school or community organization |
| `sponsorTier` | Text or Dropdown | Optional sponsorship tier |
| `description` | Rich Content or Text | Detail page body |
| `contribution` | Text | Card/detail summary of support |
| `logo` | Image | Partner or sponsor logo |
| `logoAlt` | Text | Accessible image description |
| `websiteUrl` | URL | Optional public website action |
| `featured` | Boolean | Optional homepage priority |

## 17. Testimonials collection

Collection ID: `testimonials`

| Field ID | Wix field type | Notes |
|---|---|---|
| `clientName` | Text | Required when `title` is blank |
| `title` | Text | Optional testimonial headline |
| `slug` | Text | Optional; generated from title/client name when blank |
| `quote` | Text or Rich Content | Testimonial text |
| `organization` | Text | School, parent group, partner or community |
| `role` | Text | Optional person role |
| `photo` | Image | Optional person or organization image |
| `testimonialDate` | Date and Time | Optional |
| `rating` | Number | Optional |
| `featured` | Boolean | Optional homepage priority |

## 18. Paid digital products

Paid ebooks and downloadable resources use the site cart plus PayFast checkout. Do not add manual payment links.

1. Add the product to Wix CMS.
2. Upload the PDF or resource file to the correct CMS file field.
3. Set `isFree` to false for paid ebooks, or `accessType` to `paid` for paid downloads.
4. Add the paid `price`.
5. Confirm PayFast environment variables are configured in Vercel.
6. Set the PayFast ITN/notify URL to `https://edureach.network/api/payfast/notify`.

The website displays the price and Add to Cart button for paid resources, but it never prints protected paid file URLs in public CMS or order responses. The `/payment-success` page and resource detail pages ask `/api/orders` for server-confirmed status with the purchasing browser's order access token. Paid files are delivered through `/api/downloads` only after the order, token, paid status, product and short-lived download signature are verified. Pending, cancelled and failed payments do not receive download URLs.

## 19. Create test content

1. Create one draft article and confirm it does not appear publicly.
2. Publish one article and confirm it appears under Resources and `/resources/articles`.
3. Create one free download with a public test PDF.
4. Create one paid ebook with `isFree` false and a test price.
5. Create one workshop album with `consentConfirmed` false and confirm it stays hidden.
6. Set `consentConfirmed` true and publish the album to confirm it appears.

## 20. Test the connection locally

1. Copy `.env.example` to `.env.local`.
2. Fill in real Wix values locally.
3. Run `npm install`.
4. Run `npm run lint`.
5. Run `npm run typecheck`.
6. Run `npm run build`.
7. Start a local server or Vercel dev environment and open the Resources and cart pages.

## 21. Test the connection on Vercel

1. Add the same environment variables in Vercel.
2. Redeploy after adding variables.
3. Check `/api/wix-content?status=1` on the preview deployment. The public response should only show `healthy` or `unavailable`.
4. Check `/`, `/resources/articles`, `/resources/ebooks`, `/resources/downloads`, `/resources/workshops`, `/resources/gallery`, `/blog`, `/team`, `/partners`, and `/testimonials`.
5. Confirm pages work when a collection is empty.
6. If a collection fails in production, check Vercel Function logs first. Debug JSON requires `debug=1` plus the `x-edureach-admin-secret` request header matching `EDUREACH_ADMIN_DEBUG_SECRET`; do not expose the secret in a public URL or support ticket.

## 22. Cache and revalidation

The Vercel API response uses `s-maxage=300, stale-while-revalidate=600`. Newly published Wix content can take a few minutes to appear without a new deployment.
