# EduReach Wix CMS sample templates

These helper files are for fast Wix setup. They are not final production content.

Use the `.sample.csv` files as copy-paste references while creating test records. Wix media fields usually need manual uploads in the Wix dashboard, so image, document and media gallery sample cells say what to upload rather than using real URLs.

## Articles fields

| Field ID | Wix field type | Sample value |
|---|---|---|
| `title` | Text | Sample Article: Inclusive Classroom Support |
| `slug` | Text | sample-inclusive-classroom-support |
| `excerpt` | Text | A short sample summary for testing the Articles page. |
| `content` | Rich Content | Use a few paragraphs in Wix Rich Content. |
| `featuredImage` | Image | Upload a sample image in Wix. |
| `imageAlt` | Text | Teacher supporting learners in a classroom |
| `author` | Text | EduReach Team |
| `publishDate` | Date and Time | 2026-07-01 |
| `category` | Reference to Categories or Text | Inclusion |
| `tags` | Tags | inclusion, learner support |
| `references` | Rich Content or Text | Sample references for testing only. |
| `featured` | Boolean | true |
| `seoTitle` | Text | Sample Article: Inclusive Classroom Support |
| `seoDescription` | Text | Sample SEO description for testing article pages. |

## Blogs fields

| Field ID | Wix field type | Sample value |
|---|---|---|
| `title` | Text | Sample Blog: Inclusive Classroom Note |
| `slug` | Text | sample-inclusive-classroom-note |
| `excerpt` | Text | Sample only. Replace this with a real EduReach blog summary. |
| `content` | Rich Content | Use a few paragraphs in Wix Rich Content. |
| `featuredImage` | Image | Upload a sample blog image in Wix. |
| `imageAlt` | Text | Sample inclusive classroom image |
| `author` | Text | EduReach |
| `publishDate` | Date and Time | 2026-07-01 |
| `category` | Reference to Categories or Text | Inclusion |
| `tags` | Tags | inclusion, classroom support |
| `featured` | Boolean | true |
| `seoTitle` | Text | Sample Blog: Inclusive Classroom Note |
| `seoDescription` | Text | Sample blog post for testing EduReach Blogs. |

## Ebooks fields

| Field ID | Wix field type | Sample value |
|---|---|---|
| `title` | Text | Sample Ebook: Parent Support Guide |
| `coverImage` | Image | Upload a sample cover in Wix. |
| `description` | Rich Content or Text | A simple ebook description. |
| `pdfFile` | Document | Upload the ebook PDF in Wix. |
| `price` | Number | 0 for free sample |
| `isFree` | Boolean | true for free, false for paid |
| `paymentLink` | URL | Optional link for paid ebooks |
| `featured` | Boolean | true |
| `publishedDate` | Date and Time | 2026-07-01 |

Free ebook sample: set `isFree` to true and upload the PDF. Paid ebook sample: set `isFree` to false and add `paymentLink`. If a paid ebook has no `paymentLink`, the website shows Coming Soon.

## DownloadableResources fields

| Field ID | Wix field type | Sample value |
|---|---|---|
| `title` | Text | Sample Download: Learner Support Checklist |
| `slug` | Text | sample-learner-support-checklist |
| `shortDescription` | Text | A sample downloadable checklist summary. |
| `fullDescription` | Rich Content | Use a sample resource description. |
| `thumbnail` | Image | Upload a sample thumbnail in Wix. |
| `thumbnailAlt` | Text | Sample checklist thumbnail |
| `category` | Reference to Categories or Text | Learner Support |
| `tags` | Tags | checklist, school support |
| `resourceFile` | Document | Upload only if this is a free public sample. |
| `fileType` | Text | PDF |
| `author` | Text | EduReach Team |
| `publicationDate` | Date and Time | 2026-07-01 |
| `accessType` | Dropdown | free or paid |
| `price` | Number | 0 for free sample |
| `purchaseLink` | URL | Use only for paid sample products. |
| `storeProductId` | Text | Use only for paid Wix Stores products. |
| `previewAllowed` | Boolean | true |
| `featured` | Boolean | true |
| `seoTitle` | Text | Sample Download: Learner Support Checklist |
| `seoDescription` | Text | Sample SEO description for testing downloads. |

## WorkshopAlbums fields

| Field ID | Wix field type | Sample value |
|---|---|---|
| `title` | Text | Sample Workshop Album |
| `slug` | Text | sample-workshop-album |
| `workshopDate` | Date and Time | 2026-07-01 |
| `location` | Text | Richards Bay |
| `description` | Rich Content or Text | Sample workshop album for testing only. |
| `coverImage` | Image | Upload an approved sample image in Wix. |
| `coverAlt` | Text | Sample workshop image |
| `mediaGallery` | Media Gallery | Upload approved sample images in Wix. |
| `photographerCredit` | Text | Sample credit |
| `relatedProgramme` | Text | Inclusive Education Workshop |
| `consentConfirmed` | Boolean | true only after consent is confirmed |
| `featured` | Boolean | false |

## GalleryAlbums fields

| Field ID | Wix field type | Sample value |
|---|---|---|
| `title` | Text | Sample Gallery Album |
| `slug` | Text | sample-gallery-album |
| `description` | Rich Content or Text | Sample gallery album for testing only. |
| `albumDate` | Date and Time | 2026-07-01 |
| `location` | Text | Richards Bay |
| `category` | Reference to Categories or Text | Community |
| `coverImage` | Image | Upload an approved sample image in Wix. |
| `coverAlt` | Text | Sample gallery image |
| `mediaGallery` | Media Gallery | Upload approved sample images in Wix. |
| `imageCredits` | Text | Sample credit |
| `consentConfirmed` | Boolean | true only after consent is confirmed |
| `featured` | Boolean | false |

## Categories fields

| Field ID | Wix field type | Sample value |
|---|---|---|
| `name` | Text | Inclusion |
| `slug` | Text | inclusion |
| `description` | Text | Inclusive education resources and updates. |
| `resourceType` | Dropdown | Article, Ebook, Download, Workshop, Gallery or Blog |
| `active` | Boolean | true |

## Sample file list

- `Articles.sample.csv`
- `Blogs.sample.csv`
- `Ebooks.sample.csv`
- `DownloadableResources.sample.csv`
- `WorkshopAlbums.sample.csv`
- `GalleryAlbums.sample.csv`
- `Categories.sample.csv`

After testing, unpublish or delete the sample records before adding final EduReach content.
