import assert from "node:assert/strict";
import test from "node:test";
import handlePublishing, {
  validateEntry, validUploadRequest, safeDraft, draftFieldModifications,
  trustedPublicFileUrl, trustedUploadDestination, exactSameOrigin
} from "../src/lib/adminPublishingApi.js";

const base = {
  type: "ebooks",
  title: "Understanding Inclusive Classrooms",
  description: "Practical advice and classroom activities for teachers and families.",
  author: "EduReach Editorial",
  topic: "Inclusive education",
  price: 75,
  coverImage: ""
};
function res() {
  return { statusCode: 200, headers: {}, body: "",
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(v = "") { this.body = String(v); } };
}

test("allows paid ebook metadata without public PDF attachments", () => {
  const entry = validateEntry(base);
  assert.equal(entry.type, "ebooks");
  assert.equal(entry.data.price, 75);
  assert.equal(entry.data.isFree, false);
  assert.equal(entry.data.pdfFile, "");
});

test("rejects direct public PDF links for paid books", () => {
  assert.throws(() => validateEntry({
    ...base, pdfFile: "https://static.wixstatic.com/ugd/some-paid-file.pdf"
  }), /Paid PDFs cannot use public upload links/);
});

test("free Wix-hosted resources can attach public PDF", () => {
  const entry = validateEntry({
    ...base, type: "downloads", price: 0,
    pdfFile: "https://static.wixstatic.com/ugd/teacher-resource.pdf"
  });
  assert.equal(entry.data.isFree, true);
  assert.equal(entry.data.file, entry.data.pdfFile);
});

test("articles have required body and no paid file references", () => {
  const article = validateEntry({
    type: "articles", title: "Helping learners access reading",
    description: base.description, topic: "Teaching strategies",
    body: "Inclusive classrooms work best when teaching supports different learning needs. " +
      "Start by breaking information into short steps and regularly checking learner understanding."
  });
  assert.equal(article.type, "articles");
  assert.equal(article.data.title, "Helping learners access reading");
  assert.equal(article.data.pdfFile, undefined);
});

test("rejects untrusted cover and free-file URLs", () => {
  assert.equal(trustedPublicFileUrl("https://static.wixstatic.com/media/cover.jpg"), true);
  assert.equal(trustedPublicFileUrl("https://static.wixstatic.com.evil.example/media/cover.jpg"), false);
  assert.equal(trustedPublicFileUrl("http://static.wixstatic.com/media/cover.jpg"), false);
  assert.equal(trustedPublicFileUrl("https://user:pass@static.wixstatic.com/file.jpg"), false);
  assert.throws(() => validateEntry({ ...base, coverImage: "https://evil.example/cover.jpg" }));
});

test("upload policy enforces size, extension, mime and free-only PDF intent", () => {
  assert.equal(validUploadRequest({ kind: "cover", mimeType: "image/png", filename: "cover.png", size: 12000 }).kind, "cover");
  assert.equal(validUploadRequest({ kind: "freePdf", mimeType: "application/pdf", filename: "guide.pdf", size: 20000 }).kind, "freePdf");
  assert.throws(() => validUploadRequest({ kind: "freePdf", mimeType: "application/pdf", filename: "guide.exe", size: 1000 }));
  assert.throws(() => validUploadRequest({ kind: "cover", mimeType: "image/png", filename: "cover.png", size: 6 * 1024 * 1024 }));
  assert.throws(() => validUploadRequest({ kind: "paidPdf", mimeType: "application/pdf", filename: "paid.pdf", size: 1000 }));
  assert.equal(trustedUploadDestination("https://upload.wixmp.com/upload/signed"), true);
  assert.equal(trustedUploadDestination("https://upload.wixmp.com.evil.example/upload/signed"), false);
});

test("draft responses hide paid PDF file references", () => {
  const draft = safeDraft({ id: "draft-001", data: {
    title: base.title, description: base.description,
    price: 75, isFree: false, pdfFile: "https://static.wixstatic.com/ugd/paid.pdf"
  } }, "ebooks");
  assert.equal(draft.hasPdf, true);
  assert.equal(draft.pdfFile, "");
  assert.equal(draft.coverImage, "");
});

test("publishing changes require exact same-origin browser requests", () => {
  assert.equal(exactSameOrigin({ headers: { host: "edureach.network", origin: "https://edureach.network" } }), true);
  assert.equal(exactSameOrigin({ headers: { host: "edureach.network", origin: "https://evil.example" } }), false);
  assert.equal(exactSameOrigin({ headers: { host: "edureach.network", origin: "https://edureach.network.evil.example" } }), false);
});

test("publishing API denies anonymous users before returning private drafts", async () => {
  const response = res();
  await handlePublishing({ method: "GET", headers: {}, url: "/api/admin/publishing?type=ebooks" }, response);
  assert.equal(response.statusCode, 401);
  assert.equal(JSON.parse(response.body).ok, false);
  assert.match(response.headers["cache-control"], /no-store/);
});

test("publishing API rejects unsupported methods", async () => {
  const response = res();
  await handlePublishing({ method: "DELETE", headers: {} }, response);
  assert.equal(response.statusCode, 405);
});

test("editing a saved draft preserves unrelated fields and existing file references", () => {
  const updates = draftFieldModifications({
    title: "Revised title",
    description: "Updated description",
    coverImage: "",
    pdfFile: "",
    price: 75
  }, {
    title: "Old title",
    slug: "existing-wix-slug",
    coverImage: "https://static.wixstatic.com/media/old-cover.jpg",
    pdfFile: "https://static.wixstatic.com/ugd/existing-attachment.pdf"
  });
  assert.equal(updates.some(x => x.fieldPath === "title"), true);
  assert.equal(updates.some(x => x.fieldPath === "slug"), false);
  assert.equal(updates.some(x => x.fieldPath === "coverImage"), false);
  assert.equal(updates.some(x => x.fieldPath === "pdfFile"), false);
  assert.equal(updates.find(x => x.fieldPath === "price").setFieldOptions.value, 75);
});

test("rand values with cents are accepted for ebook drafts", () => {
  assert.equal(validateEntry({ ...base, price: 19.99 }).data.price, 19.99);
  assert.throws(() => validateEntry({ ...base, price: 19.999 }));
});
