import assert from 'node:assert/strict';
import test from 'node:test';

import handler from '../api/send-test-purchase-email.js';

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
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
    end(value = '') {
      if (value) this.body = String(value);
      return this;
    }
  };
}

test('send-test-purchase-email rejects non-POST requests with 405', async () => {
  const req = { method: 'GET', headers: {} };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, 'POST');
});

test('send-test-purchase-email rejects unauthenticated requests with 401', async () => {
  const req = {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: { customerEmail: 'test@example.com' }
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 401);
  const data = JSON.parse(res.body);
  assert.equal(data.ok, false);
  assert.equal(data.message, 'Admin authentication is required.');
});
