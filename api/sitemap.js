import { getContentList } from "../src/lib/wixContent.js";
import { buildSitemapXml } from "../src/lib/seo.js";

const CACHE_HEADER = "s-maxage=3600, stale-while-revalidate=86400";
const CMS_SITEMAP_TYPES = ["articles", "blogs", "downloads", "ebooks", "gallery", "workshops"];
const STATIC_SITEMAP_PATHS = [
  "/",
  "/resources/articles",
  "/blog",
  "/resources/downloads",
  "/resources/ebooks",
  "/resources/gallery",
  "/resources/workshops",
  "/cart",
  "/checkout",
  "/payment-success",
  "/payment-cancelled",
  "/team",
  "/partners",
  "/testimonials"
];
const CMS_PAGE_LIMIT = 50;
const CMS_MAX_PAGES = 50;
const CMS_RETRY_DELAYS_MS = [150, 450];

export default async function handler(req, res) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.statusCode = 405;
    res.end("Method not allowed.");
    return;
  }

  const entries = [
    ...STATIC_SITEMAP_PATHS.map((path) => ({ loc: path })),
    ...(await getCmsSitemapEntries())
  ];
  const xml = buildSitemapXml(dedupeEntries(entries));

  res.statusCode = 200;
  res.setHeader("Cache-Control", CACHE_HEADER);
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  if (req.method === "HEAD") {
    res.end();
    return;
  }

  res.end(xml);
}

async function getCmsSitemapEntries() {
  const groups = await Promise.all(
    CMS_SITEMAP_TYPES.map(async (type) => {
      const entries = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= CMS_MAX_PAGES) {
        const result = await getContentListWithRetry(type, page);
        if (!result?.configured || result.error) break;

        (result.items || []).forEach((item) => {
          if (!item?.detailUrl || !item?.slug) return;
          entries.push({
            loc: item.detailUrl,
            lastmod: item.lastModified || item.date
          });
        });

        hasMore = Boolean(result.pagination?.hasMore);
        page += 1;
      }

      return entries;
    })
  );

  return groups.flat();
}

async function getContentListWithRetry(type, page) {
  let result = await getContentList(type, { limit: CMS_PAGE_LIMIT, page });

  for (const delayMs of CMS_RETRY_DELAYS_MS) {
    if (!result?.error) return result;
    await delay(delayMs);
    result = await getContentList(type, { limit: CMS_PAGE_LIMIT, page });
  }

  return result;
}

function dedupeEntries(entries) {
  const unique = new Map();

  for (const entry of entries) {
    if (!entry?.loc) continue;
    const existing = unique.get(entry.loc);
    if (!existing || (!existing.lastmod && entry.lastmod)) {
      unique.set(entry.loc, entry);
    }
  }

  return [...unique.values()];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
