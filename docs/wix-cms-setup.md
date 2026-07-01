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
WIX_ARTICLES_COLLECTION_ID=Import1
WIX_EBOOKS_COLLECTION_ID=Import5
WIX_DOWNLOADS_COLLECTION_ID=Import2
WIX_WORKSHOP_ALBUMS_COLLECTION_ID=Import3
WIX_GALLERY_ALBUMS_COLLECTION_ID=Import4
WIX_CATEGORIES_COLLECTION_ID=Import6
# Set to the exact Blogs collection ID Wix shows, for example Blogs or Import2.
WIX_BLOGS_COLLECTION_ID=
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
PAYFAST_PASSPHRASE=
PAYFAST_MODE=sandbox
# Optional/reference only:
WIX_ACCOUNT_ID=
```

Set `WIX_BLOGS_COLLECTION_ID` to the exact Blogs CMS collection ID Wix shows. Use `Import2` only if that is the ID Wix shows for the Blogs collection.

Use `.env.example` as a reference only. Do not commit `.env.local`.

## 6. Collection permissions and publishing

For every CMS collection:

- Use the exact collection IDs and field IDs below.
- Enable read access for the Headless API.
- Use Wix CMS built-in draft/publish controls.
- Do not create a separate manual `status` field.
- Unpublished or draft Wix items should stay hidden from the website.
- Workshop and gallery albums also require `consentConfirmed` to be true.

## 7. Articles collection

Collection ID: `Import1`

| Field ID | Wix field type | Notes |
|---|---|---|
| `title` | Text | Required |
| `slug` | Text | Required, URL-safe and unique |
| `excerpt` | Text | Short card summary |
| `content` | Rich Content | Article body |
| `featuredImage` | Image | Main image |
| `imageAlt` | Text | Alternative text for the image |
| `author` | Text | Author name |
| `publishDate` | Date and Time | Used for sorting |
| `category` | Reference to Categories or Text | Category label |
| `tags` | Tags | Optional keywords |
| `references` | Rich Content or Text | Citations or reading list |
| `featured` | Boolean | Featured items sort first |
| `seoTitle` | Text | Optional SEO title |
| `seoDescription` | Text | Optional meta description |

## 8. Blogs collection

Collection ID: set `WIX_BLOGS_COLLECTION_ID` to the exact Blogs CMS collection ID Wix shows, for example `Blogs` or `Import2`.

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
| `category` | Reference to Import6 or Text | Category label |
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

## 10. DownloadableResources collection

Collection ID: `Import2`

| Field ID | Wix field type | Notes |
|---|---|---|
| `title` | Text | Required |
| `slug` | Text | Required, URL-safe and unique |
| `shortDescription` | Text | Card summary |
| `fullDescription` | Rich Content | Detail page content |
| `thumbnail` | Image | Card image |
| `thumbnailAlt` | Text | Alternative text |
| `category` | Reference to Categories or Text | Category label |
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

## 11. WorkshopAlbums collection

Collection ID: `Import3`

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

## 12. GalleryAlbums collection

Collection ID: `Import4`

| Field ID | Wix field type | Notes |
|---|---|---|
| `title` | Text | Required |
| `slug` | Text | Required, URL-safe and unique |
| `description` | Rich Content or Text | Album description |
| `albumDate` | Date and Time | Used for sorting |
| `location` | Text | Optional |
| `category` | Reference to Categories or Text | Category label |
| `coverImage` | Image | Album cover |
| `coverAlt` | Text | Alternative text |
| `mediaGallery` | Media Gallery | Multiple approved images |
| `imageCredits` | Text | Optional |
| `consentConfirmed` | Boolean | Must be true to show publicly |
| `featured` | Boolean | Featured items sort first |

Only publish albums after written media consent has been confirmed.

## 13. Category helper collection

Collection ID: `Import6`

| Field ID | Wix field type | Notes |
|---|---|---|
| `name` | Text | Required |
| `slug` | Text | Required, URL-safe and unique |
| `description` | Text | Optional |
| `resourceType` | Dropdown | Article, Ebook, Download, Workshop, Gallery, Blog |
| `active` | Boolean | Only active categories are used |

## 14. Blogs setup

1. Open CMS -> Blogs if a separate Blogs collection exists.
2. Add its real collection ID to `WIX_BLOGS_COLLECTION_ID`.
3. Add real blog posts in the Blogs CMS collection.
4. Publish the posts in Wix.

If a Blogs collection ID is missing or permissions are missing, `/blog` and `/blog/[slug]` show the normal empty/error state without fake posts. The API type is `blogs`, for example `/api/wix-content?type=blogs`.

## 15. Paid digital products

Paid ebooks and downloadable resources use the site cart plus PayFast checkout. Do not add manual payment links.

1. Add the product to Wix CMS.
2. Upload the PDF or resource file to the correct CMS file field.
3. Set `isFree` to false for paid ebooks, or `accessType` to `paid` for paid downloads.
4. Add the paid `price`.
5. Confirm PayFast environment variables are configured in Vercel.

The website displays the price and Add to Cart button for paid resources, but it never prints protected paid file URLs in public CMS responses.

## 16. Create test content

1. Create one draft article and confirm it does not appear publicly.
2. Publish one article and confirm it appears under Resources and `/resources/articles`.
3. Create one free download with a public test PDF.
4. Create one paid ebook with `isFree` false and a test price.
5. Create one workshop album with `consentConfirmed` false and confirm it stays hidden.
6. Set `consentConfirmed` true and publish the album to confirm it appears.

## 17. Test the connection locally

1. Copy `.env.example` to `.env.local`.
2. Fill in real Wix values locally.
3. Run `npm install`.
4. Run `npm run lint`.
5. Run `npm run typecheck`.
6. Run `npm run build`.
7. Start a local server or Vercel dev environment and open the Resources and cart pages.

## 18. Test the connection on Vercel

1. Add the same environment variables in Vercel.
2. Redeploy after adding variables.
3. Check `/api/wix-content?status=1` on the preview deployment.
4. Check `/`, `/resources/articles`, `/resources/ebooks`, `/resources/downloads`, `/resources/workshops`, `/resources/gallery`, and `/blog`.
5. Confirm pages work when a collection is empty.
6. If a collection fails, add `debug=1` to the API URL, for example `/api/wix-content?type=articles&limit=1&debug=1`, and check the sanitized Wix error in the JSON response and Vercel logs.

## 19. Cache and revalidation

The Vercel API response uses `s-maxage=300, stale-while-revalidate=600`. Newly published Wix content can take a few minutes to appear without a new deployment.
