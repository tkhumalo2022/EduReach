import assert from "node:assert/strict";
import test from "node:test";

import sendTestEmailHandler from "../api/send-test-purchase-email.js";
import { handleAdminApi } from "../src/lib/adminApi.js";

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

test("send test email endpoint rejects unauthenticated requests", async () => {
  const request = { method: "POST", headers: { "content-type": "application/json" } };
  const response = createResponse();

  await sendTestEmailHandler(request, response);

  assert.equal(response.statusCode, 401);
  assert.equal(JSON.parse(response.body).ok, false);
});

test("send test email endpoint rejects unsupported HTTP methods", async () => {
  const request = { method: "GET", headers: {} };
  const response = createResponse();

  await sendTestEmailHandler(request, response);

  assert.equal(response.statusCode, 405);
});
