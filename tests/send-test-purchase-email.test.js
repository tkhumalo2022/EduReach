import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/send-test-purchase-email.js";
import { ADMIN_COOKIE_NAME, createAdminSession } from "../src/lib/adminAuth.js";

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[String(key).toLowerCase()] = value;
    },
    end(value = "") {
      this.body = String(value);
    }
  };
}

test("send-test-purchase-email handler rejects non-POST requests with 405", async () => {
  const request = { method: "GET", headers: {} };
  const response = createMockResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 405);
  const data = JSON.parse(response.body);
  assert.equal(data.ok, false);
});

test("send-test-purchase-email handler rejects unauthenticated requests with 401", async () => {
  const request = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customerEmail: "test@example.com" })
  };
  const response = createMockResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 401);
  const data = JSON.parse(response.body);
  assert.equal(data.ok, false);
  assert.equal(data.message, "Authentication required.");
});

test("send-test-purchase-email handler rejects requests with invalid CSRF token with 403", async () => {
  const allowLocal = process.env.NODE_ENV !== "production";
  const created = await createAdminSession(
    { email: "admin@edureach.network", name: "Admin" },
    {
      allowLocal,
      config: {
        email: "admin@edureach.network",
        passwordHash: "hash",
        sessionHours: 1
      }
    }
  );

  const request = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${ADMIN_COOKIE_NAME}=${created.token}`,
      "x-edureach-csrf": "wrong-csrf-token"
    },
    body: JSON.stringify({ customerEmail: "test@example.com" })
  };
  const response = createMockResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 403);
  const data = JSON.parse(response.body);
  assert.equal(data.ok, false);
});

test("send-test-purchase-email handler returns 503 when RESEND_API_KEY is missing", async () => {
  const origKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    const allowLocal = process.env.NODE_ENV !== "production";
    const created = await createAdminSession(
      { email: "admin@edureach.network", name: "Admin" },
      {
        allowLocal,
        config: {
          email: "admin@edureach.network",
          passwordHash: "hash",
          sessionHours: 1
        }
      }
    );

    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${ADMIN_COOKIE_NAME}=${created.token}`,
        "x-edureach-csrf": created.csrfToken
      },
      body: JSON.stringify({ customerEmail: "test@example.com" })
    };
    const response = createMockResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 503);
    const data = JSON.parse(response.body);
    assert.equal(data.ok, false);
    assert.equal(data.message, "Email service is not configured.");
  } finally {
    if (origKey !== undefined) process.env.RESEND_API_KEY = origKey;
  }
});

test("send-test-purchase-email handler returns 400 when customerEmail is missing", async () => {
  const origKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "resend_test_key";

  try {
    const allowLocal = process.env.NODE_ENV !== "production";
    const created = await createAdminSession(
      { email: "admin@edureach.network", name: "Admin" },
      {
        allowLocal,
        config: {
          email: "admin@edureach.network",
          passwordHash: "hash",
          sessionHours: 1
        }
      }
    );

    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${ADMIN_COOKIE_NAME}=${created.token}`,
        "x-edureach-csrf": created.csrfToken
      },
      body: JSON.stringify({})
    };
    const response = createMockResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 400);
    const data = JSON.parse(response.body);
    assert.equal(data.ok, false);
    assert.equal(data.message, "customerEmail is required.");
  } finally {
    if (origKey !== undefined) process.env.RESEND_API_KEY = origKey;
    else delete process.env.RESEND_API_KEY;
  }
});

test("send-test-purchase-email handler sends email when authenticated and authorized", async () => {
  const origKey = process.env.RESEND_API_KEY;
  const origFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "resend_test_key";

  globalThis.fetch = async (url) => {
    assert.equal(url, "https://api.resend.com/emails");
    return {
      ok: true,
      async json() {
        return { id: "resend_msg_123" };
      }
    };
  };

  try {
    const allowLocal = process.env.NODE_ENV !== "production";
    const created = await createAdminSession(
      { email: "admin@edureach.network", name: "Admin" },
      {
        allowLocal,
        config: {
          email: "admin@edureach.network",
          passwordHash: "hash",
          sessionHours: 1
        }
      }
    );

    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${ADMIN_COOKIE_NAME}=${created.token}`,
        "x-edureach-csrf": created.csrfToken
      },
      body: JSON.stringify({ customerEmail: "test@example.com", customerName: "Jane" })
    };
    const response = createMockResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 200);
    const data = JSON.parse(response.body);
    assert.equal(data.ok, true);
    assert.equal(data.id, "resend_msg_123");
  } finally {
    globalThis.fetch = origFetch;
    if (origKey !== undefined) process.env.RESEND_API_KEY = origKey;
    else delete process.env.RESEND_API_KEY;
  }
});
