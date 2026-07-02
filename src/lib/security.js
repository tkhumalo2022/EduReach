import crypto from "node:crypto";
import { getCache } from "@vercel/functions";

const RATE_LIMIT_NAMESPACE = "edureach-rate-limits";
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;

export class ApiRequestError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
  }
}

export function sendJson(response, statusCode, payload) {
  response.setHeader?.("Cache-Control", "no-store");
  response.setHeader?.("Content-Type", "application/json; charset=utf-8");

  if (typeof response.status === "function" && typeof response.json === "function") {
    return response.status(statusCode).json(payload);
  }

  response.statusCode = statusCode;
  response.end?.(JSON.stringify(payload));
  return undefined;
}

export function sendText(response, statusCode, body) {
  response.setHeader?.("Cache-Control", "no-store");
  response.setHeader?.("Content-Type", "text/plain; charset=utf-8");
  response.statusCode = statusCode;
  response.end?.(body);
  return undefined;
}

export function methodNotAllowed(response, allowedMethods) {
  const allow = Array.isArray(allowedMethods) ? allowedMethods.join(", ") : String(allowedMethods || "");
  response.setHeader?.("Allow", allow);
  return sendJson(response, 405, {
    ok: false,
    message: "Method not allowed."
  });
}

export function getRequestHeader(request, name) {
  const headers = request?.headers || {};
  const lowerName = String(name || "").toLowerCase();

  if (typeof headers.get === "function") {
    return headers.get(name) || headers.get(lowerName) || "";
  }

  return headers[name] || headers[lowerName] || "";
}

export function requireJsonContentType(request) {
  const contentType = getRequestHeader(request, "content-type").toLowerCase();
  if (!contentType.includes("application/json")) {
    throw new ApiRequestError(415, "Content-Type must be application/json.");
  }
}

export async function readJsonBody(request, options = {}) {
  const { maxBytes = 32768, requireJson = true } = options;
  if (requireJson) requireJsonContentType(request);
  assertContentLength(request, maxBytes);

  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body) && !isReadableBody(request.body)) {
    assertBodySize(JSON.stringify(request.body), maxBytes);
    return request.body;
  }

  const rawBody = await readRawBody(request, { maxBytes });

  try {
    return JSON.parse(rawBody || "{}");
  } catch {
    throw new ApiRequestError(400, "Invalid JSON payload.");
  }
}

export async function readRawBody(request, options = {}) {
  const { maxBytes = 32768 } = options;
  assertContentLength(request, maxBytes);

  if (typeof request.body === "string") {
    assertBodySize(request.body, maxBytes);
    return request.body;
  }

  if (Buffer.isBuffer(request.body)) {
    assertBodySize(request.body, maxBytes);
    return request.body.toString("utf8");
  }

  if (request.body && typeof request.body === "object" && !isReadableBody(request.body)) {
    const encoded = new URLSearchParams(request.body).toString();
    assertBodySize(encoded, maxBytes);
    return encoded;
  }

  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > maxBytes) {
      throw new ApiRequestError(413, "Request payload is too large.");
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export async function enforceRateLimit(request, response, options = {}) {
  if (process.env.EDUREACH_RATE_LIMIT_DISABLED === "1") return true;

  const cache = getRateLimitCache();
  if (!cache) return true;

  const name = normalizeRateLimitName(options.name || "api");
  const limit = readPositiveInteger(`EDUREACH_RATE_LIMIT_${name.toUpperCase()}_MAX`, options.limit || 60);
  const windowSeconds = readPositiveInteger(
    `EDUREACH_RATE_LIMIT_${name.toUpperCase()}_WINDOW_SECONDS`,
    options.windowSeconds || DEFAULT_RATE_LIMIT_WINDOW_SECONDS
  );
  const now = Date.now();
  const bucket = Math.floor(now / (windowSeconds * 1000));
  const resetAt = (bucket + 1) * windowSeconds;
  const key = `${name}:${bucket}:${rateLimitIdentity(request, name)}`;

  try {
    const current = await cache.get(key);
    const count = Math.max(0, Number(current?.count || 0)) + 1;

    response.setHeader?.("X-RateLimit-Limit", String(limit));
    response.setHeader?.("X-RateLimit-Remaining", String(Math.max(0, limit - count)));
    response.setHeader?.("X-RateLimit-Reset", String(resetAt));

    await cache.set(key, { count, resetAt }, {
      ttl: windowSeconds + 5,
      tags: ["rate-limit", `rate-limit:${name}`],
      name: `EduReach ${name} rate limit`
    });

    if (count > limit) {
      response.setHeader?.("Retry-After", String(Math.max(1, resetAt - Math.floor(now / 1000))));
      sendJson(response, 429, {
        ok: false,
        message: "Too many requests. Please try again shortly."
      });
      return false;
    }
  } catch (error) {
    console.warn("EduReach rate limit check failed open.", {
      name,
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }

  return true;
}

export function parseCookies(request) {
  return String(getRequestHeader(request, "cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separator = part.indexOf("=");
      if (separator < 0) return cookies;
      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      cookies[key] = safeDecodeURIComponent(value);
      return cookies;
    }, {});
}

function assertContentLength(request, maxBytes) {
  const contentLength = Number(getRequestHeader(request, "content-length") || 0);

  if (contentLength > maxBytes) {
    throw new ApiRequestError(413, "Request payload is too large.");
  }
}

function assertBodySize(value, maxBytes) {
  const bytes = Buffer.isBuffer(value)
    ? value.byteLength
    : Buffer.byteLength(String(value || ""), "utf8");

  if (bytes > maxBytes) {
    throw new ApiRequestError(413, "Request payload is too large.");
  }
}

function getRateLimitCache() {
  try {
    return getCache({
      namespace: RATE_LIMIT_NAMESPACE
    });
  } catch {
    return null;
  }
}

function rateLimitIdentity(request, name) {
  const forwardedFor = getRequestHeader(request, "x-forwarded-for").split(",")[0].trim();
  const realIp = getRequestHeader(request, "x-real-ip").trim();
  const userAgent = getRequestHeader(request, "user-agent").slice(0, 160);
  const identity = [forwardedFor || realIp || "unknown", userAgent].join("|");
  const secret =
    process.env.EDUREACH_RATE_LIMIT_SECRET ||
    process.env.EDUREACH_BACKEND_SECRET ||
    "development-rate-limit-secret";

  return crypto
    .createHash("sha256")
    .update(`${secret}:${name}:${identity}`)
    .digest("hex");
}

function readPositiveInteger(key, fallback) {
  const value = Number(process.env[key] || fallback);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
}

function normalizeRateLimitName(name) {
  return String(name || "api").toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function isReadableBody(value) {
  return value && typeof value[Symbol.asyncIterator] === "function";
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
