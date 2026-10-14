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

test("send-test-purchase-email rejects GET request with 405", async () => {
  const request = { method: "GET", headers: {} };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.allow, "POST");
});

test("send-test-purchase-email returns 503 when EDUREACH_EMAIL_TOKEN is unconfigured", async () => {
  const originalToken = process.env.EDUREACH_EMAIL_TOKEN;
  delete process.env.EDUREACH_EMAIL_TOKEN;

  try {
    const request = { method: "POST", headers: { "content-type": "application/json" } };
    const response = createResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 503);
    const body = JSON.parse(response.body);
    assert.equal(body.ok, false);
    assert.equal(body.message, "Test email endpoint is not configured.");
  } finally {
    if (originalToken !== undefined) {
      process.env.EDUREACH_EMAIL_TOKEN = originalToken;
    }
  }
});

test("send-test-purchase-email rejects invalid or missing token with 401", async () => {
  process.env.EDUREACH_EMAIL_TOKEN = "secret-test-token-123";

  try {
    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-edureach-email-token": "wrong-token"
      }
    };
    const response = createResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 401);
    const body = JSON.parse(response.body);
    assert.equal(body.ok, false);
  } finally {
    delete process.env.EDUREACH_EMAIL_TOKEN;
  }
});

test("send-test-purchase-email rejects invalid customerEmail with 400 when authenticated", async () => {
  process.env.EDUREACH_EMAIL_TOKEN = "secret-test-token-123";
  process.env.RESEND_API_KEY = "re_test_key";

  try {
    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-edureach-email-token": "secret-test-token-123"
      },
      body: { customerEmail: "invalid-email" }
    };
    const response = createResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.equal(body.ok, false);
    assert.equal(body.message, "A valid customerEmail is required.");
  } finally {
    delete process.env.EDUREACH_EMAIL_TOKEN;
    delete process.env.RESEND_API_KEY;
  }
});
