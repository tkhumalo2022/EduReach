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
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = JSON.stringify(payload);
      return this;
    },
    end(value = "") {
      this.body = String(value);
    }
  };
}

test("send-test-purchase-email rejects unauthenticated requests with 401", async () => {
  const request = {
    method: "POST",
    headers: {},
    body: { customerEmail: "user@example.com" }
  };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 401);
  const data = JSON.parse(response.body);
  assert.equal(data.error, "Unauthorized: Admin authentication required");
});

test("send-test-purchase-email rejects non-POST requests with 405", async () => {
  const request = {
    method: "GET",
    headers: {}
  };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers["allow"], "POST");
});
