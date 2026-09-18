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

test("send-test-purchase-email rejects non-POST requests with 405", async () => {
  const request = { method: "GET", headers: {} };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers["allow"], "POST");
  const data = JSON.parse(response.body);
  assert.equal(data.ok, false);
});

test("send-test-purchase-email rejects unauthenticated requests with 401", async () => {
  const request = { method: "POST", headers: {} };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 401);
  const data = JSON.parse(response.body);
  assert.equal(data.ok, false);
  assert.equal(data.message, "Admin authorization required.");
});

test("send-test-purchase-email rejects invalid customerEmail when authenticated", async () => {
  const sessionData = await createAdminSession(
    { email: "admin@edureach.network", name: "Admin" },
    {
      allowLocal: true,
      config: { email: "admin@edureach.network", passwordHash: "dummy", sessionHours: 1 }
    }
  );

  const request = {
    method: "POST",
    headers: {
      cookie: `${ADMIN_COOKIE_NAME}=${sessionData.token}`,
      "content-type": "application/json"
    },
    body: { customerEmail: "invalid-email" }
  };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 400);
  const data = JSON.parse(response.body);
  assert.equal(data.ok, false);
  assert.equal(data.message, "Valid customerEmail is required.");
});
