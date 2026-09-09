import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/send-test-purchase-email.js";

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    end(data) {
      if (data) this.body = data;
    }
  };
}

test("send-test-purchase-email endpoint rejects unauthenticated requests with 401", async () => {
  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: {
      customerEmail: "test@example.com",
      customerName: "Test User"
    }
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  const responseData = JSON.parse(res.body);
  assert.equal(responseData.error, "Unauthorized: Admin authentication required");
});
