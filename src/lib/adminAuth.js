import crypto from "node:crypto";
import { getCache } from "@vercel/functions";

import { getRequestHeader, parseCookies } from "./security.js";

export const ADMIN_COOKIE_NAME = "__Host-edureach_admin";

const ADMIN_SESSION_NAMESPACE = "edureach-admin-sessions";
const DEFAULT_ADMIN_EMAIL = "edureach70@gmail.com";
const DEFAULT_ADMIN_PASSWORD_HASH =
  "scrypt$16384$8$1$RNCi4IrumHASjP6aIzyzuw$c5dvfdVlVIMz_rEa0Oasee11yEA5ehsva0NS3ct3z9w";
const DEFAULT_SESSION_HOURS = 8;
const MIN_SESSION_HOURS = 1;
const MAX_SESSION_HOURS = 24;
const TOKEN_BYTES = 32;
const CSRF_BYTES = 24;

const localSessions = new Map();

export class AdminAuthError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "AdminAuthError";
    this.statusCode = statusCode;
  }
}

export function getAdminConfig(env = process.env) {
  const sessionHours = clampNumber(
    Number(env.EDUREACH_ADMIN_SESSION_HOURS || DEFAULT_SESSION_HOURS),
    MIN_SESSION_HOURS,
    MAX_SESSION_HOURS
  );

  return {
    email: String(env.EDUREACH_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase(),
    passwordHash: String(env.EDUREACH_ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_PASSWORD_HASH).trim(),
    sessionHours
  };
}

export async function verifyAdminCredentials(email, password, config = getAdminConfig()) {
  const suppliedEmail = String(email || "").trim().toLowerCase();
  const suppliedPassword = String(password || "");
  const emailMatches = safeEqual(suppliedEmail, config.email);
  const passwordMatches = await verifyScryptPassword(suppliedPassword, config.passwordHash);
  return emailMatches && passwordMatches;
}

export async function createAdminSession(profile, options = {}) {
  const config = options.config || getAdminConfig();
  const now = Date.now();
  const maxAgeSeconds = Math.round(config.sessionHours * 60 * 60);
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const csrfToken = crypto.randomBytes(CSRF_BYTES).toString("base64url");
  const session = {
    email: String(profile?.email || config.email).trim().toLowerCase(),
    name: String(profile?.name || "EduReach Admin").trim(),
    csrfToken,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + maxAgeSeconds * 1000).toISOString()
  };

  await writeSession(token, session, maxAgeSeconds, options);

  return {
    token,
    csrfToken,
    session,
    maxAgeSeconds
  };
}

export async function getAdminSession(request, options = {}) {
  const token = parseCookies(request)[ADMIN_COOKIE_NAME];
  if (!token || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) return null;

  const session = await readSession(token, options);
  if (!session || session.revoked || !session.expiresAt) return null;

  if (Date.parse(session.expiresAt) <= Date.now()) {
    await revokeSession(token, options);
    return null;
  }

  return { token, ...session };
}

export async function revokeAdminSession(request, options = {}) {
  const token = parseCookies(request)[ADMIN_COOKIE_NAME];
  if (!token) return;
  await revokeSession(token, options);
}

export function requireValidCsrf(request, session) {
  const supplied = String(getRequestHeader(request, "x-edureach-csrf") || "");
  if (!supplied || !safeEqual(supplied, String(session?.csrfToken || ""))) {
    throw new AdminAuthError(403, "This admin request could not be verified.");
  }
}

export function createAdminCookie(token, maxAgeSeconds, options = {}) {
  const secure = options.secure ?? process.env.NODE_ENV === "production";
  return [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : "",
    `Max-Age=${Math.max(0, Math.trunc(maxAgeSeconds || 0))}`
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearAdminCookie(options = {}) {
  return createAdminCookie("", 0, options);
}

export function publicAdminSession(session) {
  if (!session) return null;
  return {
    email: session.email,
    name: session.name,
    csrfToken: session.csrfToken,
    expiresAt: session.expiresAt
  };
}

export async function verifyScryptPassword(password, encodedHash) {
  const parts = String(encodedHash || "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    await runFakePasswordCheck(password);
    return false;
  }

  const salt = decodeBase64Url(parts[4]);
  const expected = decodeBase64Url(parts[5]);
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);

  if (!salt.length || expected.length !== 32 || N !== 16384 || r !== 8 || p !== 1) {
    await runFakePasswordCheck(password);
    return false;
  }

  const actual = await scrypt(String(password || ""), salt, expected.length, {
    N,
    r,
    p,
    maxmem: 64 * 1024 * 1024
  });

  return crypto.timingSafeEqual(actual, expected);
}

async function writeSession(token, session, ttl, options) {
  const cache = getAdminSessionCache(options);
  const key = sessionKey(token);

  if (cache) {
    await cache.set(key, session, {
      ttl,
      tags: ["admin-session"],
      name: "EduReach admin session"
    });
    return;
  }

  if (allowLocalSessions(options)) {
    localSessions.set(key, session);
    return;
  }

  throw new AdminAuthError(503, "Admin sign-in is temporarily unavailable.");
}

async function readSession(token, options) {
  const cache = getAdminSessionCache(options);
  const key = sessionKey(token);

  if (cache) return cache.get(key);
  if (allowLocalSessions(options)) return localSessions.get(key) || null;
  return null;
}

async function revokeSession(token, options) {
  const cache = getAdminSessionCache(options);
  const key = sessionKey(token);

  if (cache) {
    if (typeof cache.delete === "function") {
      await cache.delete(key);
    } else {
      await cache.set(key, { revoked: true }, { ttl: 5, name: "Revoked EduReach admin session" });
    }
  }

  localSessions.delete(key);
}

function getAdminSessionCache(options = {}) {
  if (options.cache) return options.cache;

  try {
    return getCache({ namespace: ADMIN_SESSION_NAMESPACE });
  } catch {
    return null;
  }
}

function allowLocalSessions(options = {}) {
  return options.allowLocal === true || process.env.NODE_ENV !== "production";
}

function sessionKey(token) {
  return `session:${crypto.createHash("sha256").update(String(token || "")).digest("hex")}`;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function decodeBase64Url(value) {
  try {
    return Buffer.from(String(value || ""), "base64url");
  } catch {
    return Buffer.alloc(0);
  }
}

function scrypt(password, salt, length, options) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, length, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

async function runFakePasswordCheck(password) {
  await scrypt(String(password || ""), Buffer.alloc(16, 7), 32, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024
  });
}

function clampNumber(value, minimum, maximum) {
  if (!Number.isFinite(value)) return DEFAULT_SESSION_HOURS;
  return Math.min(maximum, Math.max(minimum, value));
}
