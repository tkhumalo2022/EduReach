import assert from "node:assert/strict";
import test from "node:test";

import { rateLimitIdentity } from "../src/lib/security.js";

test("Vercel trusted IP wins over spoofed forwarded-for and changing user-agent", () => {
  const previous = process.env.VERCEL;
  process.env.VERCEL = "1";
  try {
    const first = rateLimitIdentity({
      headers: {
        "x-real-ip": "198.51.100.10",
        "x-forwarded-for": "203.0.113.12",
        "user-agent": "Browser One"
      }
    }, "admin-login", { failClosed: true });

    const second = rateLimitIdentity({
      headers: {
        "x-real-ip": "198.51.100.10",
        "x-forwarded-for": "203.0.113.99",
        "user-agent": "Browser Two"
      }
    }, "admin-login", { failClosed: true });

    const different = rateLimitIdentity({
      headers: { "x-real-ip": "198.51.100.11" }
    }, "admin-login", { failClosed: true });

    assert.equal(first, second);
    assert.notEqual(first, different);
  } finally {
    if (previous === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
  }
});

test("non-Vercel runtime ignores spoofable proxy headers and uses socket peer", () => {
  const previous = process.env.VERCEL;
  delete process.env.VERCEL;
  try {
    const first = rateLimitIdentity({
      headers: { "x-real-ip": "203.0.113.1", "x-forwarded-for": "203.0.113.2" },
      socket: { remoteAddress: "127.0.0.1" }
    }, "contact");

    const second = rateLimitIdentity({
      headers: { "x-real-ip": "203.0.113.3", "x-forwarded-for": "203.0.113.4" },
      socket: { remoteAddress: "127.0.0.1" }
    }, "contact");

    assert.equal(first, second);
  } finally {
    if (previous === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
  }
});
