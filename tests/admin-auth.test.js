import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  ADMIN_COOKIE_NAME,
  clearAdminCookie,
  createAdminCookie,
  createAdminSession,
  getAdminSession,
  getAdminConfig,
  revokeAdminSession,
  verifyAdminCredentials,
  verifyScryptPassword
} from "../src/lib/adminAuth.js";

function passwordHash(password) {
  const salt = Buffer.from("0123456789abcdef", "utf8");
  const derived = crypto.scryptSync(password, salt, 32, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024
  });

  return [
    "scrypt",
    "16384",
    "8",
    "1",
    salt.toString("base64url"),
    derived.toString("base64url")
  ].join("$");
}

test("admin password verification accepts the correct password only", async () => {
  const hash = passwordHash("correct horse battery staple");
  assert.equal(await verifyScryptPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyScryptPassword("wrong password", hash), false);
});

test("admin credentials normalize email casing and whitespace", async () => {
  const config = {
    email: "admin@edureach.network",
    passwordHash: passwordHash("a strong test password"),
    sessionHours: 8
  };

  assert.equal(
    await verifyAdminCredentials("  ADMIN@EDUREACH.NETWORK ", "a strong test password", config),
    true
  );
  assert.equal(
    await verifyAdminCredentials("other@edureach.network", "a strong test password", config),
    false
  );
});

test("admin config fails closed when credentials are absent", async () => {
  const config = getAdminConfig({});

  assert.equal(config.configured, false);
  assert.equal(config.email, "");
  assert.equal(config.passwordHash, "");
  assert.equal(await verifyAdminCredentials("admin@example.com", "any password", config), false);
});

test("admin config reports configured only when both credential values exist", () => {
  const complete = getAdminConfig({
    EDUREACH_ADMIN_EMAIL: "admin@edureach.network",
    EDUREACH_ADMIN_PASSWORD_HASH: passwordHash("configured password")
  });
  const missingHash = getAdminConfig({
    EDUREACH_ADMIN_EMAIL: "admin@edureach.network"
  });

  assert.equal(complete.configured, true);
  assert.equal(missingHash.configured, false);
});

test("admin config clamps the session lifetime", () => {
  assert.equal(getAdminConfig({ EDUREACH_ADMIN_SESSION_HOURS: "99" }).sessionHours, 24);
  assert.equal(getAdminConfig({ EDUREACH_ADMIN_SESSION_HOURS: "0" }).sessionHours, 1);
});

test("admin session cookies are httpOnly, strict and secure in production", () => {
  const cookie = createAdminCookie("token-value", 3600, { secure: true });
  assert.match(cookie, new RegExp(`^${ADMIN_COOKIE_NAME}=`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /Max-Age=3600/);

  assert.match(clearAdminCookie({ secure: true }), /Max-Age=0/);
});

test("admin sessions are stored server-side and can be revoked", async () => {
  const values = new Map();
  const cache = {
    async get(key) { return values.get(key) || null; },
    async set(key, value) { values.set(key, value); },
    async delete(key) { values.delete(key); }
  };
  const created = await createAdminSession(
    { email: "admin@edureach.network", name: "Admin" },
    {
      cache,
      config: {
        email: "admin@edureach.network",
        passwordHash: passwordHash("unused password"),
        sessionHours: 1
      }
    }
  );
  const request = {
    headers: {
      cookie: `${ADMIN_COOKIE_NAME}=${created.token}`
    }
  };

  const session = await getAdminSession(request, { cache });
  assert.equal(session.email, "admin@edureach.network");
  assert.equal(session.csrfToken, created.csrfToken);

  await revokeAdminSession(request, { cache });
  assert.equal(await getAdminSession(request, { cache }), null);
});
