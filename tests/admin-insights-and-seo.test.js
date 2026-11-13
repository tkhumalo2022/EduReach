import assert from "node:assert/strict";
import test from "node:test";
import handleInsightsApi, { ga4Configured, safeGa4Report } from "../src/lib/adminInsightsApi.js";
import { verifyAdminTotp } from "../src/lib/adminTotp.js";
import { contentStructuredData } from "../src/lib/seo.js";

function mockRes() {
  return {
    statusCode: 200, headers: {}, body: "",
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value = "") { this.body = String(value); }
  };
}

test("private insights API rejects requests without a session cookie", async () => {
  const res = mockRes();
  await handleInsightsApi({ method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(JSON.parse(res.body).ok, false);
  assert.match(res.headers["cache-control"], /private/);
});

test("insights API refuses methods other than GET", async () => {
  const res = mockRes();
  await handleInsightsApi({ method: "POST", headers: {} }, res);
  assert.equal(res.statusCode, 405);
});

test("GA4 reporting stays disabled without valid read-only service account setup", () => {
  assert.equal(ga4Configured({}), false);
  assert.equal(ga4Configured({ EDUREACH_GA4_PROPERTY_ID: "G-ABC123", EDUREACH_GA4_CLIENT_EMAIL: "svc@test.iam.gserviceaccount.com", EDUREACH_GA4_PRIVATE_KEY: "BEGIN PRIVATE KEY" }), false);
  assert.equal(ga4Configured({ EDUREACH_GA4_PROPERTY_ID: "123456789", EDUREACH_GA4_CLIENT_EMAIL: "svc@test.iam.gserviceaccount.com", EDUREACH_GA4_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----" }), true);
});

test("insights report shows real aggregate metrics and hides internal pages", () => {
  const summary = { rows: [{ metricValues: [{ value: "23" }, { value: "35" }, { value: "64" }, { value: "19" }] }] };
  const pages = { rows: [
    { dimensionValues: [{ value: "/resources/ebooks" }], metricValues: [{ value: "50" }] },
    { dimensionValues: [{ value: "/admin" }], metricValues: [{ value: "8" }] },
    { dimensionValues: [{ value: "//evil.example/" }], metricValues: [{ value: "2" }] }
  ] };
  const events = { rows: [
    { dimensionValues: [{ value: "add_to_cart" }], metricValues: [{ value: "7" }] },
    { dimensionValues: [{ value: "page_view" }], metricValues: [{ value: "60" }] },
    { dimensionValues: [{ value: "generate_lead" }], metricValues: [{ value: "3" }] }
  ] };
  const report = safeGa4Report(summary, pages, events);
  assert.deepEqual([report.visitors, report.sessions, report.pageViews, report.engagedSessions, report.interactions], [23, 35, 64, 19, 10]);
  assert.deepEqual(report.pages, [{ path: "/resources/ebooks", views: 50 }]);
  assert.equal(report.events.length, 2);
  assert.equal(report.dateLabel.includes("28 days"), true);
});

test("RFC 6238 authenticator codes work with a valid 30-second window", () => {
  const seed = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(verifyAdminTotp("287082", seed, 59000), true);
  assert.equal(verifyAdminTotp("287082", seed, 59_000 + 300_000), false);
  assert.equal(verifyAdminTotp("123456", seed, 59000), false);
  assert.equal(verifyAdminTotp("not-code", seed, 59000), false);
  assert.equal(verifyAdminTotp("123456", "invalid!", 59000), false);
});

test("published ebooks expose genuine Book schema and priced offer only when known", () => {
  const book = contentStructuredData({
    title: "Autism and the Challenges",
    description: "Practical inclusive education guidance.",
    detailUrl: "/ebooks/autism-and-the-challenges",
    image: { url: "https://static.wixstatic.com/media/book-cover.png" },
    accessType: "paid", price: 75
  }, "ebooks");
  assert.equal(book["@type"], "Book");
  assert.equal(book.name, "Autism and the Challenges");
  assert.equal(book.offers.priceCurrency, "ZAR");
  assert.equal(book.offers.price, 75);
  assert.equal(book.author, undefined);
  assert.equal(book.aggregateRating, undefined);
  assert.equal(book.isbn, undefined);
});
