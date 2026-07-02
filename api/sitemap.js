import { getContentList } from "../src/lib/wixContent.js";
import { buildSitemapXml } from "../src/lib/seo.js";

const CACHE_HEADER = "s-maxage=300, stale-while-revalidate=600";
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
  const xml = buildSitemapXml(entries);

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
  const entries = [];

  await Promise.all(
    CMS_SITEMAP_TYPES.map(async (type) => {
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 50) {
        const result = await getContentList(type, { limit: 50, page });
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
    })
  );

  return entries;
}
