import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSitemapXml,
  canonicalUrl,
  contentStructuredData,
  itemSeo,
  organizationStructuredData,
  SITE_ORIGIN
} from "../src/lib/seo.js";

test("canonical URLs always use the EduReach production domain", () => {
  const oldVercelUrl = "https://edureach-website" + ".vercel.app/resources/articles/test-post?draft=1";

  assert.equal(canonicalUrl("/articles/test-post"), "https://edureach.network/articles/test-post");
  assert.equal(canonicalUrl(oldVercelUrl), "https://edureach.network/resources/articles/test-post");
});

test("sitemap XML escapes values and prevents duplicate URLs", () => {
  const xml = buildSitemapXml([
    { loc: "/articles/learner-support", lastmod: "2026-07-01T10:00:00.000Z" },
    { loc: "/articles/learner-support", lastmod: "2026-07-02T10:00:00.000Z" },
    { loc: "/blog/inclusion-&-care" }
  ]);

  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.equal((xml.match(/<loc>/g) || []).length, 2);
  assert.match(xml, /https:\/\/edureach\.network\/articles\/learner-support/);
  assert.match(xml, /https:\/\/edureach\.network\/blog\/inclusion-&amp;-care/);
  assert.match(xml, /<lastmod>2026-07-01T10:00:00.000Z<\/lastmod>/);
});

test("CMS item metadata uses item fields and production URLs", () => {
  const item = {
    type: "articles",
    title: "Inclusive classrooms",
    seoTitle: "Inclusive classroom support",
    seoDescription: "Practical inclusion guidance.",
    detailUrl: "/articles/inclusive-classrooms",
    image: { url: "/assets/images/hero-inclusive-classroom.png" },
    author: "EduReach Team",
    date: "2026-07-01T00:00:00.000Z",
    lastModified: "2026-07-02T00:00:00.000Z"
  };

  const seo = itemSeo(item, "articles");
  const structuredData = contentStructuredData(item, "articles");

  assert.equal(seo.canonical, `${SITE_ORIGIN}/articles/inclusive-classrooms`);
  assert.equal(seo.image, `${SITE_ORIGIN}/assets/images/hero-inclusive-classroom.png`);
  assert.equal(structuredData["@type"], "Article");
  assert.equal(structuredData.dateModified, "2026-07-02T00:00:00.000Z");
});

test("organization structured data uses verified EduReach contact details", () => {
  const structuredData = organizationStructuredData();

  assert.equal(structuredData.name, "EduReach Inclusive Education Consultancy");
  assert.equal(structuredData.url, "https://edureach.network");
  assert.equal(structuredData.email, "edureach70@gmail.com");
  assert.equal(structuredData.telephone, "+27812148384");
  assert.equal(structuredData.address.streetAddress, "12A Chat Crescent");
  assert.equal(structuredData.address.addressCountry, "South Africa");
});
