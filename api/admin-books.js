import { getAdminSession, requireValidCsrf } from "../src/lib/adminAuth.js";
import { readWixConfig } from "../src/lib/wixClient.js";
import { enforceRateLimit, readJsonBody, sendJson } from "../src/lib/security.js";

const WIX_ORIGIN = "https://www.wixapis.com";
const BODY_LIMIT = 24 * 1024;
const CATEGORIES = new Set(["Autism", "ADHD", "Down syndrome", "Inclusive education", "Parent guides", "Teacher resources", "Other"]);

export function validateBook(input) {
  const value = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const title = String(value.title || "").trim();
  const author = String(value.author || "").trim();
  const description = String(value.description || "").trim();
  const category = String(value.category || "Inclusive education").trim();
  const price = Number(value.price);
  const featured = value.featured === true;
  const coverImage = String(value.coverImage || "").trim();
  const pdfFile = String(value.pdfFile || "").trim();

  if (title.length < 3 || title.length > 140) throw new Error("Enter a book title (3–140 characters).");
  if (author.length < 2 || author.length > 100) throw new Error("Enter the author's name.");
  if (description.length < 20 || description.length > 3200) throw new Error("Add at least 20 characters about the book.");
  if (!CATEGORIES.has(category)) throw new Error("Choose one of the available categories.");
  if (!Number.isFinite(price) || price < 0 || price > 100000 || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001) {
    throw new Error("Enter a valid price in rand, or 0 for a free book.");
  }
  for (const url of [coverImage, pdfFile]) {
    if (url && !isTrustedMediaUrl(url)) throw new Error("Only media links hosted by Wix are allowed.");
  }
  return {
    title, author, description, category, price, isFree: price === 0, featured,
    coverImage, pdfFile, publishedDate: new Date().toISOString()
  };
}

export function isTrustedMediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (url.hostname === "static.wixstatic.com" || url.hostname.endsWith(".wixstatic.com"));
  } catch {
    return false;
  }
}

function configuration() {
  const { siteId, collections } = readWixConfig();
  const apiKey = String(process.env.EDUREACH_WIX_ADMIN_API_KEY || "").trim();
  return { siteId, apiKey, collectionId: collections.ebooks, configured: Boolean(apiKey && siteId) };
}

async function wixFetch(config, path, method = "GET", body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(WIX_ORIGIN + path, {
      method, signal: controller.signal,
      headers: {
        Authorization: config.apiKey, "wix-site-id": config.siteId,
        "Content-Type": "application/json"
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("EduReach Wix admin request failed.", { method, status: response.status });
      throw new Error(response.status === 403 ? "Wix access was denied. Check the API key's site and permissions." : "Wix could not complete the request.");
    }
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

function publicDraft(value) {
  const data = value.data || {};
  return {
    id: value.id || data._id || "", title: String(data.title || ""),
    author: String(data.author || ""), description: String(data.description || ""), category: String(data.category || ""),
    price: Number(data.price || 0), featured: Boolean(data.featured),
    coverImage: String(data.coverImage || ""), pdfFile: String(data.pdfFile || "")
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST"].includes(req.method)) return sendJson(res, 405, { ok: false, message: "Method not allowed." });

  let session;
  try { session = await getAdminSession(req); }
  catch { return sendJson(res, 503, { ok: false, message: "Admin session is temporarily unavailable." }); }
  if (!session) return sendJson(res, 401, { ok: false, message: "Sign in through the EduReach admin workspace first." });

  const config = configuration();
  if (req.method === "GET") {
    if (!config.configured) return sendJson(res, 200, { ok: true, connected: false, drafts: [], message: "Wix publishing is not connected yet." });
    try {
      const data = await wixFetch(config, "/wix-data/v2/items/query", "POST", {
        dataCollectionId: config.collectionId + "__drafts",
        query: { paging: { limit: 60 } }
      });
      const items = Array.isArray(data.dataItems) ? data.dataItems : [];
      return sendJson(res, 200, { ok: true, connected: true, drafts: items.map(publicDraft) });
    } catch {
      return sendJson(res, 200, { ok: true, connected: true, drafts: [], message: "Drafts could not be listed. Confirm the Wix draft collection is enabled." });
    }
  }

  if (!(await enforceRateLimit(req, res, { name: "admin-books", limit: 20, windowSeconds: 60 }))) return;
  try { requireValidCsrf(req, session); }
  catch { return sendJson(res, 403, { ok: false, message: "Your session needs refreshing. Sign in again." }); }
  if (!config.configured) return sendJson(res, 503, { ok: false, message: "Publishing is not configured. Ask the site owner to add the Wix admin API key in Vercel." });

  let input;
  try { input = await readJsonBody(req, { maxBytes: BODY_LIMIT }); }
  catch { return sendJson(res, 400, { ok: false, message: "Invalid request." }); }

  try {
    if (input.action === "createDraft") {
      const book = validateBook(input.book);
      const created = await wixFetch(config, "/wix-data/v2/items", "POST", {
        dataCollectionId: config.collectionId + "__drafts", dataItem: { data: book }
      });
      return sendJson(res, 201, { ok: true, message: "Book saved as a draft in Wix.", draft: publicDraft(created.dataItem || {}) });
    }
    if (input.action === "updateDraft") {
      const id = String(input.id || "").trim();
      if (!/^[a-zA-Z0-9_-]{5,128}$/.test(id)) {
        return sendJson(res, 400, { ok: false, message: "Choose a saved draft to update." });
      }
      const book = validateBook(input.book);
      const updated = await wixFetch(config, "/wix-data/v2/items/" + encodeURIComponent(id), "PUT", {
        dataCollectionId: config.collectionId + "__drafts", dataItem: { id, data: book }
      });
      return sendJson(res, 200, { ok: true, message: "Draft changes saved in Wix.", draft: publicDraft(updated.dataItem || {}) });
    }
    if (input.action === "publishDraft") {
      const id = String(input.id || "").trim();
      if (!/^[a-zA-Z0-9_-]{5,128}$/.test(id) || input.confirm !== "PUBLISH") {
        return sendJson(res, 400, { ok: false, message: "Choose a draft and confirm publishing." });
      }
      const saved = await wixFetch(config,
        "/wix-data/v2/items/" + encodeURIComponent(id) + "?dataCollectionId=" + encodeURIComponent(config.collectionId + "__drafts"));
      const book = saved.dataItem?.data || {};
      if (Number(book.price || 0) > 0) {
        return sendJson(res, 409, { ok: false, message: "Paid-book publishing is paused until private download fulfilment is verified. Keep this title as a draft." });
      }
      if (!isTrustedMediaUrl(String(book.pdfFile || ""))) {
        return sendJson(res, 409, { ok: false, message: "Add and verify the free PDF in this draft before publishing." });
      }
      await wixFetch(config, "/wix-data/v2/items/publish-draft", "POST", {
        dataCollectionId: config.collectionId, dataItemId: id
      });
      return sendJson(res, 200, { ok: true, message: "Free book published. It should appear in the bookshop after the content cache refreshes." });
    }
    if (input.action === "uploadUrl") {
      const kind = input.kind === "cover" ? "cover" : input.kind === "pdf" ? "pdf" : "";
      const filename = String(input.filename || "").trim();
      const mimeType = String(input.mimeType || "").toLowerCase();
      const bytes = Number(input.size || 0);
      const allowed = kind === "cover" ? ["image/jpeg", "image/png", "image/webp"] : ["application/pdf"];
      if (!kind || !allowed.includes(mimeType) || !/^[a-z0-9._ -]{3,100}$/i.test(filename) || bytes <= 0 || bytes > 10 * 1024 * 1024) {
        return sendJson(res, 400, { ok: false, message: "Choose a JPG, PNG, WEBP or PDF under 10 MB." });
      }
      if (kind === "pdf" && input.paid === true) {
        return sendJson(res, 409, { ok: false, message: "Paid PDFs need private-storage integration before upload. Save the book details as a draft for now." });
      }
      const result = await wixFetch(config, "/site-media/v1/files/generate-upload-url", "POST", {
        mimeType, fileName: filename, private: false
      });
      if (!result.uploadUrl || !String(result.uploadUrl).startsWith("https://")) {
        throw new Error("Wix did not return a valid upload link.");
      }
      return sendJson(res, 200, { ok: true, uploadUrl: result.uploadUrl });
    }
    return sendJson(res, 400, { ok: false, message: "Unknown publishing action." });
  } catch (error) {
    return sendJson(res, 400, { ok: false, message: error?.message || "The publishing request failed." });
  }
}
