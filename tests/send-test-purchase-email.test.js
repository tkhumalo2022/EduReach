import assert from 'node:assert/strict';
import test from 'node:test';

import handler from '../api/send-test-purchase-email.js';

function createMockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    end(value = '') {
      if (value) this.body = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test('send-test-purchase-email rejects GET requests with 405 Method Not Allowed', async () => {
  const req = { method: 'GET', headers: {} };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, 'POST');
  const payload = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
  assert.equal(payload.ok, false);
});

test('send-test-purchase-email rejects unauthenticated POST requests with 401 Unauthorized', async () => {
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ customerEmail: 'test@example.com' })
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  const payload = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'Unauthorized admin access required.');
});

test('send-test-purchase-email rejects invalid customerEmail when authorized via admin secret', async () => {
  process.env.EDUREACH_ADMIN_DEBUG_SECRET = 'test-debug-secret';
  const req = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-edureach-admin-secret': 'test-debug-secret'
    },
    body: JSON.stringify({ customerEmail: 'not-an-email' })
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  const payload = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'Valid customerEmail is required');
});
