import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/send-test-purchase-email.js";
import { ADMIN_COOKIE_NAME, createAdminSession } from "../src/lib/adminAuth.js";

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

test("send-test-purchase-email rejects GET requests with 405", async () => {
  const req = { method: "GET", headers: {} };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
});

test("send-test-purchase-email rejects unauthenticated requests with 401", async () => {
  const req = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { customerEmail: "test@example.com" }
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(JSON.parse(res.body).ok, false);
});

test("send-test-purchase-email rejects missing CSRF header with 403 when session exists", async () => {
  const config = {
    email: "admin@edureach.network",
    passwordHash: "scrypt$16384$8$1$salt$hash",
    sessionHours: 8,
    configured: true
  };
  const { token } = await createAdminSession(
    { email: "admin@edureach.network", name: "Admin" },
    { config, allowLocal: true }
  );

  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${ADMIN_COOKIE_NAME}=${token}`
    },
    body: { customerEmail: "test@example.com" }
  };
  const res = createResponse();

  await handler(req, res, { allowLocal: true });

  assert.equal(res.statusCode, 403);
  assert.equal(JSON.parse(res.body).ok, false);
});
