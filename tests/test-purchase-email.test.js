import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/send-test-purchase-email.js";

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

test("send-test-purchase-email rejects non-POST requests", async () => {
  const request = { method: "GET", headers: {} };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers["allow"], "POST");
});

test("send-test-purchase-email rejects unauthenticated requests", async () => {
  const request = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { customerEmail: "test@example.com" }
  };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 401);
  const json = JSON.parse(response.body);
  assert.equal(json.ok, false);
  assert.match(json.message, /Unauthorized/i);
});

test("send-test-purchase-email rejects authenticated request missing RESEND_API_KEY", async () => {
  const oldKey = process.env.RESEND_API_KEY;
  const oldSecret = process.env.EDUREACH_BACKEND_SECRET;
  delete process.env.RESEND_API_KEY;
  process.env.EDUREACH_BACKEND_SECRET = "test-secret-123";

  try {
    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-edureach-admin-secret": "test-secret-123"
      },
      body: { customerEmail: "test@example.com" }
    };
    const response = createResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 503);
    const json = JSON.parse(response.body);
    assert.equal(json.ok, false);
    assert.match(json.message, /Missing RESEND_API_KEY/i);
  } finally {
    if (oldKey) process.env.RESEND_API_KEY = oldKey;
    if (oldSecret) process.env.EDUREACH_BACKEND_SECRET = oldSecret;
    else delete process.env.EDUREACH_BACKEND_SECRET;
  }
});

test("send-test-purchase-email validates missing customerEmail when authenticated", async () => {
  const oldKey = process.env.RESEND_API_KEY;
  const oldSecret = process.env.EDUREACH_BACKEND_SECRET;
  process.env.RESEND_API_KEY = "dummy-resend-key";
  process.env.EDUREACH_BACKEND_SECRET = "test-secret-123";

  try {
    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-edureach-admin-secret": "test-secret-123"
      },
      body: {}
    };
    const response = createResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 400);
    const json = JSON.parse(response.body);
    assert.equal(json.ok, false);
    assert.match(json.message, /customerEmail is required/i);
  } finally {
    if (oldKey) process.env.RESEND_API_KEY = oldKey;
    else delete process.env.RESEND_API_KEY;
    if (oldSecret) process.env.EDUREACH_BACKEND_SECRET = oldSecret;
    else delete process.env.EDUREACH_BACKEND_SECRET;
  }
});
