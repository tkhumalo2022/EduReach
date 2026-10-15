import assert from "node:assert/strict";
import test from "node:test";
import handler from "../api/send-test-purchase-email.js";

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

test("send-test-purchase-email rejects unauthenticated requests", async () => {
  const req = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { customerEmail: "user@example.com" }
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(JSON.parse(res.body), {
    ok: false,
    message: "Unauthorized request."
  });
});

test("send-test-purchase-email rejects invalid email formats for authorized callers", async () => {
  process.env.EDUREACH_BACKEND_SECRET = "test-secret";
  process.env.RESEND_API_KEY = "test-resend-key";
  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-edureach-backend-secret": "test-secret"
    },
    body: { customerEmail: "invalid-email" }
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(JSON.parse(res.body), {
    ok: false,
    message: "A valid customer email address is required."
  });
});
