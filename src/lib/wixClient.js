import { createClient, media, OAuthStrategy } from "@wix/sdk";
import { items } from "@wix/data";

export const WIX_ENV_KEYS = Object.freeze([
  "NEXT_PUBLIC_WIX_CLIENT_ID",
  "WIX_ACCOUNT_ID",
  "WIX_SITE_ID",
  "WIX_ARTICLES_COLLECTION_ID",
  "WIX_BLOGS_COLLECTION_ID",
  "WIX_EBOOKS_COLLECTION_ID",
  "WIX_DOWNLOADS_COLLECTION_ID",
  "WIX_WORKSHOP_ALBUMS_COLLECTION_ID",
  "WIX_GALLERY_ALBUMS_COLLECTION_ID",
  "WIX_CATEGORIES_COLLECTION_ID"
]);

export const WIX_COLLECTION_ID_DEFAULTS = Object.freeze({
  articles: "Import1",
  blogs: "",
  downloads: "Import2",
  workshops: "Import3",
  gallery: "Import4",
  ebooks: "Import5",
  categories: "Import6"
});

const WIX_COLLECTION_ID_ALIASES = Object.freeze({
  articles: { Articles: "Import1" },
  downloads: {
    DownloadableResources: "Import2",
    "Downloadable Resources": "Import2"
  },
  workshops: {
    WorkshopAlbums: "Import3",
    "Workshop Albums": "Import3"
  },
  gallery: {
    GalleryAlbums: "Import4",
    "Gallery Albums": "Import4"
  },
  ebooks: { Ebooks: "Import5" },
  categories: { Categories: "Import6" },
  blogs: {}
});

export function readWixConfig(env = process.env) {
  return {
    clientId: env.NEXT_PUBLIC_WIX_CLIENT_ID || "",
    accountId: env.WIX_ACCOUNT_ID || "",
    siteId: env.WIX_SITE_ID || "",
    collections: {
      articles: collectionId("articles", env.WIX_ARTICLES_COLLECTION_ID),
      blogs: collectionId("blogs", env.WIX_BLOGS_COLLECTION_ID),
      ebooks: collectionId("ebooks", env.WIX_EBOOKS_COLLECTION_ID),
      downloads: collectionId("downloads", env.WIX_DOWNLOADS_COLLECTION_ID),
      workshops: collectionId("workshops", env.WIX_WORKSHOP_ALBUMS_COLLECTION_ID),
      gallery: collectionId("gallery", env.WIX_GALLERY_ALBUMS_COLLECTION_ID),
      categories: collectionId("categories", env.WIX_CATEGORIES_COLLECTION_ID)
    }
  };
}

export function getMissingWixConfig(config = readWixConfig()) {
  const missing = [];

  if (!config.clientId) missing.push("NEXT_PUBLIC_WIX_CLIENT_ID");
  if (!config.siteId) missing.push("WIX_SITE_ID");

  return missing;
}

export function createWixClient(config = readWixConfig()) {
  if (!config.clientId) return null;

  return createClient({
    modules: {
      items
    },
    auth: OAuthStrategy({
      clientId: config.clientId
    })
  });
}

export function resolveWixImage(value) {
  const mediaValue = firstMediaValue(value);
  if (!mediaValue) return null;

  if (typeof mediaValue === "string" && /^https?:\/\//i.test(mediaValue)) {
    return { url: mediaValue, alt: "" };
  }

  if (typeof mediaValue === "object") {
    const directUrl =
      mediaValue.url ||
      mediaValue.src ||
      mediaValue.imageUrl ||
      mediaValue.fileUrl ||
      mediaValue.mediaUrl ||
      mediaValue.image?.url;

    if (directUrl) {
      return {
        url: directUrl,
        alt: mediaValue.alt || mediaValue.altText || mediaValue.title || ""
      };
    }
  }

  try {
    const image = media.getImageUrl(mediaValue);
    if (!image?.url) return null;

    return {
      url: image.url,
      alt: image.altText || image.filename || ""
    };
  } catch {
    return null;
  }
}

export function resolveWixFile(value) {
  const fileValue = firstMediaValue(value);
  if (!fileValue) return "";

  if (typeof fileValue === "string" && /^https?:\/\//i.test(fileValue)) {
    return fileValue;
  }

  if (typeof fileValue === "object") {
    return (
      fileValue.url ||
      fileValue.src ||
      fileValue.fileUrl ||
      fileValue.documentUrl ||
      fileValue.mediaUrl ||
      ""
    );
  }

  try {
    return media.getDocumentUrl(fileValue)?.url || "";
  } catch {
    return "";
  }
}

export function normalizeMediaGallery(value) {
  const values = Array.isArray(value)
    ? value
    : Array.isArray(value?.items)
      ? value.items
      : Array.isArray(value?.media)
        ? value.media
        : value
          ? [value]
          : [];

  return values
    .map((item) => {
      const image = resolveWixImage(item);
      if (!image?.url) return null;

      return {
        ...image,
        caption: item?.caption || item?.description || item?.title || ""
      };
    })
    .filter(Boolean);
}

function firstMediaValue(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] || null;
  if (Array.isArray(value.items)) return value.items[0] || null;
  if (Array.isArray(value.media)) return value.media[0] || null;
  return value;
}

function collectionId(key, value) {
  const configured = String(value || "").trim();
  const aliases = WIX_COLLECTION_ID_ALIASES[key] || {};

  if (Object.prototype.hasOwnProperty.call(aliases, configured)) {
    return aliases[configured];
  }

  return configured || WIX_COLLECTION_ID_DEFAULTS[key] || "";
}
