import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCmsItem } from "../src/lib/wixContent.js";

test("cleans raw HTML descriptions for ebook cards and detail blocks", () => {
  const item = normalizeCmsItem("ebooks", {
    _id: "ebook-html",
    data: {
      title: "HTML Ebook",
      description: '<h2 class="font_7">Overview</h2><p class="font_8">Support&nbsp;<strong>guide</strong> for schools.</p><ul><li>First step</li><li>Second step</li></ul>',
      isFree: true,
      price: 0,
      publishedDate: "2026-07-01"
    }
  });

  assert.equal(item.excerpt.includes("<p"), false);
  assert.equal(item.excerpt.includes("font_8"), false);
  assert.equal(item.excerpt, "Overview Support guide for schools. First step Second step");
  assert.deepEqual(item.contentBlocks, [
    { type: "heading", text: "Overview" },
    { type: "paragraph", text: "Support guide for schools." },
    { type: "list", items: ["First step", "Second step"] }
  ]);
});

test("marks ebooks paid when isFree is false", () => {
  const item = normalizeCmsItem("ebooks", {
    data: {
      title: "Paid Ebook",
      isFree: false,
      price: 0
    }
  });

  assert.equal(item.accessType, "paid");
  assert.equal(item.isFree, false);
  assert.equal(item.ctaLabel, "Add to Cart");
});

test("marks ebooks paid when price is greater than zero even if isFree is true", () => {
  const item = normalizeCmsItem("ebooks", {
    data: {
      title: "Priced Ebook",
      isFree: true,
      price: 150
    }
  });

  assert.equal(item.accessType, "paid");
  assert.equal(item.isFree, false);
});

test("marks ebooks paid when price is a formatted currency string", () => {
  const item = normalizeCmsItem("ebooks", {
    data: {
      title: "Formatted Price Ebook",
      isFree: true,
      price: "R1,250.00"
    }
  });

  assert.equal(item.accessType, "paid");
  assert.equal(item.isFree, false);
});

test("marks ebooks free only when isFree is true and price is zero", () => {
  const item = normalizeCmsItem("ebooks", {
    data: {
      title: "Free Ebook",
      isFree: true,
      price: 0
    }
  });

  assert.equal(item.accessType, "free");
  assert.equal(item.isFree, true);
  assert.equal(item.ctaLabel, "Download");
});
