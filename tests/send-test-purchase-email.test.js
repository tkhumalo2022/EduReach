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

test("send-test-purchase-email rejects non-POST methods with 405", async () => {
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
    body: JSON.stringify({ customerEmail: "user@example.com" })
  };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 401);
  const data = JSON.parse(response.body);
  assert.equal(data.ok, false);
  assert.equal(data.message, "Authentication required.");
});

test("send-test-purchase-email rejects requests with missing or invalid CSRF header", async () => {
  const created = await createAdminSession(
    { email: "admin@edureach.network", name: "Admin" },
    {
      allowLocal: true,
      config: {
        email: "admin@edureach.network",
        sessionHours: 1
      }
    }
  );

  process.env.EDUREACH_RATE_LIMIT_DISABLED = "1";

  const request = {
    method: "POST",
    headers: {
      cookie: `${ADMIN_COOKIE_NAME}=${created.token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ customerEmail: "user@example.com" })
  };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 403);
  const data = JSON.parse(response.body);
  assert.equal(data.ok, false);
});

test("send-test-purchase-email rejects invalid customer email when authenticated", async () => {
  const created = await createAdminSession(
    { email: "admin@edureach.network", name: "Admin" },
    {
      allowLocal: true,
      config: {
        email: "admin@edureach.network",
        sessionHours: 1
      }
    }
  );

  process.env.RESEND_API_KEY = "re_test_key";
  process.env.EDUREACH_RATE_LIMIT_DISABLED = "1";

  const request = {
    method: "POST",
    headers: {
      cookie: `${ADMIN_COOKIE_NAME}=${created.token}`,
      "x-edureach-csrf": created.csrfToken,
      "content-type": "application/json"
    },
    body: JSON.stringify({ customerEmail: "not-an-email" })
  };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 400);
  const data = JSON.parse(response.body);
  assert.equal(data.ok, false);
  assert.equal(data.message, "Valid customerEmail is required.");
});
