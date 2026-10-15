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

test("send-test-purchase-email rejects non-POST requests", async () => {
  const request = { method: "GET", headers: {} };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers["allow"], "POST");
});

test("send-test-purchase-email rejects unauthenticated requests", async () => {
  const request = { method: "POST", headers: {} };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 401);
  assert.deepEqual(JSON.parse(response.body), {
    ok: false,
    message: "Admin authentication required."
  });
});
