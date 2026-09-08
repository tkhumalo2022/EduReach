import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/send-test-purchase-email.js";
import { createAdminCookie, createAdminSession } from "../src/lib/adminAuth.js";

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
  const data = JSON.parse(res.body);
  assert.equal(data.ok, false);
});

test("send-test-purchase-email rejects unauthenticated requests with 401", async () => {
  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: { customerEmail: "test@example.com" }
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  const data = JSON.parse(res.body);
  assert.equal(data.ok, false);
  assert.equal(data.message, "Unauthorized access.");
});

test("send-test-purchase-email returns 503 when RESEND_API_KEY is not set for authenticated admin", async () => {
  const originalKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    const created = await createAdminSession({ email: "admin@edureach.co.za" }, { allowLocal: true });
    const cookieHeader = createAdminCookie(created.token, created.maxAgeSeconds, { secure: false });

    const req = {
      method: "POST",
      headers: {
        cookie: cookieHeader,
        "content-type": "application/json"
      },
      body: { customerEmail: "test@example.com" }
    };
    const res = createMockResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 503);
    const data = JSON.parse(res.body);
    assert.equal(data.ok, false);
    assert.equal(data.message, "Missing RESEND_API_KEY in environment variables.");
  } finally {
    if (originalKey !== undefined) {
      process.env.RESEND_API_KEY = originalKey;
    }
  }
});

test("send-test-purchase-email requires customerEmail for authenticated admin", async () => {
  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "re_test_dummy_key";

  try {
    const created = await createAdminSession({ email: "admin@edureach.co.za" }, { allowLocal: true });
    const cookieHeader = createAdminCookie(created.token, created.maxAgeSeconds, { secure: false });

    const req = {
      method: "POST",
      headers: {
        cookie: cookieHeader,
        "content-type": "application/json"
      },
      body: {}
    };
    const res = createMockResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 400);
    const data = JSON.parse(res.body);
    assert.equal(data.ok, false);
    assert.equal(data.message, "customerEmail is required.");
  } finally {
    if (originalKey !== undefined) {
      process.env.RESEND_API_KEY = originalKey;
    } else {
      delete process.env.RESEND_API_KEY;
    }
  }
});
