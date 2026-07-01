# Quick Wix setup checklist for EduReach

Use this checklist with `docs/wix-cms-setup.md` and `docs/edureach-owner-guide.md`. It is designed for a fast first setup, not for storing private credentials in the repository.

## Important rules

- Keep the current EduReach website on GitHub and Vercel.
- Use Wix only as the content dashboard.
- Do not create a separate admin dashboard.
- Do not create a manual `status` field. Use Wix draft, publish and unpublish controls.
- For paid ebooks and resources, use CMS price fields plus PayFast checkout. Do not add manual payment links.
- Paid files can be uploaded to CMS file fields; the website hides them until PayFast confirms a paid order.
- Do not publish workshop or gallery albums unless `consentConfirmed` is true.
- Delete or unpublish the sample records before the real site goes live.

## One-go setup order

1. Open the EduReach Wix site or Wix Headless project.
2. Install Wix CMS / Content Manager.
3. Create the six CMS collections listed below.
4. Add the exact fields listed in `docs/wix-cms-templates/README.md`.
5. Set CMS read permissions so the Headless API can read published items.
6. Create or open the Wix OAuth app for the website.
7. Copy the Wix Client ID and Site ID. Copy the Account ID only if you want to keep it for reference.
8. Add the Vercel environment variables listed below, including PayFast.
9. Add one sample item to each Wix collection.
10. Publish only the sample items you want to test.
11. Redeploy or refresh the Vercel preview after adding env vars.
12. Run the testing checklist at the bottom of this file.

## Collections to create

| Collection name in Wix | Collection ID expected by code | Template file |
|---|---|---|
| Articles | `Import1` | `docs/wix-cms-templates/Articles.sample.csv` |
| DownloadableResources | `Import2` | `docs/wix-cms-templates/DownloadableResources.sample.csv` |
| WorkshopAlbums | `Import3` | `docs/wix-cms-templates/WorkshopAlbums.sample.csv` |
| GalleryAlbums | `Import4` | `docs/wix-cms-templates/GalleryAlbums.sample.csv` |
| Ebooks | `Import5` | `docs/wix-cms-templates/Ebooks.sample.csv` |
| Category helper collection | `Import6` | `docs/wix-cms-templates/Categories.sample.csv` |

Set `WIX_BLOGS_COLLECTION_ID` to the exact Blogs CMS collection ID Wix shows, for example `Blogs` or `Import2`.

## Fast sample data workflow

1. Open `docs/wix-cms-templates/README.md`.
2. Create the fields in Wix using the exact field IDs and field types.
3. Open each `.sample.csv` file and use it as copy-paste sample data.
4. For Image, Document and Media Gallery fields, upload files directly in Wix instead of pasting URLs.
5. Publish the sample item only after the required fields are complete.
6. Confirm the item appears on the matching website page.
7. Unpublish or delete the sample item before adding real EduReach content.

## Vercel environment variable checklist

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

Check each value:

- `NEXT_PUBLIC_WIX_CLIENT_ID`: copied from the Wix OAuth app.
- `WIX_SITE_ID`: copied from Wix site/project settings.
- `WIX_ACCOUNT_ID`: optional/reference only; CMS loading does not require it.
- Collection env vars: match the exact collection IDs above.
- Do not add real values to `.env.example`.
- Do not commit `.env.local`.

## Wix app and permission checklist

- Wix CMS / Content Manager is installed.
- Headless project has Read Data Items permission.
- Headless project has Read Data Collections permission.

## Final testing checklist

After Vercel env vars are saved and a preview/production deployment is available, test these URLs:

| URL | Expected result |
|---|---|
| `/api/wix-content?status=1` | JSON response with `ok: true`; missing env vars list should be empty after setup |
| `/resources/articles` | Page loads and published Articles appear, or the empty state appears |
| `/resources/ebooks` | Page loads and published Ebooks appear, or the empty state appears |
| `/resources/downloads` | Page loads and published DownloadableResources appear, or the empty state appears |
| `/resources/workshops` | Page loads and only published albums with `consentConfirmed=true` appear |
| `/resources/gallery` | Page loads and only published albums with `consentConfirmed=true` appear |
| `/blog` | Page loads and published Blogs appear, or the empty state appears |
| `/api/wix-content?type=blogs` | JSON response with the Blogs CMS list or the normal empty state |

Also check:

- Free ebooks show a Download button when `isFree` is true and `pdfFile` is uploaded.
- Paid ebooks show Add to Cart when `isFree` is false and a paid price is set.
- Paid resources show Add to Cart when `accessType` is paid and a paid price is set.
- `/cart` and `/checkout` load with the cart badge and PayFast checkout button.
- Paid resources do not expose protected file URLs.
- Free resources show a download button only when the public file is uploaded.
- Search, category filter and Load More work on listing pages when enough content exists.
- Mobile pages still load without layout overlap.
