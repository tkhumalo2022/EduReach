import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/send-test-purchase-email.js";

function createMockResponse() {
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

test("send-test-purchase-email rejects non-POST requests", async () => {
  const req = { method: "GET", headers: {} };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "POST");
});

test("send-test-purchase-email rejects unauthenticated requests", async () => {
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
  assert.deepEqual(JSON.parse(res.body), {
    ok: false,
    message: "Unauthorized."
  });
});
