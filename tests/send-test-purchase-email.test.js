import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/send-test-purchase-email.js";
import { ADMIN_COOKIE_NAME, createAdminSession } from "../src/lib/adminAuth.js";

function createMockResponse() {
  const res = {
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
    end(data) {
      if (data) this.body = String(data);
      return this;
    }
  };
  return res;
}

test("send-test-purchase-email rejects unauthenticated requests", async () => {
  const req = {
    method: "POST",
    headers: {}
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, false);
  assert.equal(body.error, "Unauthorized. Admin authentication required.");
});

test("send-test-purchase-email rejects non-POST requests", async () => {
  const req = {
    method: "GET",
    headers: {}
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, false);
});

test("send-test-purchase-email allows admin authenticated requests", async () => {
  const sessionData = await createAdminSession({ email: "edureach70@gmail.com" }, { allowLocal: true });
  const req = {
    method: "POST",
    headers: {
      cookie: `${ADMIN_COOKIE_NAME}=${sessionData.token}`
    },
    body: {}
  };
  const res = createMockResponse();

  // Without RESEND_API_KEY, authenticated request will fail with 500 missing key, confirming auth passed.
  await handler(req, res);

  assert.equal(res.statusCode, 500);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, false);
  assert.match(body.error, /Missing RESEND_API_KEY/);
});
