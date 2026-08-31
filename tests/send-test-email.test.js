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

test("send test email endpoint rejects non-POST requests", async () => {
  const req = { method: "GET", headers: {} };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers["allow"], "POST");
});

test("send test email endpoint rejects unauthenticated requests", async () => {
  const req = { method: "POST", headers: {} };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  const data = JSON.parse(res.body);
  assert.equal(data.ok, false);
  assert.equal(data.message, "Admin authentication is required.");
});

test("send test email endpoint requires RESEND_API_KEY", async () => {
  const originalEnv = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    const { token } = await createAdminSession(
      { email: "edureach70@gmail.com", name: "EduReach Admin" },
      { allowLocal: true }
    );

    const req = {
      method: "POST",
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=${token}`
      }
    };
    const res = createMockResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 503);
    const data = JSON.parse(res.body);
    assert.equal(data.ok, false);
    assert.equal(data.message, "Resend email service is not configured.");
  } finally {
    if (originalEnv) process.env.RESEND_API_KEY = originalEnv;
  }
});

test("send test email endpoint rejects invalid email payloads", async () => {
  const originalEnv = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "re_test_123";

  try {
    const { token } = await createAdminSession(
      { email: "edureach70@gmail.com", name: "EduReach Admin" },
      { allowLocal: true }
    );

    const req = {
      method: "POST",
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=${token}`,
        "content-type": "application/json"
      },
      body: { customerEmail: "invalid-email" }
    };
    const res = createMockResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 400);
    const data = JSON.parse(res.body);
    assert.equal(data.ok, false);
    assert.equal(data.message, "A valid customer email address is required.");
  } finally {
    if (originalEnv !== undefined) process.env.RESEND_API_KEY = originalEnv;
    else delete process.env.RESEND_API_KEY;
  }
});

test("send test email endpoint hides raw upstream error details on failure", async () => {
  const originalEnv = process.env.RESEND_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "re_test_123";

  globalThis.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({
      error: {
        message: "Internal Resend API error leaking secret info",
        type: "invalid_request_error"
      }
    })
  });

  try {
    const { token } = await createAdminSession(
      { email: "edureach70@gmail.com", name: "EduReach Admin" },
      { allowLocal: true }
    );

    const req = {
      method: "POST",
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=${token}`,
        "content-type": "application/json"
      },
      body: { customerEmail: "test@example.com" }
    };
    const res = createMockResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 502);
    const data = JSON.parse(res.body);
    assert.equal(data.ok, false);
    assert.equal(data.message, "Failed to send test email through email service.");
    assert.equal(data.details, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnv !== undefined) process.env.RESEND_API_KEY = originalEnv;
    else delete process.env.RESEND_API_KEY;
  }
});
