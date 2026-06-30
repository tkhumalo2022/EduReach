# Quick Wix setup checklist for EduReach

Use this checklist with `docs/wix-cms-setup.md` and `docs/edureach-owner-guide.md`. It is designed for a fast first setup, not for storing private credentials in the repository.

## Important rules

- Keep the current EduReach website on GitHub and Vercel.
- Use Wix only as the content dashboard.
- Do not create a separate admin dashboard.
- Do not create a manual `status` field. Use Wix draft, publish and unpublish controls.
- For paid ebooks, use `paymentLink`; Wix Stores is not required for the basic ebook workflow.
- Do not upload protected paid resource files to public CMS file fields.
- Do not publish workshop or gallery albums unless `consentConfirmed` is true.
- Delete or unpublish the sample records before the real site goes live.

## One-go setup order

1. Open the EduReach Wix site or Wix Headless project.
2. Install Wix CMS / Content Manager.
3. Install Wix Blog if EduReach will use `/blog`.
4. Install Wix Stores only if paid downloadable resources need Wix-managed checkout or secure store delivery.
5. Create the six CMS collections listed below.
6. Add the exact fields listed in `docs/wix-cms-templates/README.md`.
7. Set CMS read permissions so the Headless API can read published items.
8. Create or open the Wix OAuth app for the website.
9. Copy the Wix Client ID and Site ID. Copy the Account ID only if you want to keep it for reference.
10. Add the Vercel environment variables listed below.
11. Add one sample item to each Wix collection.
12. Publish only the sample items you want to test.
13. Redeploy or refresh the Vercel preview after adding env vars.
14. Run the testing checklist at the bottom of this file.

## Collections to create

| Collection name in Wix | Collection ID expected by code | Template file |
|---|---|---|
| Articles | `Articles` | `docs/wix-cms-templates/Articles.sample.csv` |
| Ebooks | `Ebooks` | `docs/wix-cms-templates/Ebooks.sample.csv` |
| Downloadable Resources | `DownloadableResources` | `docs/wix-cms-templates/DownloadableResources.sample.csv` |
| Workshop Albums | `WorkshopAlbums` | `docs/wix-cms-templates/WorkshopAlbums.sample.csv` |
| Gallery Albums | `GalleryAlbums` | `docs/wix-cms-templates/GalleryAlbums.sample.csv` |
| Category helper collection | `Import6` | `docs/wix-cms-templates/Categories.sample.csv` |

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
WIX_ARTICLES_COLLECTION_ID=Articles
WIX_EBOOKS_COLLECTION_ID=Ebooks
WIX_DOWNLOADS_COLLECTION_ID=DownloadableResources
WIX_WORKSHOP_ALBUMS_COLLECTION_ID=WorkshopAlbums
WIX_GALLERY_ALBUMS_COLLECTION_ID=GalleryAlbums
WIX_CATEGORIES_COLLECTION_ID=Import6
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
- Wix Blog is installed if `/blog` is needed.
- Wix Stores is installed only if paid downloadable resources need Wix-managed checkout or secure store delivery.
- Headless project has Read Data Items permission.
- Headless project has Read Data Collections permission.
- Headless project has Read Blog Posts permission if Wix Blog is used.
- Headless project has Store/Product/Checkout read permissions only if Wix Stores is used.

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
| `/blog` | Wix Blog posts appear if Wix Blog is installed and permitted, or the empty state appears |

Also check:

- Free ebooks show a Download button when `isFree` is true and `pdfFile` is uploaded.
- Paid ebooks show a Buy Now button when `isFree` is false and `paymentLink` is filled in.
- Paid ebooks show Coming Soon when `isFree` is false and `paymentLink` is empty.
- Paid resources show a Buy button only when `purchaseLink` is filled in.
- Paid resources do not expose protected file URLs.
- Free resources show a download button only when the public file is uploaded.
- Search, category filter and Load More work on listing pages when enough content exists.
- Mobile pages still load without layout overlap.
