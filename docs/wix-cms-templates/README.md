# EduReach Wix CMS sample templates

These helper files are for fast Wix setup. They are not final production content.

Use the `.sample.csv` files as copy-paste references while creating test records. Wix media fields usually need manual uploads in the Wix dashboard, so image, document and media gallery sample cells say what to upload rather than using real URLs.

## Articles fields

| Field ID | Wix field type | Sample value |
|---|---|---|
| `title` | Text | Sample Article: Inclusive Classroom Support |
| `slug` | Text | Optional; sample-inclusive-classroom-support |
| `excerpt` | Text | A short sample summary for testing the Articles page. |
| `content` | Rich Content | Use a few paragraphs in Wix Rich Content. |
| `featuredImage` | Image | Upload a sample image in Wix. |
| `imageAlt` | Text | Teacher supporting learners in a classroom |
| `author` | Text | EduReach Team |
| `publishDate` | Date and Time | 2026-07-01 |
| `category` | Text | Inclusion |
| `tags` | Tags | inclusion, learner support |
| `references` | Rich Content or Text | Sample references for testing only. |
| `featured` | Boolean | true |
| `seoTitle` | Text | Sample Article: Inclusive Classroom Support |
| `seoDescription` | Text | Sample SEO description for testing article pages. |

## Blog Posts fields

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
| `category` | Text | Inclusion |
| `tags` | Tags | inclusion, classroom support |
| `featured` | Boolean | true |
| `seoTitle` | Text | Sample Blog: Inclusive Classroom Note |
| `seoDescription` | Text | Sample blog post for testing EduReach Blog Posts. |

## Ebooks fields

| Field ID | Wix field type | Sample value |
|---|---|---|
| `title` | Text | Sample Ebook: Parent Support Guide |
| `coverImage` | Image | Upload a sample cover in Wix. |
| `description` | Rich Content or Text | A simple ebook description. |
| `pdfFile` | Document | Upload the ebook PDF in Wix. |
| `price` | Number | 0 for free sample |
| `isFree` | Boolean | true for free, false for paid |
| `paymentLink` | URL | Legacy/reference only. PayFast checkout ignores manual payment links. |
| `featured` | Boolean | true |
| `publishedDate` | Date and Time | 2026-07-01 |

Free ebook sample: set `isFree` to true and upload the PDF. Paid ebook sample: set `isFree` to false, add the paid price and upload the PDF. The website shows Add to Cart for paid ebooks.

## Downloadable Resources fields

| Field ID | Wix field type | Sample value |
|---|---|---|
| `title` | Text | Sample Download: Learner Support Checklist |
| `slug` | Text | sample-learner-support-checklist |
| `shortDescription` | Text | A sample downloadable checklist summary. |
| `fullDescription` | Rich Content | Use a sample resource description. |
| `thumbnail` | Image | Upload a sample thumbnail in Wix. |
| `thumbnailAlt` | Text | Sample checklist thumbnail |
| `category` | Text | Learner Support |
| `tags` | Tags | checklist, school support |
| `resourceFile` | Document | Upload the resource file. Paid files stay hidden until a paid order is confirmed. |
| `fileType` | Text | PDF |
| `author` | Text | EduReach Team |
| `publicationDate` | Date and Time | 2026-07-01 |
| `accessType` | Dropdown | free or paid |
| `price` | Number | 0 for free sample |
| `purchaseLink` | URL | Legacy/reference only. PayFast checkout ignores manual payment links. |
| `storeProductId` | Text | Optional reference field. |
| `previewAllowed` | Boolean | true |
| `featured` | Boolean | true |
| `seoTitle` | Text | Sample Download: Learner Support Checklist |
| `seoDescription` | Text | Sample SEO description for testing downloads. |

## Workshop Albums fields

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

## Gallery Albums fields

| Field ID | Wix field type | Sample value |
|---|---|---|
| `title` | Text | Sample Gallery Album |
| `slug` | Text | sample-gallery-album |
| `description` | Rich Content or Text | Sample gallery album for testing only. |
| `albumDate` | Date and Time | 2026-07-01 |
| `location` | Text | Richards Bay |
| `category` | Text | Community |
| `coverImage` | Image | Upload an approved sample image in Wix. |
| `coverAlt` | Text | Sample gallery image |
| `mediaGallery` | Media Gallery | Upload approved sample images in Wix. |
| `imageCredits` | Text | Sample credit |
| `consentConfirmed` | Boolean | true only after consent is confirmed |
| `featured` | Boolean | false |

## Team Members fields

| Field ID | Wix field type | Sample value |
|---|---|---|
| `name` | Text | Sample Team Member |
| `slug` | Text | sample-team-member |
| `role` | Text | Inclusion Specialist |
| `shortBio` | Text | Short profile summary for the team card. |
| `biography` | Rich Content | Longer profile body for the detail page. |
| `profileImage` | Image | Upload a profile photo in Wix. |
| `photoAlt` | Text | Sample team member portrait |
| `qualifications` | Text | Sample qualification |
| `specialties` | Tags | inclusion, learner support |
| `email` | Text | team@example.com |
| `linkedinUrl` | URL | https://example.com |
| `featured` | Boolean | true |

## Partners / Sponsors fields

| Field ID | Wix field type | Sample value |
|---|---|---|
| `partnerName` | Text | Sample Partner |
| `slug` | Text | sample-partner |
| `partnerType` | Text or Dropdown | Community Partner |
| `sponsorTier` | Text or Dropdown | Gold |
| `description` | Rich Content or Text | Sample partner description. |
| `contribution` | Text | Supports inclusive education workshops. |
| `logo` | Image | Upload a partner logo in Wix. |
| `logoAlt` | Text | Sample partner logo |
| `websiteUrl` | URL | https://example.com |
| `featured` | Boolean | true |

## Testimonials fields

| Field ID | Wix field type | Sample value |
|---|---|---|
| `clientName` | Text | Sample Parent Community |
| `title` | Text | Sample Testimonial |
| `slug` | Text | sample-testimonial |
| `quote` | Text or Rich Content | EduReach helped us understand learner support. |
| `organization` | Text | Sample School |
| `role` | Text | Parent representative |
| `photo` | Image | Upload a testimonial image in Wix. |
| `testimonialDate` | Date and Time | 2026-07-01 |
| `rating` | Number | 5 |
| `featured` | Boolean | true |

## Sample file list

- `Articles.sample.csv`
- `Blogs.sample.csv`
- `Ebooks.sample.csv`
- `DownloadableResources.sample.csv`
- `WorkshopAlbums.sample.csv`
- `GalleryAlbums.sample.csv`
- `TeamMembers.sample.csv`
- `PartnersSponsors.sample.csv`
- `Testimonials.sample.csv`

After testing, unpublish or delete the sample records before adding final EduReach content.
