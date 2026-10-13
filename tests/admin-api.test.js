import assert from "node:assert/strict";
import test from "node:test";

import { handleAdminApi } from "../src/lib/adminApi.js";
import { enforceRateLimit } from "../src/lib/security.js";

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

test("admin session action rejects unauthenticated requests", async () => {
  const request = { method: "GET", headers: {} };
  const response = createResponse();

  await handleAdminApi(request, response, "session");

  assert.equal(response.statusCode, 401);
  assert.deepEqual(JSON.parse(response.body), {
    ok: false,
    authenticated: false
  });
});

test("admin API rejects unknown actions", async () => {
  const request = { method: "GET", headers: {} };
  const response = createResponse();

  await handleAdminApi(request, response, "unknown");

  assert.equal(response.statusCode, 404);
});

test("rate limiting prioritizes x-real-ip over x-forwarded-for to prevent spoofing bypass", async () => {
  const previousDisabled = process.env.EDUREACH_RATE_LIMIT_DISABLED;
  delete process.env.EDUREACH_RATE_LIMIT_DISABLED;

  try {
    const res1 = createResponse();
    const req1 = {
      headers: {
        "x-real-ip": "198.51.100.10",
        "x-forwarded-for": "203.0.113.1"
      }
    };

    const allowed1 = await enforceRateLimit(req1, res1, { name: "test-spoof", limit: 1, windowSeconds: 60 });
    assert.equal(allowed1, true);

    const res2 = createResponse();
    const req2 = {
      headers: {
        "x-real-ip": "198.51.100.10",
        "x-forwarded-for": "203.0.113.99"
      }
    };

    const allowed2 = await enforceRateLimit(req2, res2, { name: "test-spoof", limit: 1, windowSeconds: 60 });
    assert.equal(allowed2, false);
    assert.equal(res2.statusCode, 429);
  } finally {
    if (previousDisabled == null) {
      delete process.env.EDUREACH_RATE_LIMIT_DISABLED;
    } else {
      process.env.EDUREACH_RATE_LIMIT_DISABLED = previousDisabled;
    }
  }
});
