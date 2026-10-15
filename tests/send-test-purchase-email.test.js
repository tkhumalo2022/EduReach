import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/send-test-purchase-email.js";
import { createAdminSession, ADMIN_COOKIE_NAME } from "../src/lib/adminAuth.js";

function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end(data) {
      if (data && !this.body) this.body = data;
      return this;
    }
  };
  return res;
}

test("send-test-purchase-email rejects non-POST methods", async () => {
  const req = { method: "GET" };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers["Allow"], "POST");
  assert.equal(res.body.ok, false);
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
  assert.equal(res.body.ok, false);
  assert.match(res.body.error, /authentication required/i);
});

test("send-test-purchase-email rejects requests with invalid CSRF token", async () => {
  const { token } = await createAdminSession(
    { email: "admin@edureach.network" },
    { allowLocal: true }
  );

  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${ADMIN_COOKIE_NAME}=${token}`,
      "x-edureach-csrf": "invalid-csrf-token"
    },
    body: { customerEmail: "test@example.com" }
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.ok, false);
  assert.match(res.body.error, /CSRF/i);
});

test("send-test-purchase-email rejects requests missing customerEmail", async () => {
  process.env.RESEND_API_KEY = "re_dummy_12345";
  const { token, csrfToken } = await createAdminSession(
    { email: "admin@edureach.network" },
    { allowLocal: true }
  );

  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${ADMIN_COOKIE_NAME}=${token}`,
      "x-edureach-csrf": csrfToken
    },
    body: {}
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.ok, false);
  assert.match(res.body.error, /customerEmail is required/i);
});
