import {
  CONTENT_TYPES,
  getContentBySlug,
  getContentList,
  getContentType,
  getWixConnectionStatus
} from "../src/lib/wixContent.js";
import crypto from "node:crypto";
import { getRequestHeader } from "../src/lib/security.js";

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
  const debug = url.searchParams.get("debug") === "1" && canReturnDebug(req);

  if (url.searchParams.get("status") === "1") {
    const wix = getWixConnectionStatus(type);

    if (debug) {
      sendJson(res, {
        ok: true,
        types: CONTENT_TYPES,
        wix
      });
      return;
    }

    sendJson(res, {
      ok: true,
      status: wix.configured ? "healthy" : "unavailable"
    });
    return;
  }

  if (!type) {
    sendJson(res, { ok: false, message: "Unknown EduReach content type." }, 400);
    return;
  }

  if (slug) {
    const result = await getContentBySlug(type, slug, { debug });
    sendJson(res, {
      ok: true,
      type,
      ...sanitizeCmsResult(result, { debug, itemMode: true })
    });
    return;
  }

  const result = await getContentList(type, { limit, page, search, category, debug });
  sendJson(res, {
    ok: true,
    type,
    ...sanitizeCmsResult(result, { debug })
  });
}

function sanitizeCmsResult(result, options = {}) {
  if (options.debug) return result;

  if (result?.configured === false) {
    return options.itemMode
      ? { configured: false, item: null, message: "Content is unavailable right now." }
      : { configured: false, items: [], message: "Content is unavailable right now." };
  }

  if (options.itemMode) {
    return {
      configured: true,
      item: result?.item || null,
      ...(result?.error ? { message: "Content is unavailable right now." } : {})
    };
  }

  return {
    configured: true,
    items: Array.isArray(result?.items) ? result.items : [],
    filters: result?.filters || { categories: [] },
    pagination: result?.pagination,
    ...(result?.error ? { message: "Content is unavailable right now." } : {})
  };
}

function canReturnDebug(req) {
  if (process.env.NODE_ENV !== "production") return true;

  const expected = String(process.env.EDUREACH_ADMIN_DEBUG_SECRET || "").trim();
  const supplied = String(getRequestHeader(req, "x-edureach-admin-secret") || "").trim();
  if (!expected || !supplied) return false;

  const expectedBuffer = Buffer.from(expected, "utf8");
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  return expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}
