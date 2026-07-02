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
  assert.equal(item.detailUrl, "/articles/custom-inclusive-classroom-support");
});

test("generates article slugs from titles when slug is missing", () => {
  const item = normalizeCmsItem("articles", {
    data: {
      title: "Inclusive Education: A Teacher's Guide!"
    }
  });

  assert.equal(item.slug, "inclusive-education-a-teacher-s-guide");
  assert.equal(item.detailUrl, "/articles/inclusive-education-a-teacher-s-guide");
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

test("uses canonical public detail routes for CMS item types", () => {
  assert.equal(
    normalizeCmsItem("downloads", { data: { title: "Learner Support Checklist", slug: "learner-support-checklist" } }).detailUrl,
    "/resources/learner-support-checklist"
  );
  assert.equal(
    normalizeCmsItem("ebooks", { data: { title: "Parent Support Guide", isFree: true, price: 0 } }).detailUrl,
    "/ebooks/parent-support-guide"
  );
  assert.equal(
    normalizeCmsItem("gallery", { data: { title: "Community Gallery", consentConfirmed: true } }).detailUrl,
    "/gallery/community-gallery"
  );
  assert.equal(
    normalizeCmsItem("workshops", { data: { title: "Teacher Workshop", consentConfirmed: true } }).detailUrl,
    "/workshops/teacher-workshop"
  );
  assert.equal(
    normalizeCmsItem("blogs", { data: { title: "Inclusive Classroom Note" } }).detailUrl,
    "/blog/inclusive-classroom-note"
  );
});

test("preserves Wix update timestamps for sitemap lastmod values", () => {
  const item = normalizeCmsItem("articles", {
    _updatedDate: "2026-07-02T10:30:00.000Z",
    data: {
      title: "Updated Article"
    }
  });

  assert.equal(item.lastModified, "2026-07-02T10:30:00.000Z");
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

test("normalizes team member fields into profile routes", () => {
  const item = normalizeCmsItem("team", {
    data: {
      name: "Hlakaniphani Buthelezi",
      role: "Managing Director",
      shortBio: "Inclusive education specialist.",
      specialties: ["Autism", "Learner support"],
      published: true
    }
  });

  assert.equal(item.title, "Hlakaniphani Buthelezi");
  assert.equal(item.role, "Managing Director");
  assert.deepEqual(item.specialties, ["Autism", "Learner support"]);
  assert.equal(item.detailUrl, "/team/hlakaniphani-buthelezi");
  assert.equal(item.ctaLabel, "View Profile");
});

test("normalizes partner sponsor fields into partner routes", () => {
  const item = normalizeCmsItem("partners", {
    data: {
      partnerName: "Community Inclusion Partner",
      sponsorTier: "Gold",
      websiteUrl: "https://example.org",
      contribution: "Supports school workshops.",
      visible: true
    }
  });

  assert.equal(item.title, "Community Inclusion Partner");
  assert.equal(item.sponsorTier, "Gold");
  assert.equal(item.websiteUrl, "https://example.org");
  assert.equal(item.contribution, "Supports school workshops.");
  assert.equal(item.detailUrl, "/partners/community-inclusion-partner");
});

test("normalizes testimonial fields and hides explicitly unpublished items", () => {
  const item = normalizeCmsItem("testimonials", {
    data: {
      clientName: "Parent Community",
      quote: "EduReach helped us understand practical learner support.",
      organization: "Richards Bay School",
      status: "published"
    }
  });
  const hidden = normalizeCmsItem("testimonials", {
    data: {
      clientName: "Draft Testimonial",
      quote: "Hidden draft.",
      status: "draft"
    }
  });

  assert.equal(item.title, "Parent Community testimonial");
  assert.equal(item.quote, "EduReach helped us understand practical learner support.");
  assert.equal(item.organization, "Richards Bay School");
  assert.equal(item.detailUrl, "/testimonials/parent-community-testimonial");
  assert.equal(hidden, null);
});
