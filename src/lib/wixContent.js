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
    label: "Downloadable Resources",
    singular: "Downloadable Resource",
    collectionKey: "downloads",
    dateField: "publicationDate",
    detailPath: "/resources/downloads",
    ctaLabel: "Download",
    emptyMessage: EMPTY_MESSAGE
  },
  workshops: {
    label: "Workshop Photos",
    singular: "Workshop Album",
    collectionKey: "workshops",
    dateField: "workshopDate",
    detailPath: "/resources/workshops",
    ctaLabel: "View",
    emptyMessage: EMPTY_MESSAGE,
    requiresConsent: true
  },
  gallery: {
    label: "Gallery",
    singular: "Gallery Album",
    collectionKey: "gallery",
    dateField: "albumDate",
    detailPath: "/resources/gallery",
    ctaLabel: "View",
    emptyMessage: EMPTY_MESSAGE,
    requiresConsent: true
  },
  blog: {
    label: "Blog",
    singular: "Blog Post",
    dateField: "publishDate",
    detailPath: "/blog",
    ctaLabel: "Read More",
    emptyMessage: EMPTY_MESSAGE,
    usesBlogApi: true
  }
});

const COLLECTION_ENV_KEYS = Object.freeze({
  articles: "WIX_ARTICLES_COLLECTION_ID",
  ebooks: "WIX_EBOOKS_COLLECTION_ID",
  downloads: "WIX_DOWNLOADS_COLLECTION_ID",
  workshops: "WIX_WORKSHOP_ALBUMS_COLLECTION_ID",
  gallery: "WIX_GALLERY_ALBUMS_COLLECTION_ID",
  categories: "WIX_CATEGORIES_COLLECTION_ID"
});

export function getContentType(type) {
  return CONTENT_TYPES[type] ? type : "";
}

export function getWixConnectionStatus(type = "") {
  const config = readWixConfig();
  const normalizedType = getContentType(type);
  const missing = [...getMissingWixConfig(config)];

  if (type === "categories" && !config.collections.categories) {
    missing.push(COLLECTION_ENV_KEYS.categories);
  }

  if (normalizedType && !CONTENT_TYPES[normalizedType].usesBlogApi) {
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

  try {
    const config = readWixConfig();
    const client = createWixClient();
    let query = client.items
      .query(config.collections.categories)
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
    return errorResult(error, "Wix categories could not be loaded.");
  }
}

export async function getPublishedBlogPosts(options = {}) {
  const status = getWixConnectionStatus("blog");
  if (!status.configured) return unconfiguredResult(status);

  const paging = normalizePaging(options);
  const needsLocalFiltering = Boolean(paging.search || paging.category);
  const wixLimit = needsLocalFiltering ? MAX_FILTER_FETCH : paging.limit;
  const offset = needsLocalFiltering ? 0 : paging.skip;

  try {
    const client = createWixClient();
    const response = await client.posts.listPosts({
      featured: Boolean(options.featuredOnly) || undefined,
      paging: { limit: wixLimit, offset }
    });

    let items = (response.posts || []).map(normalizeBlogPost).filter(Boolean);
    items = applyNormalizedFilters(items, paging).sort(sortFeaturedNewest);

    const total = needsLocalFiltering
      ? items.length
      : Number(response.metaData?.total ?? response.metaData?.count ?? items.length);

    if (needsLocalFiltering) items = slicePage(items, paging);

    return listResult(items, paging, total, response.metaData?.total > offset + wixLimit);
  } catch (error) {
    return errorResult(error, "Wix Blog could not be loaded.");
  }
}

export async function getFeaturedBlogPosts(options = {}) {
  return getPublishedBlogPosts({ ...options, featuredOnly: true });
}

export async function getBlogPostBySlug(slug) {
  const cleanSlug = normalizeSlug(slug);
  if (!cleanSlug) return { configured: true, item: null };

  const status = getWixConnectionStatus("blog");
  if (!status.configured) return unconfiguredResult(status, true);

  try {
    const client = createWixClient();
    const response = await client.posts.getPostBySlug(cleanSlug);
    const item = normalizeBlogPost(response.post);

    return { configured: true, item };
  } catch (error) {
    return errorResult(error, "Wix Blog post could not be loaded.", true);
  }
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
    case "blog":
      return getPublishedBlogPosts(options);
    default:
      return { configured: true, items: [], error: "Unknown content type." };
  }
}

export async function getContentBySlug(type, slug) {
  switch (type) {
    case "articles":
      return getArticleBySlug(slug);
    case "ebooks":
      return getEbookBySlug(slug);
    case "downloads":
      return getDownloadBySlug(slug);
    case "workshops":
      return getWorkshopAlbumBySlug(slug);
    case "gallery":
      return getGalleryAlbumBySlug(slug);
    case "blog":
      return getBlogPostBySlug(slug);
    default:
      return { configured: true, item: null, error: "Unknown content type." };
  }
}

async function getPublishedCollection(type, options = {}) {
  const status = getWixConnectionStatus(type);
  if (!status.configured) return unconfiguredResult(status);

  const paging = normalizePaging(options);
  const needsLocalFiltering = Boolean(paging.search || paging.category);
  const wixLimit = needsLocalFiltering ? MAX_FILTER_FETCH : paging.limit;
  const wixSkip = needsLocalFiltering ? 0 : paging.skip;

  try {
    const definition = CONTENT_TYPES[type];
    const client = createWixClient();
    const collectionId = readWixConfig().collections[definition.collectionKey];
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

    const result = await query.find({
      showDrafts: false,
      returnTotalCount: true,
      includeReferences: [{ field: "category", limit: 1 }]
    });

    let items = (result.items || [])
      .map((item) => normalizeCmsItem(type, item))
      .filter(Boolean);

    items = applyNormalizedFilters(items, paging).sort(sortFeaturedNewest);

    const total = needsLocalFiltering ? items.length : result.totalCount;
    if (needsLocalFiltering) items = slicePage(items, paging);

    return listResult(items, paging, total, result.hasNext?.());
  } catch (error) {
    return errorResult(error, `${CONTENT_TYPES[type].label} could not be loaded.`);
  }
}

async function getCollectionItemBySlug(type, slug) {
  const cleanSlug = normalizeSlug(slug);
  if (!cleanSlug) return { configured: true, item: null };

  const status = getWixConnectionStatus(type);
  if (!status.configured) return unconfiguredResult(status, true);

  try {
    const definition = CONTENT_TYPES[type];
    const client = createWixClient();
    const collectionId = readWixConfig().collections[definition.collectionKey];
    let query = client.items.query(collectionId).eq("slug", cleanSlug).limit(1);

    if (definition.requiresConsent) {
      query = query.eq("consentConfirmed", true);
    }

    const result = await query.find({
      showDrafts: false,
      includeReferences: [{ field: "category", limit: 1 }]
    });
    const item = result.items?.[0]
      ? normalizeCmsItem(type, result.items[0])
      : type === "ebooks"
        ? await findEbookByGeneratedSlug(collectionId, cleanSlug)
        : null;

    return { configured: true, item };
  } catch (error) {
    return errorResult(error, `${CONTENT_TYPES[type].singular} could not be loaded.`, true);
  }
}

async function findEbookByGeneratedSlug(collectionId, slug) {
  const client = createWixClient();
  const result = await client.items
    .query(collectionId)
    .descending("featured", "publishedDate", "_createdDate")
    .limit(MAX_FILTER_FETCH)
    .find({
      showDrafts: false,
      includeReferences: [{ field: "category", limit: 1 }]
    });

  return (result.items || [])
    .map((item) => normalizeCmsItem("ebooks", item))
    .find((item) => item.slug === slug) || null;
}

function normalizeCmsItem(type, rawItem) {
  const definition = CONTENT_TYPES[type];
  const data = rawItem?.data || rawItem || {};
  const accessType = type === "ebooks"
    ? normalizeEbookAccessType(data)
    : normalizeAccessType(data.accessType);
  const image =
    withFallbackAlt(resolveWixImage(data.featuredImage || data.coverImage || data.thumbnail), [
      data.imageAlt,
      data.coverAlt,
      data.thumbnailAlt,
      data.title
    ]);
  const mediaGallery = normalizeMediaGallery(data.mediaGallery);
  const isPaid = accessType === "paid";
  const paymentLink = text(data.paymentLink || data.purchaseLink);
  const fileUrl =
    !isPaid && type === "downloads"
      ? resolveWixFile(data.resourceFile)
      : !isPaid && type === "ebooks"
        ? resolveWixFile(data.pdfFile || data.ebookFile)
        : "";
  const previewAllowed = Boolean(data.previewAllowed);
  const rawContent = data.content || data.description || data.fullDescription;
  const contentBlocks = richContentToBlocks(rawContent);
  const slug = normalizeSlug(data.slug || data.title);

  return {
    id: rawItem?._id || data._id || "",
    type,
    label: definition.label,
    title: text(data.title),
    slug,
    excerpt: text(data.excerpt || data.shortDescription || data.description),
    content: blocksToPlainText(contentBlocks),
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
    purchaseLink: paymentLink,
    storeProductId: text(data.storeProductId),
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
    seoDescription: text(data.seoDescription || data.excerpt || data.description || data.shortDescription),
    detailUrl: `${definition.detailPath}/${encodeURIComponent(slug)}`,
    ctaLabel: ctaLabel(type, accessType, paymentLink)
  };
}

function normalizeBlogPost(post) {
  if (!post) return null;

  const image =
    resolveWixImage(post.media?.displayed) ||
    resolveWixImage(post.media?.custom) ||
    resolveWixImage(post.media?.embedMedia?.thumbnail);
  const contentBlocks = richContentToBlocks(post.richContent || post.preview || post.excerpt);
  const slug = normalizeSlug(post.slug);

  return {
    id: post._id || "",
    type: "blog",
    label: "Blog",
    title: text(post.title),
    slug,
    excerpt: text(post.excerpt || post.preview),
    content: blocksToPlainText(contentBlocks),
    contentBlocks,
    image,
    author: text(post.author || post.owner || post.memberId),
    category: text(post.categoryLabel || post.categoryIds?.[0]),
    tags: normalizeTags(post.hashtags || post.tags || post.tagIds),
    date: dateValue(post.firstPublishedDate || post.lastPublishedDate || post.publishedDate),
    featured: Boolean(post.featured || post.pinned),
    accessType: "free",
    price: "",
    currency: "ZAR",
    purchaseLink: "",
    storeProductId: "",
    fileUrl: "",
    previewUrl: "",
    seoTitle: text(post.seoData?.title || post.title),
    seoDescription: text(post.seoData?.description || post.excerpt || post.preview),
    detailUrl: `/blog/${encodeURIComponent(slug)}`,
    ctaLabel: "Read More",
    mediaGallery: []
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

function normalizeEbookAccessType(data) {
  if ("isFree" in data) {
    return normalizeBoolean(data.isFree) ? "free" : "paid";
  }

  return normalizeAccessType(data.accessType);
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

function ctaLabel(type, accessType, paymentLink = "") {
  if (type === "ebooks") {
    if (accessType === "paid") return paymentLink ? "Buy Now" : "Coming Soon";
    return "Download";
  }

  if (accessType === "paid") return "Buy";
  return CONTENT_TYPES[type].ctaLabel;
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
    return stripHtml(value)
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

function stripHtml(value) {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

function errorResult(error, message, itemMode = false) {
  console.error(message, error);
  const base = {
    configured: true,
    error: message,
    message
  };

  return itemMode ? { ...base, item: null } : { ...base, items: [] };
}
