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
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = JSON.stringify(data);
      return this;
    },
    end(value = "") {
      if (value) this.body = String(value);
    }
  };
}

test("send-test-purchase-email rejects unauthenticated requests", async () => {
  const request = { method: "POST", headers: {}, body: { customerEmail: "test@example.com" } };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 401);
  assert.deepEqual(JSON.parse(response.body), {
    ok: false,
    error: "Authentication required"
  });
});

test("send-test-purchase-email rejects requests without valid CSRF header", async () => {
  const created = await createAdminSession({ email: "admin@edureach.network" }, { allowLocal: true });
  const request = {
    method: "POST",
    headers: {
      cookie: `${ADMIN_COOKIE_NAME}=${created.token}`
    },
    body: { customerEmail: "test@example.com" }
  };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 403);
  assert.deepEqual(JSON.parse(response.body), {
    ok: false,
    error: "This admin request could not be verified."
  });
});
