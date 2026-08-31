import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/send-test-purchase-email.js";
import { ADMIN_COOKIE_NAME, createAdminSession } from "../src/lib/adminAuth.js";

function createMockResponse() {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    body: "",
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = JSON.stringify(payload);
      return this;
    },
    end(value = "") {
      this.body = String(value);
      return this;
    }
  };
}

test("send-test-purchase-email rejects non-POST HTTP methods", async () => {
  const request = { method: "GET", headers: {} };
  const response = createMockResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.allow, "POST");
});

test("send-test-purchase-email rejects unauthenticated requests", async () => {
  const request = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { customerEmail: "user@example.com" }
  };
  const response = createMockResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 401);
  const data = JSON.parse(response.body);
  assert.equal(data.ok, false);
  assert.equal(data.message, "Admin authorization required.");
});

test("send-test-purchase-email rejects request with invalid CSRF token", async () => {
  const sessionData = await createAdminSession({ email: "admin@edureach.network" }, { allowLocal: true });
  const request = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${ADMIN_COOKIE_NAME}=${sessionData.token}`,
      "x-edureach-csrf": "wrong-csrf-token"
    },
    body: { customerEmail: "user@example.com" }
  };
  const response = createMockResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 403);
  const data = JSON.parse(response.body);
  assert.equal(data.ok, false);
  assert.equal(data.message, "Invalid CSRF token.");
});

test("send-test-purchase-email handles missing RESEND_API_KEY when authenticated", async () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    const sessionData = await createAdminSession({ email: "admin@edureach.network" }, { allowLocal: true });
    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${ADMIN_COOKIE_NAME}=${sessionData.token}`,
        "x-edureach-csrf": sessionData.csrfToken
      },
      body: { customerEmail: "user@example.com" }
    };
    const response = createMockResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 503);
    const data = JSON.parse(response.body);
    assert.equal(data.ok, false);
    assert.equal(data.message, "Email service is not configured.");
  } finally {
    if (originalApiKey !== undefined) {
      process.env.RESEND_API_KEY = originalApiKey;
    }
  }
});

test("send-test-purchase-email rejects invalid customer email addresses", async () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "dummy-resend-key";

  try {
    const sessionData = await createAdminSession({ email: "admin@edureach.network" }, { allowLocal: true });
    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${ADMIN_COOKIE_NAME}=${sessionData.token}`,
        "x-edureach-csrf": sessionData.csrfToken
      },
      body: { customerEmail: "invalid-email-format" }
    };
    const response = createMockResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 400);
    const data = JSON.parse(response.body);
    assert.equal(data.ok, false);
    assert.equal(data.message, "A valid customerEmail is required.");
  } finally {
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalApiKey;
    }
  }
});
