import {
  createWixClient,
  getMissingWixConfig,
  normalizeMediaGallery,
  readWixConfig,
  resolveWixFile,
  resolveWixImage
} from "./wixClient.js";

const EMPTY_MESSAGE = "New EduReach resources will be available soon.";
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const MAX_FILTER_FETCH = 100;

export const CONTENT_TYPES = Object.freeze({
  articles: {
    label: "Articles",
    singular: "Article",
    collectionKey: "articles",
    dateField: "publishDate",
    detailPath: "/resources/articles",
    ctaLabel: "Read",
    emptyMessage: EMPTY_MESSAGE
  },
  ebooks: {
    label: "Ebooks",
    singular: "Ebook",
    collectionKey: "ebooks",
    dateField: "publishedDate",
    detailPath: "/resources/ebooks",
    ctaLabel: "Download",
    emptyMessage: EMPTY_MESSAGE
  },
  downloads: {
    label: "DownloadableResources",
    singular: "DownloadableResources",
    collectionKey: "downloads",
    dateField: "publicationDate",
    detailPath: "/resources/downloads",
    ctaLabel: "Download",
    emptyMessage: EMPTY_MESSAGE
  },
  workshops: {
    label: "WorkshopAlbums",
    singular: "WorkshopAlbums",
    collectionKey: "workshops",
    dateField: "workshopDate",
    detailPath: "/resources/workshops",
    ctaLabel: "View",
    emptyMessage: EMPTY_MESSAGE,
    requiresConsent: true
  },
  gallery: {
    label: "GalleryAlbums",
    singular: "GalleryAlbums",
    collectionKey: "gallery",
    dateField: "albumDate",
    detailPath: "/resources/gallery",
    ctaLabel: "View",
    emptyMessage: EMPTY_MESSAGE,
    requiresConsent: true
  },
  blogs: {
    label: "Blogs",
    singular: "Blog Post",
    collectionKey: "blogs",
    dateField: "publishDate",
    detailPath: "/blog",
    ctaLabel: "Read More",
    emptyMessage: EMPTY_MESSAGE
  }
});

const COLLECTION_ENV_KEYS = Object.freeze({
  articles: "WIX_ARTICLES_COLLECTION_ID",
  blogs: "WIX_BLOGS_COLLECTION_ID",
  ebooks: "WIX_EBOOKS_COLLECTION_ID",
  downloads: "WIX_DOWNLOADS_COLLECTION_ID",
  workshops: "WIX_WORKSHOP_ALBUMS_COLLECTION_ID",
  gallery: "WIX_GALLERY_ALBUMS_COLLECTION_ID",
  categories: "WIX_CATEGORIES_COLLECTION_ID"
});

const CONTENT_TYPE_ALIASES = Object.freeze({
  blog: "blogs"
});

export function getContentType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  const canonical = CONTENT_TYPE_ALIASES[normalized] || normalized;
  return CONTENT_TYPES[canonical] ? canonical : "";
}

export function getWixConnectionStatus(type = "") {
  const config = readWixConfig();
  const normalizedType = getContentType(type);
  const missing = [...getMissingWixConfig(config)];

  if (type === "categories" && !config.collections.categories) {
    missing.push(COLLECTION_ENV_KEYS.categories);
  }

  if (normalizedType) {
    const collectionKey = CONTENT_TYPES[normalizedType].collectionKey;
    if (!config.collections[collectionKey]) {
      missing.push(COLLECTION_ENV_KEYS[normalizedType]);
    }
  }

  return {
    configured: missing.length === 0,
    missing
  };
}

export async function getPublishedArticles(options = {}) {
  return getPublishedCollection("articles", options);
}

export async function getFeaturedArticles(options = {}) {
  return getPublishedCollection("articles", { ...options, featuredOnly: true });
}

export async function getArticleBySlug(slug) {
  return getCollectionItemBySlug("articles", slug);
}

export async function getPublishedEbooks(options = {}) {
  return getPublishedCollection("ebooks", options);
}

export async function getFeaturedEbooks(options = {}) {
  return getPublishedCollection("ebooks", { ...options, featuredOnly: true });
}

export async function getEbookBySlug(slug) {
  return getCollectionItemBySlug("ebooks", slug);
}

export async function getPublishedDownloads(options = {}) {
  return getPublishedCollection("downloads", options);
}

export async function getFeaturedDownloads(options = {}) {
  return getPublishedCollection("downloads", { ...options, featuredOnly: true });
}

export async function getDownloadBySlug(slug) {
  return getCollectionItemBySlug("downloads", slug);
}

export async function getPublishedWorkshopAlbums(options = {}) {
  return getPublishedCollection("workshops", options);
}

export async function getFeaturedWorkshopAlbums(options = {}) {
  return getPublishedCollection("workshops", { ...options, featuredOnly: true });
}

export async function getWorkshopAlbumBySlug(slug) {
  return getCollectionItemBySlug("workshops", slug);
}

export async function getPublishedGalleryAlbums(options = {}) {
  return getPublishedCollection("gallery", options);
}

export async function getFeaturedGalleryAlbums(options = {}) {
  return getPublishedCollection("gallery", { ...options, featuredOnly: true });
}

export async function getGalleryAlbumBySlug(slug) {
  return getCollectionItemBySlug("gallery", slug);
}

export async function getCategories(options = {}) {
  const status = getWixConnectionStatus("categories");
  if (!status.configured) return unconfiguredResult(status);
  const config = readWixConfig();
  const collectionId = config.collections.categories;

  try {
    const client = createWixClient();
    let query = client.items
      .query(collectionId)
      .eq("active", true)
      .ascending("name")
      .limit(safeLimit(options.limit || 100, 100));

    const result = await query.find({ showDrafts: false, returnTotalCount: true });
    const items = (result.items || []).map(normalizeCategory).filter(Boolean);

    return {
      configured: true,
      items,
      pagination: paginationMeta(1, items.length || DEFAULT_LIMIT, result.totalCount, result.hasNext?.())
    };
  } catch (error) {
    return errorResult(error, "Wix categories could not be loaded.", false, {
      collectionId,
      debug: options.debug,
      operation: "categories"
    });
  }
}

export async function getPublishedBlogPosts(options = {}) {
  return getPublishedCollection("blogs", options);
}

export async function getFeaturedBlogPosts(options = {}) {
  return getPublishedBlogPosts({ ...options, featuredOnly: true });
}

export async function getBlogPostBySlug(slug) {
  return getCollectionItemBySlug("blogs", slug);
}

export async function getContentList(type, options = {}) {
  switch (type) {
    case "articles":
      return getPublishedArticles(options);
    case "ebooks":
      return getPublishedEbooks(options);
    case "downloads":
      return getPublishedDownloads(options);
    case "workshops":
      return getPublishedWorkshopAlbums(options);
    case "gallery":
      return getPublishedGalleryAlbums(options);
    case "blogs":
      return getPublishedBlogPosts(options);
    default:
      return { configured: true, items: [], error: "Unknown content type." };
  }
}

export async function getContentBySlug(type, slug, options = {}) {
  switch (type) {
    case "articles":
      return getCollectionItemBySlug("articles", slug, options);
    case "ebooks":
      return getCollectionItemBySlug("ebooks", slug, options);
    case "downloads":
      return getCollectionItemBySlug("downloads", slug, options);
    case "workshops":
      return getCollectionItemBySlug("workshops", slug, options);
    case "gallery":
      return getCollectionItemBySlug("gallery", slug, options);
    case "blogs":
      return getCollectionItemBySlug("blogs", slug, options);
    default:
      return { configured: true, item: null, error: "Unknown content type." };
  }
}

async function getPublishedCollection(type, options = {}) {
  const status = getWixConnectionStatus(type);
  if (!status.configured) return unconfiguredResult(status);

  const definition = CONTENT_TYPES[type];
  const collectionId = readWixConfig().collections[definition.collectionKey];
  const paging = normalizePaging(options);
  const needsLocalFiltering = Boolean(paging.search || paging.category);
  const wixLimit = needsLocalFiltering ? MAX_FILTER_FETCH : paging.limit;
  const wixSkip = needsLocalFiltering ? 0 : paging.skip;

  try {
    const client = createWixClient();
    let query = client.items
      .query(collectionId)
      .descending("featured", definition.dateField, "_createdDate")
      .skip(wixSkip)
      .limit(wixLimit);

    if (definition.requiresConsent) {
      query = query.eq("consentConfirmed", true);
    }

    if (options.featuredOnly) {
      query = query.eq("featured", true);
    }

    const result = await findItems(query, {
      showDrafts: false,
      returnTotalCount: true,
      includeCategoryReference: true
    });

    let items = (result.items || [])
      .map((item) => normalizeCmsItem(type, item))
      .filter(Boolean);

    items = applyNormalizedFilters(items, paging).sort(sortFeaturedNewest);

    const total = needsLocalFiltering ? items.length : result.totalCount;
    if (needsLocalFiltering) items = slicePage(items, paging);

    return listResult(items, paging, total, result.hasNext?.());
  } catch (error) {
    return errorResult(error, `${CONTENT_TYPES[type].label} could not be loaded.`, false, {
      collectionId,
      debug: options.debug,
      operation: "list",
      type
    });
  }
}

async function getCollectionItemBySlug(type, slug, options = {}) {
  const cleanSlug = normalizeSlug(slug);
  if (!cleanSlug) return { configured: true, item: null };

  const status = getWixConnectionStatus(type);
  if (!status.configured) return unconfiguredResult(status, true);
  const definition = CONTENT_TYPES[type];
  const collectionId = readWixConfig().collections[definition.collectionKey];

  try {
    const client = createWixClient();
    let query = client.items.query(collectionId).eq("slug", cleanSlug).limit(1);

    if (definition.requiresConsent) {
      query = query.eq("consentConfirmed", true);
    }

    const result = await findItems(query, {
      showDrafts: false,
      includeCategoryReference: true
    });
    const item = result.items?.[0]
      ? normalizeCmsItem(type, result.items[0], options)
      : type === "ebooks" || type === "blogs"
        ? await findItemByGeneratedSlug(type, collectionId, cleanSlug, options)
        : null;

    return { configured: true, item };
  } catch (error) {
    return errorResult(error, `${CONTENT_TYPES[type].singular} could not be loaded.`, true, {
      collectionId,
      debug: options.debug,
      operation: "detail",
      slug: cleanSlug,
      type
    });
  }
}

async function findItemByGeneratedSlug(type, collectionId, slug, options = {}) {
  const definition = CONTENT_TYPES[type];
  const client = createWixClient();
  let query = client.items
    .query(collectionId)
    .descending("featured", definition.dateField, "_createdDate")
    .limit(MAX_FILTER_FETCH);

  if (definition.requiresConsent) {
    query = query.eq("consentConfirmed", true);
  }

  const result = await findItems(query, {
    showDrafts: false,
    includeCategoryReference: true
  });

  return (result.items || [])
    .map((item) => normalizeCmsItem(type, item, options))
    .find((item) => item.slug === slug) || null;
}

async function findItems(query, options = {}) {
  const { includeCategoryReference = false, ...findOptions } = options;

  if (!includeCategoryReference) {
    return query.find(findOptions);
  }

  let referenceError = null;

  try {
    return await query.find({
      ...findOptions,
      includeReferences: [{ field: "category", limit: 1 }]
    });
  } catch (error) {
    referenceError = error;
  }

  try {
    return await query.find(findOptions);
  } catch (error) {
    error.referenceQueryError = referenceError;
    throw error;
  }
}

export function normalizeCmsItem(type, rawItem, options = {}) {
  const definition = CONTENT_TYPES[type];
  const data = rawItem?.data || rawItem || {};
  const accessType = type === "ebooks"
    ? normalizeEbookAccessType(data)
    : type === "downloads"
      ? normalizeProductAccessType(data)
    : normalizeAccessType(data.accessType);
  const image =
    withFallbackAlt(resolveWixImage(data.featuredImage || data.coverImage || data.thumbnail || data.image), [
      data.imageAlt,
      data.coverAlt,
      data.thumbnailAlt,
      data.title
    ]);
  const mediaGallery = normalizeMediaGallery(data.mediaGallery);
  const isPaid = accessType === "paid";
  const fileUrl =
    (options.includePaidFile || !isPaid) && (type === "downloads" || type === "ebooks")
      ? resolveProductFile(type, data)
      : "";
  const previewAllowed = Boolean(data.previewAllowed);
  const rawContent = data.content || data.description || data.fullDescription;
  const contentBlocks = richContentToBlocks(rawContent);
  const contentText = blocksToPlainText(contentBlocks);
  const excerpt = cleanSummaryText(data.excerpt || data.shortDescription) || cleanSummaryText(data.description) || contentText;
  const slug = normalizeSlug(data.slug || data.title);
  const paymentLink = resolveResourceLink(data.paymentLink || data.paymentUrl || data.purchaseLink || data.checkoutLink);
  const downloadLink = resolveResourceLink(data.downloadLink || data.downloadUrl || data.resourceLink || data.fileLink || data.fileUrl || data.resourceFile);
  const accessButtonLabel = text(data.accessButtonLabel || data.buttonLabel || data.ctaLabel);
  const previewText = text(data.previewText || data.previewDescription || data.whatYouGet || data.whatYoullGet || data.benefits || data.previewCopy);

  return {
    id: rawItem?._id || data._id || "",
    type,
    label: definition.label,
    title: text(data.title),
    slug,
    excerpt,
    content: contentText,
    contentBlocks,
    image,
    author: text(data.author),
    category: categoryLabel(data.category),
    tags: normalizeTags(data.tags),
    date: dateValue(
      data[definition.dateField] ||
        data.publishDate ||
        data.publishedDate ||
        data.publicationDate
    ),
    featured: Boolean(data.featured),
    isFree: accessType === "free",
    accessType,
    price: data.price || "",
    currency: text(data.currency || "ZAR"),
    storeProductId: text(data.storeProductId),
    paymentLink,
    downloadLink,
    accessButtonLabel,
    previewText,
    fileUrl,
    previewUrl: !isPaid && previewAllowed ? resolveWixFile(data.previewFile) : "",
    fileType: text(data.fileType || (type === "ebooks" ? "PDF" : "")),
    references: blocksToPlainText(richContentToBlocks(data.references)),
    pageCount: data.pageCount || "",
    language: text(data.language),
    isbn: text(data.isbn),
    location: text(data.location),
    relatedProgramme: text(data.relatedProgramme),
    photographerCredit: text(data.photographerCredit || data.imageCredits),
    mediaGallery,
    seoTitle: text(data.seoTitle || data.title),
    seoDescription: cleanSummaryText(data.seoDescription || data.excerpt || data.shortDescription || data.description),
    detailUrl: `${definition.detailPath}/${encodeURIComponent(slug)}`,
    ctaLabel: ctaLabel(type, accessType)
  };
}

function normalizeCategory(rawItem) {
  const data = rawItem?.data || rawItem || {};
  const name = text(data.name || data.title);
  const slug = normalizeSlug(data.slug || name);

  if (!name || !slug) return null;

  return {
    id: rawItem?._id || data._id || "",
    name,
    slug,
    description: text(data.description),
    resourceType: text(data.resourceType),
    active: data.active !== false
  };
}

function normalizePaging(options = {}) {
  const limit = safeLimit(options.limit);
  const page = safePage(options.page);
  return {
    limit,
    page,
    skip: (page - 1) * limit,
    search: text(options.search),
    category: normalizeSlug(options.category || "")
  };
}

function listResult(items, paging, total, hasNext = false) {
  const categories = uniqueSorted(items.map((item) => item.category).filter(Boolean));
  return {
    configured: true,
    items,
    filters: { categories },
    pagination: paginationMeta(paging.page, paging.limit, total, hasNext)
  };
}

function paginationMeta(page, limit, total, hasNext = false) {
  const numericTotal = Number.isFinite(Number(total)) ? Number(total) : undefined;
  const totalPages = numericTotal == null ? undefined : Math.max(1, Math.ceil(numericTotal / limit));

  return {
    page,
    limit,
    total: numericTotal,
    totalPages,
    hasMore: Boolean(hasNext || (totalPages && page < totalPages))
  };
}

function safeLimit(limit, max = MAX_LIMIT) {
  const number = Number(limit || DEFAULT_LIMIT);
  if (!Number.isFinite(number)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(Math.trunc(number), max));
}

function safePage(page) {
  const number = Number(page || 1);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.trunc(number));
}

function applyNormalizedFilters(items, paging) {
  return items.filter((item) => {
    if (paging.category && normalizeSlug(item.category) !== paging.category) return false;
    if (!paging.search) return true;

    const haystack = [
      item.title,
      item.excerpt,
      item.content,
      item.category,
      ...(item.tags || [])
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(paging.search.toLowerCase());
  });
}

function slicePage(items, paging) {
  return items.slice(paging.skip, paging.skip + paging.limit);
}

function normalizeSlug(slug) {
  return String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeAccessType(value) {
  const normalized = String(value || "free").trim().toLowerCase();
  return normalized === "paid" ? "paid" : "free";
}

function normalizeProductAccessType(data) {
  if (Object.prototype.hasOwnProperty.call(data, "isPaid")) {
    return normalizeBoolean(data.isPaid) ? "paid" : "free";
  }

  if (Object.prototype.hasOwnProperty.call(data, "isFree")) {
    return normalizeBoolean(data.isFree) ? "free" : "paid";
  }

  return normalizeAccessType(data.accessType);
}

function normalizeEbookAccessType(data) {
  const isFree = Object.prototype.hasOwnProperty.call(data, "isFree") && normalizeBoolean(data.isFree);
  const hasPaidPrice = priceGreaterThanZero(data.price);
  return isFree && !hasPaidPrice ? "free" : "paid";
}

function priceGreaterThanZero(value) {
  const number = normalizedPriceNumber(value);
  return Number.isFinite(number) && number > 0;
}

function normalizedPriceNumber(value) {
  if (typeof value === "number") return value;

  const digitsOnly = String(value ?? "").replace(/[^\d.,-]/g, "");
  if (!digitsOnly) return 0;

  const lastComma = digitsOnly.lastIndexOf(",");
  const lastDot = digitsOnly.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);
  const decimalPart = decimalIndex > -1 ? digitsOnly.slice(decimalIndex + 1) : "";
  const hasDecimalPart = decimalPart.length > 0 && decimalPart.length <= 2;

  const normalized = hasDecimalPart
    ? `${digitsOnly.slice(0, decimalIndex).replace(/[.,]/g, "")}.${decimalPart}`
    : digitsOnly.replace(/[.,]/g, "");

  return Number(normalized);
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  return ["yes", "true", "1", "free"].includes(normalized);
}

function text(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return text(value.name || value.title || value.label || value.value || value.text || "");
  }

  return String(value).trim();
}

function categoryLabel(category) {
  if (Array.isArray(category)) return category.map(categoryLabel).filter(Boolean).join(", ");
  return text(category);
}

function normalizeTags(tags) {
  if (!tags) return [];
  const values = Array.isArray(tags) ? tags : String(tags).split(",");
  return values.map(text).filter(Boolean);
}

function dateValue(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function sortFeaturedNewest(a, b) {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
}

function ctaLabel(type, accessType) {
  if (type === "ebooks") {
    if (accessType === "paid") return "Add to Cart";
    return "Download";
  }

  if (type === "downloads" && accessType === "paid") return "Add to Cart";
  if (accessType === "paid") return "Buy";
  return CONTENT_TYPES[type].ctaLabel;
}

function resolveProductFile(type, data) {
  if (type === "ebooks") return resolveWixFile(data.pdfFile || data.ebookFile || data.resourceFile);
  if (type === "downloads") return resolveWixFile(data.resourceFile || data.pdfFile || data.downloadFile);
  return "";
}

function resolveResourceLink(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return /^https?:\/\//i.test(value) ? value : "";
  }

  if (typeof value === "object") {
    return (
      value.url ||
      value.href ||
      value.link ||
      value.src ||
      value.fileUrl ||
      value.documentUrl ||
      value.mediaUrl ||
      ""
    );
  }

  return "";
}

function withFallbackAlt(image, values) {
  if (!image) return null;
  return {
    ...image,
    alt: image.alt || values.map(text).find(Boolean) || ""
  };
}

function richContentToBlocks(value) {
  if (!value) return [];

  if (typeof value === "string") {
    const decodedValue = decodeHtmlEntities(value);
    if (containsHtml(decodedValue)) return htmlToBlocks(decodedValue);

    return decodedValue
      .split(/\n{2,}/)
      .map((paragraph) => ({ type: "paragraph", text: paragraph.trim() }))
      .filter((block) => block.text);
  }

  if (Array.isArray(value)) {
    return value.flatMap(richContentToBlocks);
  }

  if (typeof value === "object") {
    if (Array.isArray(value.nodes)) return nodesToBlocks(value.nodes);
    if (Array.isArray(value.children)) return nodesToBlocks(value.children);
    if (Array.isArray(value.content)) return nodesToBlocks(value.content);

    const image = resolveWixImage(
      value.imageData?.image || value.imageData || value.image || value.media
    );
    if (image?.url) {
      return [{ type: "image", url: image.url, alt: image.alt || text(value.altText) }];
    }

    const itemText = nodeText(value);
    return itemText ? [{ type: "paragraph", text: itemText }] : [];
  }

  return [];
}

function nodesToBlocks(nodes) {
  return nodes.flatMap((node) => {
    const nodeType = String(node.type || node.nodeType || "").toLowerCase();
    const children = node.nodes || node.children || node.content || [];
    const childBlocks = Array.isArray(children) ? nodesToBlocks(children) : [];
    const itemText = nodeText(node);

    if (nodeType.includes("image")) {
      const image = resolveWixImage(node.imageData?.image || node.imageData || node.image);
      return image?.url ? [{ type: "image", url: image.url, alt: image.alt || itemText }] : [];
    }

    if (nodeType.includes("heading")) {
      return itemText ? [{ type: "heading", text: itemText }] : childBlocks;
    }

    if (nodeType.includes("quote")) {
      return itemText ? [{ type: "quote", text: itemText }] : childBlocks;
    }

    if (nodeType.includes("list")) {
      const listItems = childBlocks
        .map((block) => block.text)
        .filter(Boolean);
      return listItems.length ? [{ type: "list", items: listItems }] : childBlocks;
    }

    if (itemText) return [{ type: "paragraph", text: itemText }];
    return childBlocks;
  });
}

function nodeText(node) {
  if (!node || typeof node !== "object") return text(node);
  const direct = text(
    node.textData?.text ||
      node.paragraphData?.text ||
      node.headingData?.text ||
      node.text ||
      node.value ||
      ""
  );
  if (direct) return direct;

  const children = node.nodes || node.children || node.content || [];
  return Array.isArray(children)
    ? children.map(nodeText).filter(Boolean).join(" ").replace(/\s+/g, " ").trim()
    : "";
}

function blocksToPlainText(blocks) {
  return (blocks || [])
    .map((block) => {
      if (block.type === "list") return (block.items || []).join("\n");
      return block.text || "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function cleanSummaryText(value) {
  return blocksToPlainText(richContentToBlocks(value))
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToBlocks(value) {
  const html = removeUnsafeHtml(value).replace(/<br\s*\/?>/gi, "\n");
  const blocks = [];
  const blockPattern = /<(h[1-6]|p|div|blockquote|ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = blockPattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const innerHtml = match[2];

    if (tag === "ul" || tag === "ol") {
      const items = htmlListItems(innerHtml);
      if (items.length) blocks.push({ type: "list", items });
      continue;
    }

    const blockText = htmlToText(innerHtml);
    if (!blockText) continue;

    if (tag.startsWith("h")) {
      blocks.push({ type: "heading", text: blockText });
    } else if (tag === "blockquote") {
      blocks.push({ type: "quote", text: blockText });
    } else {
      blocks.push({ type: "paragraph", text: blockText });
    }
  }

  if (blocks.length) return blocks;

  return stripHtml(value)
    .split(/\n{2,}/)
    .map((paragraph) => ({ type: "paragraph", text: paragraph.trim() }))
    .filter((block) => block.text);
}

function htmlListItems(value) {
  const items = [];
  const itemPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match;

  while ((match = itemPattern.exec(value)) !== null) {
    const itemText = htmlToText(match[1]);
    if (itemText) items.push(itemText);
  }

  return items;
}

function htmlToText(value) {
  return decodeHtmlEntities(
    removeUnsafeHtml(value)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripHtml(value) {
  return decodeHtmlEntities(removeUnsafeHtml(value)
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeUnsafeHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
}

function containsHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
}

function decodeHtmlEntities(value) {
  const entities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\"",
    ndash: "-",
    mdash: "-",
    hellip: "..."
  };

  return String(value || "").replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    const normalized = String(entity).toLowerCase();

    if (normalized.startsWith("#x")) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return isValidCodePoint(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (normalized.startsWith("#")) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return isValidCodePoint(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return Object.prototype.hasOwnProperty.call(entities, normalized)
      ? entities[normalized]
      : match;
  });
}

function isValidCodePoint(value) {
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff;
}

function uniqueSorted(values) {
  return [...new Set(values.map(text).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function unconfiguredResult(status, itemMode = false) {
  const base = {
    configured: false,
    missing: status.missing,
    message: "Wix CMS is not configured yet."
  };

  return itemMode ? { ...base, item: null } : { ...base, items: [] };
}

function errorResult(error, message, itemMode = false, context = {}) {
  const wixError = serializeWixError(error);
  const logPayload = {
    message,
    context: logContext(context),
    wixError
  };

  console.error("EduReach Wix CMS request failed.", JSON.stringify(logPayload));

  const base = {
    configured: true,
    error: message,
    message
  };

  if (context.debug) {
    base.wixError = wixError;
    base.debugContext = logPayload.context;
  }

  return itemMode ? { ...base, item: null } : { ...base, items: [] };
}

function logContext(context = {}) {
  return {
    collectionId: text(context.collectionId),
    operation: text(context.operation),
    slug: text(context.slug),
    type: text(context.type)
  };
}

function serializeWixError(error) {
  if (!error) return null;

  const serialized = {
    name: text(error.name),
    message: text(error.message),
    code: text(error.code || error.details?.applicationError?.code),
    status: error.response?.status || error.status || error.statusCode || "",
    details: safeJson(error.details || error.response?.data || error.data)
  };

  if (error.referenceQueryError) {
    serialized.referenceQueryError = serializeWixError(error.referenceQueryError);
  }

  return serialized;
}

function safeJson(value) {
  if (!value) return null;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return text(value);
  }
}
