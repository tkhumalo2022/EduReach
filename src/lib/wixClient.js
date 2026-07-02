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
  "WIX_TEAM_MEMBERS_COLLECTION_ID",
  "WIX_PARTNERS_COLLECTION_ID",
  "WIX_PARTNERS_SPONSORS_COLLECTION_ID",
  "WIX_SPONSORS_COLLECTION_ID",
  "WIX_TESTIMONIALS_COLLECTION_ID"
]);

export const WIX_COLLECTION_ID_DEFAULTS = Object.freeze({
  articles: "articles",
  blogs: "blogPosts",
  downloads: "downloadableResources",
  workshops: "workshopAlbums",
  gallery: "galleryAlbums",
  ebooks: "Import5",
  team: "teamMembers",
  partners: "partnersSponsors",
  testimonials: "testimonials"
});

const WIX_COLLECTION_ID_ALIASES = Object.freeze({
  articles: { Articles: "articles" },
  downloads: {
    DownloadableResources: "downloadableResources",
    "Downloadable Resources": "downloadableResources"
  },
  workshops: {
    WorkshopAlbums: "workshopAlbums",
    "Workshop Albums": "workshopAlbums"
  },
  gallery: {
    GalleryAlbums: "galleryAlbums",
    "Gallery Albums": "galleryAlbums"
  },
  ebooks: { Ebooks: "Import5" },
  blogs: {
    Blogs: "blogPosts",
    "Blog Posts": "blogPosts"
  },
  team: {
    TeamMembers: "teamMembers",
    "Team Members": "teamMembers"
  },
  partners: {
    PartnersSponsors: "partnersSponsors",
    "Partners / Sponsors": "partnersSponsors",
    "Partners and Sponsors": "partnersSponsors"
  },
  testimonials: { Testimonials: "testimonials" }
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
      team: collectionId("team", env.WIX_TEAM_MEMBERS_COLLECTION_ID),
      partners: collectionId(
        "partners",
        env.WIX_PARTNERS_SPONSORS_COLLECTION_ID ||
          env.WIX_PARTNERS_COLLECTION_ID ||
          env.WIX_SPONSORS_COLLECTION_ID
      ),
      testimonials: collectionId("testimonials", env.WIX_TESTIMONIALS_COLLECTION_ID)
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
  const fallback = WIX_COLLECTION_ID_DEFAULTS[key] || "";

  if (Object.prototype.hasOwnProperty.call(aliases, configured)) {
    return aliases[configured];
  }

  const allowedIds = new Set([fallback, ...Object.values(aliases)].filter(Boolean));
  if (configured && allowedIds.has(configured)) return configured;

  return fallback;
}
