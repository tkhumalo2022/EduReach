import assert from "node:assert/strict";
import test from "node:test";

import { handleAdminApi } from "../src/lib/adminApi.js";
import sendTestPurchaseEmailHandler from "../api/send-test-purchase-email.js";
import { ADMIN_COOKIE_NAME, createAdminSession } from "../src/lib/adminAuth.js";

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: "",
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.setHeader("Content-Type", "application/json; charset=utf-8");
      this.body = JSON.stringify(payload);
      return this;
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

test("send-test-purchase-email requires authentication", async () => {
  const request = {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ customerEmail: "test@example.com" })
  };
  const response = createResponse();

  await sendTestPurchaseEmailHandler(request, response);

  assert.equal(response.statusCode, 401);
  const data = JSON.parse(response.body);
  assert.equal(data.ok, false);
  assert.equal(data.message, "Admin authentication required.");
});

test("send-test-purchase-email checks CSRF token when authenticated", async () => {
  const created = await createAdminSession(
    { email: "admin@edureach.network", name: "Admin" },
    { allowLocal: true }
  );

  const request = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${ADMIN_COOKIE_NAME}=${created.token}`,
      "x-edureach-csrf": "invalid-csrf-token"
    },
    body: JSON.stringify({ customerEmail: "test@example.com" })
  };
  const response = createResponse();

  await sendTestPurchaseEmailHandler(request, response);

  assert.equal(response.statusCode, 403);
  const data = JSON.parse(response.body);
  assert.equal(data.ok, false);
});
