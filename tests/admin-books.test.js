import assert from "node:assert/strict";
import test from "node:test";
import bookAdminHandler, { isTrustedMediaUrl, validateBook } from "../api/admin-books.js";

const basic = {
  title: "Understanding Inclusive Learning",
  author: "EduReach Educator",
  description: "A practical learning guide for educators and families supporting children with diverse needs.",
  category: "Inclusive education",
  price: 0,
  featured: true,
  coverImage: "https://static.wixstatic.com/media/book-cover.jpg",
  pdfFile: "https://static.wixstatic.com/media/guide.pdf"
};

test("validates the essential details of a free ebook", () => {
  const result = validateBook(basic);
  assert.equal(result.title, basic.title);
  assert.equal(result.isFree, true);
  assert.equal(result.featured, true);
  assert.equal(result.pdfFile, basic.pdfFile);
});

test("supports paid ebook metadata as an unpublished draft", () => {
  const result = validateBook({ ...basic, price: 149.99 });
  assert.equal(result.isFree, false);
  assert.equal(result.price, 149.99);
});

test("rejects invalid names, descriptions and excessive prices", () => {
  assert.throws(() => validateBook({ ...basic, title: "A" }), /title/);
  assert.throws(() => validateBook({ ...basic, author: "" }), /author/);
  assert.throws(() => validateBook({ ...basic, description: "Short" }), /20 characters/);
  assert.throws(() => validateBook({ ...basic, price: -10 }), /price/);
  assert.throws(() => validateBook({ ...basic, price: 12.345 }), /price/);
});

test("accepts only HTTPS media links from Wix", () => {
  assert.equal(isTrustedMediaUrl("https://static.wixstatic.com/media/cover.png"), true);
  assert.equal(isTrustedMediaUrl("https://files.wixstatic.com/abc.pdf"), true);
  assert.equal(isTrustedMediaUrl("https://static.wixstatic.com.attacker.net/book.pdf"), false);
  assert.equal(isTrustedMediaUrl("http://static.wixstatic.com/book.pdf"), false);
  assert.equal(isTrustedMediaUrl("javascript:alert(1)"), false);
  assert.throws(() => validateBook({ ...basic, pdfFile: "https://evil.test/book.pdf" }), /Wix/);
});

test("requires a valid admin session before listing or changing books", async () => {
  for (const method of ["GET", "POST"]) {
    const response = {
      statusCode: 200,
      headers: {},
      setHeader(key, value) { this.headers[key] = value; },
      end(raw) { this.body = JSON.parse(String(raw)); }
    };
    await bookAdminHandler({ method, headers: {} }, response);
    assert.equal(response.statusCode, 401);
    assert.equal(response.body.ok, false);
    assert.doesNotMatch(JSON.stringify(response.body), /api.key|secret|password/i);
  }
});
