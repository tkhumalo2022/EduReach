import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/send-test-purchase-email.js";
import { createAdminSession } from "../src/lib/adminAuth.js";

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

test("send-test-purchase-email rejects non-POST requests with 405", async () => {
  const req = { method: "GET", headers: {} };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "POST");
  assert.deepEqual(JSON.parse(res.body), {
    ok: false,
    message: "Method not allowed."
  });
});

test("send-test-purchase-email rejects unauthenticated requests with 401", async () => {
  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ customerEmail: "test@example.com" })
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(JSON.parse(res.body), {
    ok: false,
    message: "Admin session required."
  });
});

test("send-test-purchase-email returns 503 when RESEND_API_KEY is unconfigured", async () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    const adminSession = await createAdminSession(
      { email: "admin@edureach.network", name: "EduReach Admin" },
      { allowLocal: true }
    );

    const req = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `__Host-edureach_admin=${adminSession.token}`
      },
      body: JSON.stringify({ customerEmail: "test@example.com" })
    };
    const res = createMockResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 503);
    assert.deepEqual(JSON.parse(res.body), {
      ok: false,
      message: "Email service is not configured."
    });
  } finally {
    if (originalApiKey !== undefined) {
      process.env.RESEND_API_KEY = originalApiKey;
    } else {
      delete process.env.RESEND_API_KEY;
    }
  }
});

test("send-test-purchase-email rejects invalid customerEmail with 400 when authenticated as admin", async () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "re_test_123456789";

  try {
    const adminSession = await createAdminSession(
      { email: "admin@edureach.network", name: "EduReach Admin" },
      { allowLocal: true }
    );

    const req = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `__Host-edureach_admin=${adminSession.token}`
      },
      body: JSON.stringify({ customerEmail: "not-a-valid-email" })
    };
    const res = createMockResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(JSON.parse(res.body), {
      ok: false,
      message: "Valid customerEmail is required."
    });
  } finally {
    if (originalApiKey !== undefined) {
      process.env.RESEND_API_KEY = originalApiKey;
    } else {
      delete process.env.RESEND_API_KEY;
    }
  }
});
