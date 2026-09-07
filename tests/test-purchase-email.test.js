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

test("test purchase email rejects non-POST requests", async () => {
  const request = { method: "GET", headers: {} };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers["allow"], "POST");
  assert.deepEqual(JSON.parse(response.body), {
    ok: false,
    message: "Method not allowed."
  });
});

test("test purchase email rejects unauthenticated requests", async () => {
  const request = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { customerEmail: "test@example.com" }
  };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 401);
  assert.deepEqual(JSON.parse(response.body), {
    ok: false,
    message: "Unauthorized. Admin authentication is required to send test emails."
  });
});

test("test purchase email accepts authorized request with secret header", async () => {
  const origKey = process.env.RESEND_API_KEY;
  const origSecret = process.env.EDUREACH_ADMIN_DEBUG_SECRET;
  process.env.RESEND_API_KEY = "test_key";
  process.env.EDUREACH_ADMIN_DEBUG_SECRET = "secret123";

  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ id: "msg_123" })
  });

  try {
    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-edureach-admin-secret": "secret123"
      },
      body: { customerEmail: "test@example.com" }
    };
    const response = createResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      ok: true,
      id: "msg_123"
    });
  } finally {
    process.env.RESEND_API_KEY = origKey;
    process.env.EDUREACH_ADMIN_DEBUG_SECRET = origSecret;
    globalThis.fetch = origFetch;
  }
});

test("test purchase email does not leak vendor details on resend failure", async () => {
  const origKey = process.env.RESEND_API_KEY;
  const origSecret = process.env.EDUREACH_ADMIN_DEBUG_SECRET;
  process.env.RESEND_API_KEY = "test_key";
  process.env.EDUREACH_ADMIN_DEBUG_SECRET = "secret123";

  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 403,
    json: async () => ({ error: { message: "Internal secret resend error details" } })
  });

  try {
    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-edureach-admin-secret": "secret123"
      },
      body: { customerEmail: "test@example.com" }
    };
    const response = createResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 502);
    const parsed = JSON.parse(response.body);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.message, "Failed to send test purchase email.");
    assert.equal(parsed.details, undefined);
  } finally {
    process.env.RESEND_API_KEY = origKey;
    process.env.EDUREACH_ADMIN_DEBUG_SECRET = origSecret;
    globalThis.fetch = origFetch;
  }
});
