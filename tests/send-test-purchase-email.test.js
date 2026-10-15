import assert from "node:assert/strict";
import test from "node:test";
import handler from "../api/send-test-purchase-email.js";
import { createAdminSession, ADMIN_COOKIE_NAME } from "../src/lib/adminAuth.js";

function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      res.headers[name] = value;
    },
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    }
  };
  return res;
}

test("send-test-purchase-email rejects unauthenticated requests with 401", async () => {
  const req = {
    method: "POST",
    headers: {},
    body: { customerEmail: "test@example.com" }
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body?.error, "Unauthorized: Admin session required");
});

test("send-test-purchase-email accepts requests with valid admin session", async () => {
  const created = await createAdminSession(
    { email: "admin@edureach.network", name: "Admin" },
    {
      allowLocal: true,
      config: {
        email: "admin@edureach.network",
        passwordHash: "dummy",
        sessionHours: 1
      }
    }
  );

  const req = {
    method: "POST",
    headers: {
      cookie: `${ADMIN_COOKIE_NAME}=${created.token}`
    },
    body: {}
  };
  const res = createMockResponse();

  await handler(req, res);

  // If authenticated, handler proceeds past auth check. If RESEND_API_KEY is missing in env, returns 500 or 400.
  // Importantly it should NOT return 401.
  assert.notEqual(res.statusCode, 401);
});
