import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/send-test-purchase-email.js";
import { ADMIN_COOKIE_NAME, createAdminSession, getAdminSession } from "../src/lib/adminAuth.js";

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(key, value) {
      this.headers[String(key).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end(data) {
      if (data) this.body = data;
    }
  };
}

test("send-test-purchase-email handler rejects non-POST requests with 405", async () => {
  const req = { method: "GET", headers: {} };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "POST");
  assert.deepEqual(res.body, { ok: false, message: "Method not allowed." });
});

test("send-test-purchase-email handler rejects unauthenticated requests with 401", async () => {
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
  assert.deepEqual(res.body, { ok: false, message: "Unauthorized admin access required." });
});

async function authenticatedAdminRequest(extraHeaders = {}, body = { customerEmail: "test@example.com" }) {
  const created = await createAdminSession(
    { email: "admin@example.com", name: "Test Admin" },
    { config: { email: "admin@example.com", passwordHash: "unused", sessionHours: 1 }, allowLocal: true }
  );
  const headers = {
    cookie: `${ADMIN_COOKIE_NAME}=${created.token}`,
    "content-type": "application/json",
    ...extraHeaders
  };
  assert.ok(await getAdminSession({ headers }), "The test admin session should be available");
  return { req: { method: "POST", headers, body }, csrfToken: created.csrfToken };
}

test("authenticated admin requests require the session CSRF token", async () => {
  const { req } = await authenticatedAdminRequest();
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, {
    ok: false,
    message: "This admin request could not be verified."
  });
});

test("authenticated email requests reject invalid recipient data before contacting Resend", async () => {
  const oldKey = process.env.RESEND_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "dummy-local-test-key";
  globalThis.fetch = () => { throw new Error("Resend must not be called for invalid recipients"); };

  try {
    const { req, csrfToken } = await authenticatedAdminRequest();
    req.headers["x-edureach-csrf"] = csrfToken;
    for (const invalidEmail of ["bad-address", "name@example.com\r\nBcc:attacker@example.com"]) {
      const res = createMockResponse();
      req.body.customerEmail = invalidEmail;
      await handler(req, res);
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.message, "A valid customerEmail is required.");
    }
  } finally {
    if (oldKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = oldKey;
    globalThis.fetch = oldFetch;
  }
});

test("authorised admin can send one validated test email with a valid CSRF token", async () => {
  const oldKey = process.env.RESEND_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "dummy-local-test-key";
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ id: "local-mock-id" }) };
  };

  try {
    const { req, csrfToken } = await authenticatedAdminRequest();
    req.headers["x-edureach-csrf"] = csrfToken;
    req.body.customerName = "Teacher\r\nBcc: attacker@example.com";
    const res = createMockResponse();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ok: true, id: "local-mock-id" });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "https://api.resend.com/emails");
    const sent = JSON.parse(requests[0].options.body);
    assert.equal(sent.to, "test@example.com");
    assert.ok(!sent.subject.includes("\n") && !sent.subject.includes("\r"));
  } finally {
    if (oldKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = oldKey;
    globalThis.fetch = oldFetch;
  }
});
