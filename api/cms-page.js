import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getContentBySlug, getContentType } from "../src/lib/wixContent.js";
import { contentStructuredData, injectSeoIntoHtml, itemSeo, staticSeo } from "../src/lib/seo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const CACHE_HEADER = "s-maxage=300, stale-while-revalidate=600";

const TEMPLATE_PATHS = Object.freeze({
  articles: "resources/articles/detail.html",
  blogs: "blog/detail.html",
  downloads: "resources/downloads/detail.html",
  ebooks: "resources/ebooks/detail.html",
  gallery: "resources/gallery/detail.html",
  workshops: "resources/workshops/detail.html",
  team: "team/detail.html",
  partners: "partners/detail.html",
  testimonials: "testimonials/detail.html"
});

export default async function handler(req, res) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    sendHtml(res, "Method not allowed.", 405, req.method);
    return;
  }

  const url = new URL(req.url || "/api/cms-page", "https://edureach.network");
  const type = getContentType(url.searchParams.get("type"));
  const slug = url.searchParams.get("slug") || "";

  if (!type || !slug || !TEMPLATE_PATHS[type]) {
    sendHtml(res, "Resource not found.", 404, req.method);
    return;
  }

  const template = await readTemplate(type);
  const result = await getContentBySlug(type, slug);
  const item = result?.item || null;

  if (!result?.configured || !item) {
    const fallbackMeta = staticSeo({
      title: "Resource not found | EduReach",
      description: "The requested EduReach resource could not be found.",
      path: url.pathname
    });
    sendHtml(res, injectSeoIntoHtml(template, fallbackMeta), 404, req.method);
    return;
  }

  const html = injectSeoIntoHtml(template, itemSeo(item, type), contentStructuredData(item, type));
  sendHtml(res, html, 200, req.method);
}

async function readTemplate(type) {
  return readFile(path.join(PROJECT_ROOT, TEMPLATE_PATHS[type]), "utf8");
}

function sendHtml(res, html, status = 200, method = "GET") {
  res.statusCode = status;
  res.setHeader("Cache-Control", CACHE_HEADER);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(method === "HEAD" ? "" : html);
}
