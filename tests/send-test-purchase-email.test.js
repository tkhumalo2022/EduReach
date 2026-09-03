import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/send-test-purchase-email.js";

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

test("send-test-purchase-email rejects GET request with 405", async () => {
  const req = { method: "GET", headers: {} };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "POST");
});

test("send-test-purchase-email rejects unauthenticated POST with 401", async () => {
  const req = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { customerEmail: "test@example.com" }
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  const json = JSON.parse(res.body);
  assert.equal(json.ok, false);
  assert.equal(json.message, "Unauthorized.");
});

test("send-test-purchase-email accepts request with valid admin secret header", async () => {
  const originalSecret = process.env.EDUREACH_ADMIN_DEBUG_SECRET;
  const originalApiKey = process.env.RESEND_API_KEY;

  process.env.EDUREACH_ADMIN_DEBUG_SECRET = "test-admin-secret-123";
  delete process.env.RESEND_API_KEY;

  try {
    const req = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-edureach-admin-secret": "test-admin-secret-123"
      },
      body: { customerEmail: "test@example.com" }
    };
    const res = createMockResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 503);
    const json = JSON.parse(res.body);
    assert.equal(json.ok, false);
    assert.equal(json.message, "Email delivery service is not configured.");
  } finally {
    if (originalSecret !== undefined) process.env.EDUREACH_ADMIN_DEBUG_SECRET = originalSecret;
    else delete process.env.EDUREACH_ADMIN_DEBUG_SECRET;

    if (originalApiKey !== undefined) process.env.RESEND_API_KEY = originalApiKey;
    else delete process.env.RESEND_API_KEY;
  }
});
