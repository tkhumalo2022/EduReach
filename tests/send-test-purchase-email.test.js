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

test("send-test-purchase-email rejects unsupported HTTP methods", async () => {
  const request = { method: "GET", headers: {} };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers["allow"], "POST");
});

test("send-test-purchase-email rejects unauthenticated requests with 401", async () => {
  const request = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customerEmail: "test@example.com" })
  };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 401);
  assert.deepEqual(JSON.parse(response.body), {
    ok: false,
    message: "Unauthorized test email request."
  });
});

test("send-test-purchase-email rejects invalid customer email for authenticated session", async () => {
  process.env.RESEND_API_KEY = "dummy_resend_key_for_test";
  process.env.EDUREACH_RATE_LIMIT_DISABLED = "1";

  const created = await createAdminSession({
    email: "admin@edureach.network",
    name: "Admin"
  });

  const request = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${ADMIN_COOKIE_NAME}=${created.token}`
    },
    body: JSON.stringify({ customerEmail: "invalid-email" })
  };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(JSON.parse(response.body), {
    ok: false,
    message: "Valid customerEmail is required."
  });
});
