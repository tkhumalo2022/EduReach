import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/send-test-purchase-email.js";
import { createAdminSession, createAdminCookie, ADMIN_COOKIE_NAME } from "../src/lib/adminAuth.js";

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
      if (data) this.body = data;
      return this;
    }
  };
  return res;
}

test("send-test-purchase-email rejects non-POST requests with 405", async () => {
  const req = { method: "GET" };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: "Use POST" });
});

test("send-test-purchase-email rejects unauthenticated POST requests with 401", async () => {
  const req = {
    method: "POST",
    headers: {},
    body: { customerEmail: "test@example.com" }
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "Unauthorized" });
});

test("send-test-purchase-email accepts authenticated POST request", async () => {
  const sessionData = await createAdminSession(
    { email: "admin@edureach.network", name: "EduReach Admin" },
    { allowLocal: true }
  );

  const req = {
    method: "POST",
    headers: {
      cookie: `${ADMIN_COOKIE_NAME}=${sessionData.token}`
    },
    body: { customerEmail: "test@example.com" }
  };
  const res = createMockResponse();

  // Without RESEND_API_KEY set, it should reach the 500 error step for missing RESEND_API_KEY
  // instead of 401 Unauthorized.
  await handler(req, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: "Missing RESEND_API_KEY in Vercel environment variables" });
});
