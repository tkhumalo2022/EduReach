import { getAdminSession, requireValidCsrf } from "./adminAuth.js";
import { readWixConfig } from "./wixClient.js";
import { enforceRateLimit, getRequestHeader, readJsonBody, sendJson } from "./security.js";

const WIX_API = "https://www.wixapis.com";
const ALLOWED_TYPES = Object.freeze(["ebooks", "downloads", "articles"]);
const ALLOWED_TOPICS = new Set(["Autism", "ADHD", "Down syndrome", "Inclusive education", "Teaching strategies", "Parent guides", "Other"]);
const FILES = Object.freeze({
  cover: { mime: ["image/jpeg", "image/png", "image/webp"], bytes: 5 * 1024 * 1024, extensions: /\.(jpg|jpeg|png|webp)$/i },
  freePdf: { mime: ["application/pdf"], bytes: 10 * 1024 * 1024, extensions: /\.pdf$/i }
});

export function trustedPublicFileUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (host === "static.wixstatic.com" || host.endsWith(".wixstatic.com"));
  } catch { return false; }
}

export function trustedUploadDestination(value) {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase();
    return u.protocol === "https:" && !u.username && !u.password && !u.port &&
      (host === "upload.wixmp.com" || host.endsWith(".wixmp.com"));
  } catch { return false; }
}

export function exactSameOrigin(req) {
  try {
    const o = new URL(getRequestHeader(req, "origin"));
    const host = String(getRequestHeader(req, "host") || "").toLowerCase();
    return Boolean(host && o.protocol === "https:" && o.host.toLowerCase() === host &&
      o.pathname === "/" && !o.search && !o.hash && !o.username && !o.password);
  } catch { return false; }
}

function validatedText(input, field, min, max, label) {
  const val = String(input?.[field] ?? "").trim();
  if (val.length < min || val.length > max) throw new Error(label + " needs " + min + "–" + max + " characters.");
  return val;
}

export function validateEntry(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid publishing details.");
  const type = String(input.type || "");
  if (!ALLOWED_TYPES.includes(type)) throw new Error("Choose Books, Free resources or Articles.");
  const title = validatedText(input, "title", 3, 140, "Title");
  const description = validatedText(input, "description", 20, 3000, "Description");
  const topic = String(input.topic || "Inclusive education");
  if (!ALLOWED_TOPICS.has(topic)) throw new Error("Choose a supported topic.");
  const coverImage = String(input.coverImage || "").trim();
  if (coverImage && !trustedPublicFileUrl(coverImage)) throw new Error("Choose an uploaded Wix cover image.");
  if (type === "articles") {
    const body = validatedText(input, "body", 80, 20000, "Article text");
    return { type, data: { title, description, excerpt: description, body, content: body, category: topic, image: coverImage, coverImage } };
  }
  const author = validatedText(input, "author", 2, 120, "Author");
  const pdfFile = String(input.pdfFile || "").trim();
  if (pdfFile && !trustedPublicFileUrl(pdfFile)) throw new Error("Only public Wix files can be attached to free resources.");
  if (type === "downloads") {
    if (input.price !== undefined && Number(input.price) !== 0) throw new Error("Resource uploads in this editor must be free.");
    return { type, data: { title, description, author, category: topic, coverImage, pdfFile, file: pdfFile, price: 0, isFree: true, accessType: "free" } };
  }
  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 0 || price > 100000 || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001) throw new Error("Enter a valid price in rand.");
  if (price > 0 && pdfFile) throw new Error("Paid PDFs cannot use public upload links. Save book details without attaching a PDF.");
  return { type, data: { title, description, author, category: topic, coverImage, pdfFile: price === 0 ? pdfFile : "", price, isFree: price === 0 } };
}

export function validUploadRequest(input) {
  const kind = String(input?.kind || "");
  const policy = FILES[kind];
  const filename = String(input?.filename || "").trim();
  const mimeType = String(input?.mimeType || "").toLowerCase().trim();
  const bytes = Number(input?.size);
  if (!policy || !policy.mime.includes(mimeType) || !policy.extensions.test(filename) ||
    !/^[a-zA-Z0-9][\w .()-]{1,99}$/.test(filename) ||
    !Number.isSafeInteger(bytes) || bytes < 1 || bytes > policy.bytes) {
    throw new Error("Choose a JPG, PNG, WEBP image under 5 MB or free PDF under 10 MB.");
  }
  return { kind, mimeType, filename, bytes };
}

function configFor(type) {
  const cfg = readWixConfig();
  const key = String(process.env.EDUREACH_WIX_ADMIN_API_KEY || "").trim();
  return { siteId: cfg.siteId, apiKey: key, collectionId: cfg.collections[type],
    configured: Boolean(key && cfg.siteId && cfg.collections[type]) };
}

async function wixRequest(cfg, path, method = "GET", data) {
  const ctl = new AbortController();
  const timeout = setTimeout(() => ctl.abort(), 12000);
  try {
    const response = await fetch(WIX_API + path, {
      method, signal: ctl.signal, redirect: "error",
      headers: { Authorization: cfg.apiKey, "wix-site-id": cfg.siteId, "Content-Type": "application/json" },
      ...(data === undefined ? {} : { body: JSON.stringify(data) })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn("EduReach Wix owner CMS request failed.", { code: response.status, method });
      throw new Error("Wix rejected the request. Check the API key's site-scoped CMS and Media permissions.");
    }
    return body;
  } finally { clearTimeout(timeout); }
}

export function draftFieldModifications(data, previous = {}) {
  // Patch only the fields shown in the editor. Updating a Wix item via PUT
  // replaces *all* its fields and could remove existing attachments or slugs.
  const edits = [];
  for (const [fieldPath, value] of Object.entries(data)) {
    const existing = previous[fieldPath];
    if ((fieldPath === "pdfFile" || fieldPath === "file" ||
         fieldPath === "coverImage" || fieldPath === "image") &&
        !value && existing) continue;
    edits.push({ fieldPath, action: "SET_FIELD", setFieldOptions: { value } });
  }
  return edits;
}

export function safeDraft(item, type) {
  const d = item?.data || {};
  const price = Number(d.price || 0);
  const free = type !== "ebooks" || price === 0 && d.isFree === true;
  return {
    id: String(item?.id || d._id || ""),
    type,
    title: String(d.title || ""),
    description: String(d.description || ""),
    author: String(d.author || ""),
    topic: String(d.category || "Inclusive education"),
    price: Number.isFinite(price) ? price : 0,
    coverImage: trustedPublicFileUrl(d.coverImage) ? d.coverImage : "",
    pdfFile: free && trustedPublicFileUrl(d.pdfFile) ? d.pdfFile : "",
    hasPdf: Boolean(d.pdfFile),
    body: type === "articles" ? String(d.body || d.content || "") : ""
  };
}

export default async function handlePublishing(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.method !== "GET" && req.method !== "POST") return sendJson(res, 405, { ok: false, message: "Method not allowed." });
  let session;
  try { session = await getAdminSession(req); }
  catch { return sendJson(res, 503, { ok: false, message: "Admin session unavailable." }); }
  if (!session) return sendJson(res, 401, { ok: false, message: "Sign in to manage EduReach content." });

  if (req.method === "GET") {
    const url = new URL(req.url || "/api/admin/publishing", "https://edureach.network");
    const type = String(url.searchParams.get("type") || "ebooks");
    if (!ALLOWED_TYPES.includes(type)) return sendJson(res, 400, { ok: false, message: "Invalid library type." });
    const cfg = configFor(type);
    if (!cfg.configured) return sendJson(res, 200, {
      ok: true, connected: false, drafts: [], message: "Connect a restricted Wix admin key to enable upload and draft saving."
    });
    try {
      const data = await wixRequest(cfg, "/wix-data/v2/items/query", "POST", {
        dataCollectionId: cfg.collectionId + "__drafts",
        query: { paging: { limit: 60 } }
      });
      return sendJson(res, 200, { ok: true, connected: true, drafts: (data.dataItems || []).map(i => safeDraft(i, type)) });
    } catch {
      return sendJson(res, 200, { ok: true, connected: false, drafts: [],
        message: "Wix draft access is not available yet. Check draft support and CMS permissions." });
    }
  }

  if (!(await enforceRateLimit(req, res, { name: "admin-publishing", limit: 18, windowSeconds: 60 }))) return;
  if (!exactSameOrigin(req)) return sendJson(res, 403, { ok: false, message: "Upload requests must come from this admin website." });
  try { requireValidCsrf(req, session); }
  catch { return sendJson(res, 403, { ok: false, message: "Your admin session needs refreshing." }); }

  let data;
  try { data = await readJsonBody(req, { maxBytes: 32 * 1024 }); }
  catch { return sendJson(res, 400, { ok: false, message: "Invalid or oversized publishing request." }); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return sendJson(res, 400, { ok: false, message: "Invalid request." });

  try {
    if (data.action === "uploadUrl") {
      const upload = validUploadRequest(data);
      const cfg = configFor("ebooks");
      if (!cfg.configured) return sendJson(res, 503, { ok: false, message: "Connect Wix Media Manager before uploading." });
      const result = await wixRequest(cfg, "/site-media/v1/files/generate-upload-url", "POST", {
        fileName: upload.filename, mimeType: upload.mimeType, sizeInBytes: String(upload.bytes), private: false
      });
      if (!trustedUploadDestination(result.uploadUrl)) throw new Error("Wix returned an unexpected upload destination.");
      return sendJson(res, 200, { ok: true, uploadUrl: result.uploadUrl });
    }
    if (data.action === "saveDraft") {
      const entry = validateEntry(data.entry);
      const cfg = configFor(entry.type);
      if (!cfg.configured) return sendJson(res, 503, { ok: false, message: "Wix publishing is not connected yet." });
      const draftsCollection = cfg.collectionId + "__drafts";
      const id = String(data.id || "").trim();
      if (id && !/^[\w-]{5,128}$/.test(id)) return sendJson(res, 400, { ok: false, message: "Invalid draft identifier." });
      if (id) {
        const existing = await wixRequest(cfg, "/wix-data/v2/items/" + encodeURIComponent(id) +
          "?dataCollectionId=" + encodeURIComponent(draftsCollection));
        if (!existing.dataItem) throw new Error("Saved draft could not be found.");
        const previous = existing.dataItem.data || {};
        const fields = draftFieldModifications(entry.data, previous);
        const result = await wixRequest(cfg, "/wix-data/v2/items/" + encodeURIComponent(id), "PATCH", {
          dataCollectionId: draftsCollection,
          patch: { dataItemId: id, fieldModifications: fields }
        });
        return sendJson(res, 200, { ok: true, message: "Draft updated in Wix. Not published.", draft: safeDraft(result.dataItem || { id, data: entry.data }, entry.type) });
      }
      const result = await wixRequest(cfg, "/wix-data/v2/items", "POST", {
        dataCollectionId: draftsCollection, dataItem: { data: entry.data }
      });
      return sendJson(res, 201, { ok: true, message: "Draft saved in Wix. Not published.", draft: safeDraft(result.dataItem || {}, entry.type) });
    }
    // An explicit server-side publish operation is intentionally excluded until CMS fields and full E2E checks are verified.
    return sendJson(res, 400, { ok: false, message: "Unknown publishing operation." });
  } catch (err) {
    const expected = err instanceof Error && /^(Choose|Enter|Title|Description|Article text|Author|Paid PDFs|Only public|Resource uploads|Invalid publishing)/.test(err.message);
    return sendJson(res, expected ? 400 : 502, { ok: false, message: expected ? err.message : "Could not complete the Wix operation. No content was published." });
  }
}
