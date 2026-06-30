# Wix CMS setup for EduReach

EduReach remains a GitHub/Vercel website. Wix is used only as the headless content dashboard for articles, ebooks, downloads, albums, blog posts and paid digital products.

## 1. Create or open the Wix Headless project

1. Sign in to Wix.
2. Open the EduReach Wix site or create a Wix Headless project for EduReach.
3. Keep ownership, billing and domain settings in Wix/Vercel as they already are.
4. Do not paste private credentials into GitHub.

## 2. Install required Wix applications

Install these Wix apps:

- Wix CMS / Content Manager
- Wix Blog, if `/blog` should show Wix Blog posts
- Wix Stores, only if paid downloadable resources need Wix-managed checkout or secure store delivery

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
- Read Blog Posts, if Wix Blog is used
- Read Products / Checkout, only if Wix Stores is used for paid downloadable resources

The website only reads published content. It does not create, update or delete Wix content.

## 5. Vercel environment variables

Add these in Vercel Project Settings -> Environment Variables for Production, Preview and Development:

```text
NEXT_PUBLIC_WIX_CLIENT_ID=
WIX_SITE_ID=
WIX_ARTICLES_COLLECTION_ID=Articles
WIX_EBOOKS_COLLECTION_ID=Ebooks
WIX_DOWNLOADS_COLLECTION_ID=DownloadableResources
WIX_WORKSHOP_ALBUMS_COLLECTION_ID=WorkshopAlbums
WIX_GALLERY_ALBUMS_COLLECTION_ID=GalleryAlbums
WIX_CATEGORIES_COLLECTION_ID=Categories
# Optional/reference only:
WIX_ACCOUNT_ID=
```

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

Collection ID: `Articles`

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

## 8. Ebooks collection

Collection ID: `Ebooks`

This collection is intentionally simple. The owner should not need Wix Stores for the basic ebook workflow.

| Field ID | Wix field type | Notes |
|---|---|---|
| `title` | Text | Required |
| `coverImage` | Image | Ebook cover |
| `description` | Rich Content or Text | Full ebook description |
| `pdfFile` | Document | Uploaded PDF file |
| `price` | Number | Use `0` for free ebooks |
| `isFree` | Boolean | Yes/true means the PDF is downloadable |
| `paymentLink` | URL | Optional link for paid ebooks |
| `featured` | Boolean | Featured ebooks sort first |
| `publishedDate` | Date and Time | Used for sorting |

Website behavior:

- If `isFree` is true, the website shows a Download button for `pdfFile`.
- If `isFree` is false and `paymentLink` is filled in, the website shows a Buy Now button.
- If `isFree` is false and `paymentLink` is empty, the website shows Coming Soon.
- The code can generate a URL slug from the title, so the owner does not need to manage a slug for basic ebook setup.

## 9. Downloadable Resources collection

Collection ID: `DownloadableResources`

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
| `resourceFile` | Document | Free resource file only |
| `fileType` | Text | PDF, DOCX, ZIP, etc. |
| `author` | Text | Optional author |
| `publicationDate` | Date and Time | Used for sorting |
| `accessType` | Dropdown | `free` or `paid` |
| `price` | Number | Paid resources |
| `purchaseLink` | URL | Wix Stores product or checkout URL |
| `storeProductId` | Text | Wix Stores product ID for owner reference |
| `previewAllowed` | Boolean | Whether public preview is allowed |
| `featured` | Boolean | Featured items sort first |
| `seoTitle` | Text | Optional SEO title |
| `seoDescription` | Text | Optional meta description |

For paid resources, do not place the protected final file in `resourceFile`. Use Wix Stores for secure delivery.

## 10. Workshop Albums collection

Collection ID: `WorkshopAlbums`

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

## 11. Gallery Albums collection

Collection ID: `GalleryAlbums`

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

## 12. Categories collection

Collection ID: `Categories`

| Field ID | Wix field type | Notes |
|---|---|---|
| `name` | Text | Required |
| `slug` | Text | Required, URL-safe and unique |
| `description` | Text | Optional |
| `resourceType` | Dropdown | Article, Ebook, Download, Workshop, Gallery, Blog |
| `active` | Boolean | Only active categories are used |

## 13. Wix Blog setup

1. Install Wix Blog.
2. Add Read Blog Posts permission to the Headless project.
3. Add real blog posts in Wix Blog.
4. Publish the posts in Wix.

If Wix Blog is not installed or permissions are missing, `/blog` and `/blog/[slug]` show the normal empty/error state without fake posts.

## 14. Paid digital products

For basic paid ebooks, Wix Stores is not required. Add the payment page URL to the ebook `paymentLink` field. This can be a Wix payment link, Stripe link, PayFast link, invoice link or any approved checkout URL.

For paid downloadable resources that need protected file delivery through Wix Stores:

1. Create the digital product in Wix Stores.
2. Upload the protected file to Wix Stores, not to a public CMS file field.
3. Configure checkout, payment and delivery in Wix Stores.
4. Copy the Wix Stores product ID into `storeProductId`.
5. Copy the product or checkout URL into `purchaseLink`.
6. Set `accessType` to `paid`, add `price`, and set `currency` to `ZAR` unless another currency is required.

The website displays the price and Buy button for paid resources, but it never prints protected paid file URLs.

## 15. Create test content

1. Create one draft article and confirm it does not appear publicly.
2. Publish one article and confirm it appears under Resources and `/resources/articles`.
3. Create one free download with a public test PDF.
4. Create one paid ebook with `isFree` false and a test `paymentLink`.
5. Create one workshop album with `consentConfirmed` false and confirm it stays hidden.
6. Set `consentConfirmed` true and publish the album to confirm it appears.

## 16. Test the connection locally

1. Copy `.env.example` to `.env.local`.
2. Fill in real Wix values locally.
3. Run `npm install`.
4. Run `npm run lint`.
5. Run `npm run typecheck`.
6. Run `npm run build`.
7. Start a local server or Vercel dev environment and open the Resources pages.

## 17. Test the connection on Vercel

1. Add the same environment variables in Vercel.
2. Redeploy after adding variables.
3. Check `/api/wix-content?status=1` on the preview deployment.
4. Check `/`, `/resources/articles`, `/resources/ebooks`, `/resources/downloads`, `/resources/workshops`, `/resources/gallery`, and `/blog`.
5. Confirm pages work when a collection is empty.

## 18. Cache and revalidation

The Vercel API response uses `s-maxage=300, stale-while-revalidate=600`. Newly published Wix content can take a few minutes to appear without a new deployment.
