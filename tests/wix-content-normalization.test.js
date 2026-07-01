import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCmsItem } from "../src/lib/wixContent.js";

test("keeps explicit article slugs for backward compatibility", () => {
  const item = normalizeCmsItem("articles", {
    data: {
      title: "Inclusive Classroom Support",
      slug: "custom-inclusive-classroom-support"
    }
  });

  assert.equal(item.slug, "custom-inclusive-classroom-support");
  assert.equal(item.detailUrl, "/resources/articles/custom-inclusive-classroom-support");
});

test("generates article slugs from titles when slug is missing", () => {
  const item = normalizeCmsItem("articles", {
    data: {
      title: "Inclusive Education: A Teacher's Guide!"
    }
  });

  assert.equal(item.slug, "inclusive-education-a-teacher-s-guide");
  assert.equal(item.detailUrl, "/resources/articles/inclusive-education-a-teacher-s-guide");
});

test("normalizes special-character article titles consistently", () => {
  const first = normalizeCmsItem("articles", {
    data: {
      title: "Learner Support & Care!"
    }
  });
  const duplicate = normalizeCmsItem("articles", {
    data: {
      title: "Learner Support Care"
    }
  });

  assert.equal(first.slug, "learner-support-care");
  assert.equal(duplicate.slug, "learner-support-care");
});

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

test("cleans entity-encoded HTML descriptions", () => {
  const item = normalizeCmsItem("ebooks", {
    data: {
      title: "Encoded HTML Ebook",
      description: '&lt;p class="font_8"&gt;Entity&nbsp;encoded guide.&lt;/p&gt;',
      isFree: true,
      price: 0
    }
  });

  assert.equal(item.excerpt, "Entity encoded guide.");
  assert.equal(item.excerpt.includes("<"), false);
  assert.deepEqual(item.contentBlocks, [
    { type: "paragraph", text: "Entity encoded guide." }
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
