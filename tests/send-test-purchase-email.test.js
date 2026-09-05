import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/send-test-purchase-email.js";
import { ADMIN_COOKIE_NAME, createAdminSession } from "../src/lib/adminAuth.js";

function createMockResponse() {
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

test("send-test-purchase-email rejects GET method with 405", async () => {
  const req = { method: "GET", headers: {} };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers["allow"], "POST");
  const data = JSON.parse(res.body);
  assert.equal(data.ok, false);
  assert.equal(data.message, "Method not allowed.");
});

test("send-test-purchase-email rejects unauthenticated requests with 401", async () => {
  const req = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { customerEmail: "test@example.com" }
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  const data = JSON.parse(res.body);
  assert.equal(data.ok, false);
  assert.equal(data.message, "Admin authentication required.");
});

test("send-test-purchase-email rejects missing or invalid CSRF token with 403", async () => {
  const created = await createAdminSession(
    { email: "admin@edureach.org", name: "EduReach Admin" },
    { allowLocal: true }
  );

  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${ADMIN_COOKIE_NAME}=${created.token}`,
      "x-edureach-csrf": "wrong-csrf-token"
    },
    body: { customerEmail: "test@example.com" }
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  const data = JSON.parse(res.body);
  assert.equal(data.ok, false);
});

test("send-test-purchase-email rejects invalid customer email with 400", async () => {
  const created = await createAdminSession(
    { email: "admin@edureach.org", name: "EduReach Admin" },
    { allowLocal: true }
  );

  process.env.RESEND_API_KEY = "re_dummy_key";

  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${ADMIN_COOKIE_NAME}=${created.token}`,
      "x-edureach-csrf": created.csrfToken
    },
    body: { customerEmail: "invalid-email" }
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  const data = JSON.parse(res.body);
  assert.equal(data.ok, false);
  assert.equal(data.message, "A valid customerEmail is required.");
});

test("send-test-purchase-email returns 503 when RESEND_API_KEY is not configured", async () => {
  const created = await createAdminSession(
    { email: "admin@edureach.org", name: "EduReach Admin" },
    { allowLocal: true }
  );

  const oldApiKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    const req = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${ADMIN_COOKIE_NAME}=${created.token}`,
        "x-edureach-csrf": created.csrfToken
      },
      body: { customerEmail: "user@example.com" }
    };
    const res = createMockResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 503);
    const data = JSON.parse(res.body);
    assert.equal(data.ok, false);
    assert.equal(data.message, "Email service is not configured.");
  } finally {
    if (oldApiKey) process.env.RESEND_API_KEY = oldApiKey;
  }
});
