import assert from "node:assert/strict";
import test from "node:test";

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

test("send-test-purchase-email API rejects unauthenticated requests", async () => {
  const handler = (await import("../api/send-test-purchase-email.js")).default;
  const request = { method: "POST", headers: {} };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 401);
  assert.deepEqual(JSON.parse(response.body), {
    ok: false,
    error: "Admin authentication required"
  });
});

test("send-test-purchase-email API rejects invalid CSRF tokens for active admin sessions", async () => {
  const handler = (await import("../api/send-test-purchase-email.js")).default;
  const { createAdminSession, createAdminCookie } = await import("../src/lib/adminAuth.js");

  const sessionData = await createAdminSession(
    { email: "admin@edureach.co.za", name: "EduReach Admin" },
    { config: { email: "admin@edureach.co.za", sessionHours: 1 }, allowLocal: true }
  );

  const cookie = createAdminCookie(sessionData.token, sessionData.maxAgeSeconds);
  const request = {
    method: "POST",
    headers: {
      cookie,
      "x-edureach-csrf": "invalid-csrf-token"
    }
  };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 403);
  assert.deepEqual(JSON.parse(response.body), {
    ok: false,
    error: "This admin request could not be verified."
  });
});
