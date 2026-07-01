# EduReach owner guide: managing website content in Wix

The EduReach website still lives on GitHub and Vercel. Wix is the content dashboard. When an item is published in Wix, it can appear on the EduReach website after the cache refreshes.

## Add and publish an article

1. Open Wix Dashboard -> CMS -> Articles.
2. Add a new item.
3. Add `title`, `excerpt`, `content`, `featuredImage`, `imageAlt`, `author`, `publishDate`, `category`, `tags`, and SEO fields. Add `slug` only if the field already exists and you need a custom URL.
4. Turn on `featured` only if the article should appear first.
5. Save the item as a draft if it is not ready.
6. Use Wix Publish when it is ready for the website.

## Add an ebook

1. Open CMS -> Ebooks.
2. Add the ebook `title`.
3. Upload the ebook cover to `coverImage`.
4. Add the ebook summary or full text to `description`.
5. Upload the PDF to `pdfFile`.
6. Add the `price`.
7. Set `isFree` to true/yes if the ebook should be free.
8. Set `isFree` to false/no if the ebook should be paid.
9. Turn on `featured` only if the ebook should appear first.
10. Add `publishedDate`.
11. Publish in Wix when it is ready.

## Free and paid ebook behavior

- Free ebook: set `isFree` to yes. The website shows a Download button for the uploaded PDF.
- Paid ebook: set `isFree` to no and add the paid price. The website shows Add to Cart.
- Wix Stores and manual payment links are not required. PayFast checkout handles paid orders.

## Add a downloadable resource

1. Open CMS -> DownloadableResources.
2. Add title, slug, short description, full description, thumbnail, thumbnail alt text, category and tags.
3. For a free resource, upload the public file to `resourceFile`.
4. Add `fileType`, such as PDF, DOCX or ZIP.
5. For a paid resource, upload the file to `resourceFile`, set `accessType` to paid and add the paid price. The website shows Add to Cart and only unlocks the download after PayFast confirms the order.

## Create a workshop photo album

1. Open CMS -> WorkshopAlbums.
2. Add title, slug, workshop date, location, description, cover image and cover alt text.
3. Upload approved images to `mediaGallery`.
4. Add captions and alt text in Wix media settings where possible.
5. Add photographer credit if needed.
6. Set `consentConfirmed` to true only after photograph consent has been checked.
7. Publish the album only when it is ready to be public.

## Create a gallery album

1. Open CMS -> GalleryAlbums.
2. Add title, slug, description, album date, location, category, cover image and cover alt text.
3. Upload approved images to `mediaGallery`.
4. Add captions, alt text and image credits where needed.
5. Set `consentConfirmed` to true only after photograph consent has been checked.
6. Publish the album only when it is ready to be public.

## Upload multiple images

Use the `mediaGallery` field for WorkshopAlbums and GalleryAlbums. Add only approved images. Keep image names clear, add captions where helpful, and add alternative text for accessibility.

## Create and manage categories

1. Open CMS -> Categories.
2. Add `name`, `slug`, `description`, `resourceType`, and `active`.
3. Keep category names short and consistent, such as Inclusion, Parent Guidance or Learner Support.
4. Set `active` to false if the category should no longer be used.

## Save as draft, publish or unpublish

- Save as draft when the item is not ready.
- Publish in Wix when the item should appear on the website.
- Unpublish in Wix to remove an item from the website without deleting it.
- Delete only when the item is no longer needed.

## Replace an image or file

1. Open the Wix CMS item.
2. Replace the image, gallery image or file.
3. Save the item.
4. Keep the same slug if the public URL should stay the same.

## Mark content as featured

Turn on `featured`. Featured items sort ahead of standard items.

## Safe deletion and archiving

Unpublish content first if you only want to hide it. Delete content only when it should be removed permanently. For paid products, check any PayFast orders, refunds or delivery steps before deleting the related CMS item.

## Cache timing

Newly published Wix content may take a few minutes to appear on the EduReach website. This is normal.
