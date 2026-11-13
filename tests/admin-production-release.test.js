import assert from 'node:assert/strict';
import test from 'node:test';
import handleInsightsApi, { ga4Configured } from '../src/lib/adminInsightsApi.js';

function response() { return { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(v = '') { this.body = String(v); } }; }

test('private insights denies anonymous requests', async () => { const res = response(); await handleInsightsApi({ method: 'GET', headers: {} }, res); assert.equal(res.statusCode, 401); assert.match(res.headers['cache-control'], /no-store/); });

test('insights disallows POST', async () => { const res = response(); await handleInsightsApi({ method: 'POST', headers: {} }, res); assert.equal(res.statusCode, 405); });

test('insights reporting stays off until read-only configuration is complete', () => { assert.equal(ga4Configured({}), false); });
