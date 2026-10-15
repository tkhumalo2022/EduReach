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

test("send-test-purchase-email API rejects non-POST methods", async () => {
  const req = { method: "GET", headers: {} };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
});

test("send-test-purchase-email API rejects unauthenticated requests", async () => {
  const req = { method: "POST", headers: {} };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(JSON.parse(res.body), {
    ok: false,
    message: "Admin authentication required."
  });
});

test("send-test-purchase-email API rejects invalid CSRF token", async () => {
  const created = await createAdminSession(
    { email: "admin@edureach.network", name: "Admin" },
    { allowLocal: true }
  );

  const req = {
    method: "POST",
    headers: {
      cookie: `${ADMIN_COOKIE_NAME}=${created.token}`,
      "x-edureach-csrf": "invalid-csrf-token"
    }
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(JSON.parse(res.body), {
    ok: false,
    message: "This admin request could not be verified."
  });
});
