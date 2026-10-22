import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/send-test-purchase-email.js";

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(key, value) {
      this.headers[String(key).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end(data) {
      if (data) this.body = data;
    }
  };
}

test("send-test-purchase-email handler rejects non-POST requests with 405", async () => {
  const req = { method: "GET", headers: {} };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "POST");
  assert.deepEqual(res.body, { ok: false, message: "Method not allowed." });
});

test("send-test-purchase-email handler rejects unauthenticated requests with 401", async () => {
  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: { customerEmail: "test@example.com" }
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { ok: false, message: "Unauthorized admin access required." });
});
