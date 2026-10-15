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
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = JSON.stringify(data);
      return this;
    },
    end(value = "") {
      if (value) this.body = String(value);
    }
  };
}

test("send-test-purchase-email rejects non-POST HTTP methods", async () => {
  const req = { method: "GET", headers: {} };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers["allow"], "POST");
});

test("send-test-purchase-email rejects unauthenticated requests", async () => {
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
  assert.match(json.message, /Authentication is required/i);
});

test("send-test-purchase-email rejects requests with invalid customer email when authorized", async () => {
  const previousSecret = process.env.EDUREACH_BACKEND_SECRET;
  const previousResendKey = process.env.RESEND_API_KEY;
  process.env.EDUREACH_BACKEND_SECRET = "test-secret-123";
  process.env.RESEND_API_KEY = "re_test_key";

  try {
    const req = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-edureach-secret": "test-secret-123"
      },
      body: { customerEmail: "invalid-email" }
    };
    const res = createMockResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 400);
    const json = JSON.parse(res.body);
    assert.equal(json.ok, false);
    assert.match(json.message, /valid customer email/i);
  } finally {
    process.env.EDUREACH_BACKEND_SECRET = previousSecret;
    process.env.RESEND_API_KEY = previousResendKey;
  }
});
