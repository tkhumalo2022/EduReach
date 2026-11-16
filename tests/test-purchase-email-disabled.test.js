import assert from "node:assert/strict";
import test from "node:test";

import sendTestPurchaseEmail from "../api/send-test-purchase-email.js";

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    end(payload) { this.body = JSON.parse(payload); return this; }
  };
}

test("public test email POST stays disabled and never contacts Resend", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls++; throw new Error("Network must not be called"); };
  try {
    const response = createResponse();
    await sendTestPurchaseEmail({ method: "POST", body: { customerEmail: "test@example.com" } }, response);
    assert.equal(response.statusCode, 410);
    assert.equal(response.body.ok, false);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public test email route rejects non-POST methods", async () => {
  const response = createResponse();
  await sendTestPurchaseEmail({ method: "GET" }, response);
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.allow, "POST");
});
