import assert from "node:assert/strict";
import test from "node:test";

import sendTestPurchaseEmailHandler from "../api/send-test-purchase-email.js";
import { handleAdminApi } from "../src/lib/adminApi.js";
import { createAdminCookie, createAdminSession } from "../src/lib/adminAuth.js";

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: "",
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    end(value = "") {
      this.body = String(value);
    }
  };
}

test("admin session action rejects unauthenticated requests", async () => {
  const request = { method: "GET", headers: {} };
  const response = createResponse();

  await handleAdminApi(request, response, "session");

  assert.equal(response.statusCode, 401);
  assert.deepEqual(JSON.parse(response.body), {
    ok: false,
    authenticated: false
  });
});

test("admin API rejects unknown actions", async () => {
  const request = { method: "GET", headers: {} };
  const response = createResponse();

  await handleAdminApi(request, response, "unknown");

  assert.equal(response.statusCode, 404);
});

test("test purchase email rejects non-POST methods", async () => {
  const request = { method: "GET", headers: {} };
  const response = createResponse();

  await sendTestPurchaseEmailHandler(request, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers["allow"], "POST");
});

test("test purchase email rejects unauthenticated requests", async () => {
  const request = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customerEmail: "test@example.com" })
  };
  const response = createResponse();

  await sendTestPurchaseEmailHandler(request, response);

  assert.equal(response.statusCode, 401);
  const json = JSON.parse(response.body);
  assert.equal(json.ok, false);
  assert.equal(json.message, "Admin authentication required.");
});

test("test purchase email rejects invalid customer email when authenticated", async () => {
  const prevKey = process.env.RESEND_API_KEY;
  const prevEmail = process.env.EDUREACH_ADMIN_EMAIL;
  const prevHash = process.env.EDUREACH_ADMIN_PASSWORD_HASH;

  process.env.RESEND_API_KEY = "test_key";
  process.env.EDUREACH_ADMIN_EMAIL = "admin@edureach.network";
  process.env.EDUREACH_ADMIN_PASSWORD_HASH = "scrypt$16384$8$1$salt$hash";

  try {
    const session = await createAdminSession({ email: "admin@edureach.network" }, { allowLocal: true });
    const cookieHeader = createAdminCookie(session.token, session.maxAgeSeconds, { secure: false });

    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader
      },
      body: JSON.stringify({ customerEmail: "invalid-email" })
    };
    const response = createResponse();

    await sendTestPurchaseEmailHandler(request, response);

    assert.equal(response.statusCode, 400);
    const json = JSON.parse(response.body);
    assert.equal(json.ok, false);
    assert.equal(json.message, "Valid customerEmail is required.");
  } finally {
    process.env.RESEND_API_KEY = prevKey;
    process.env.EDUREACH_ADMIN_EMAIL = prevEmail;
    process.env.EDUREACH_ADMIN_PASSWORD_HASH = prevHash;
  }
});
