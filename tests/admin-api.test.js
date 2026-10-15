import assert from "node:assert/strict";
import test from "node:test";

import { handleAdminApi } from "../src/lib/adminApi.js";
import sendTestPurchaseEmailHandler from "../api/send-test-purchase-email.js";
import { createAdminSession, ADMIN_COOKIE_NAME } from "../src/lib/adminAuth.js";

process.env.EDUREACH_RATE_LIMIT_DISABLED = "1";

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: "",
    payload: undefined,
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      this.body = JSON.stringify(data);
      return this;
    },
    end(value = "") {
      this.body = String(value);
      if (this.headers["content-type"]?.includes("application/json")) {
        try {
          this.payload = JSON.parse(this.body);
        } catch {
          this.payload = undefined;
        }
      }
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

test("send-test-purchase-email endpoint rejects non-POST requests with 405", async () => {
  const request = { method: "GET", headers: {} };
  const response = createResponse();

  await sendTestPurchaseEmailHandler(request, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.allow, "POST");
});

test("send-test-purchase-email endpoint rejects unauthenticated requests with 401", async () => {
  const request = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { customerEmail: "test@example.com" }
  };
  const response = createResponse();

  await sendTestPurchaseEmailHandler(request, response);

  assert.equal(response.statusCode, 401);
  assert.equal(response.payload.ok, false);
  assert.equal(response.payload.message, "Authentication required.");
});

test("send-test-purchase-email endpoint rejects invalid CSRF token with 403", async () => {
  const created = await createAdminSession({ email: "admin@edureach.network", name: "Admin" }, { allowLocal: true });
  const request = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${ADMIN_COOKIE_NAME}=${created.token}`,
      "x-edureach-csrf": "wrong-csrf-token"
    },
    body: { customerEmail: "test@example.com" }
  };
  const response = createResponse();

  await sendTestPurchaseEmailHandler(request, response);

  assert.equal(response.statusCode, 403);
  assert.equal(response.payload.ok, false);
});

test("send-test-purchase-email endpoint validates email address when authenticated", async () => {
  const created = await createAdminSession({ email: "admin@edureach.network", name: "Admin" }, { allowLocal: true });
  const previousKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "re_test_key";

  try {
    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${ADMIN_COOKIE_NAME}=${created.token}`,
        "x-edureach-csrf": created.session.csrfToken
      },
      body: { customerEmail: "invalid-email-format" }
    };
    const response = createResponse();

    await sendTestPurchaseEmailHandler(request, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.payload.ok, false);
    assert.match(response.payload.message, /valid customer email address/i);
  } finally {
    if (previousKey == null) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = previousKey;
    }
  }
});
