import {
  CONTENT_TYPES,
  getCategories,
  getContentBySlug,
  getContentList,
  getContentType,
  getWixConnectionStatus
} from "../src/lib/wixContent.js";

const CACHE_HEADER = "s-maxage=300, stale-while-revalidate=600";

function sendJson(res, payload, status = 200) {
  res.statusCode = status;
  res.setHeader("Cache-Control", CACHE_HEADER);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendJson(res, { ok: false, message: "Method not allowed." }, 405);
    return;
  }

  const host = req.headers?.host || "edureach.local";
  const url = new URL(req.url || "/api/wix-content", `https://${host}`);
  const rawType = url.searchParams.get("type") || "";
  const type = getContentType(rawType);
  const slug = url.searchParams.get("slug") || "";
  const limit = url.searchParams.get("limit") || "";
  const page = url.searchParams.get("page") || "";
  const search = url.searchParams.get("search") || "";
  const category = url.searchParams.get("category") || "";

  if (url.searchParams.get("status") === "1") {
    sendJson(res, {
      ok: true,
      types: CONTENT_TYPES,
      wix: getWixConnectionStatus(type)
    });
    return;
  }

  if (rawType === "categories") {
    sendJson(res, { ok: true, ...(await getCategories()) });
    return;
  }

  if (!type) {
    sendJson(res, { ok: false, message: "Unknown EduReach content type." }, 400);
    return;
  }

  if (slug) {
    sendJson(res, {
      ok: true,
      type,
      ...(await getContentBySlug(type, slug))
    });
    return;
  }

  sendJson(res, {
    ok: true,
    type,
    ...(await getContentList(type, { limit, page, search, category }))
  });
}
