(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const form = byId("book-form");
  const notice = byId("notice");
  const saveButton = byId("save-button");
  const connectionPill = byId("connection-pill");
  const publishedLibrary = byId("published-library");
  const draftLibrary = byId("draft-library");
  const libraryStatus = byId("books-status");
  let csrf = "";
  let connected = false;
  let coverObjectUrl = "";

  const escapeText = (value) => String(value == null ? "" : value);
  const rand = (value) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(value) || 0);
  const validWixUrl = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && (url.hostname === "static.wixstatic.com" || url.hostname.endsWith(".wixstatic.com"));
    } catch { return false; }
  };

  function notify(message, success = false) {
    notice.hidden = !message;
    notice.className = success ? "success" : "";
    notice.textContent = message || "";
    if (message) notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function json(url, options = {}) {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "The request could not be completed.");
    return result;
  }

  async function adminPost(payload) {
    return json("/api/admin-books", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-edureach-csrf": csrf },
      body: JSON.stringify(payload)
    });
  }

  function readBook() {
    return {
      title: byId("title").value.trim(),
      author: byId("author").value.trim(),
      description: byId("description").value.trim(),
      category: byId("category").value,
      price: Number(byId("price").value || 0),
      featured: byId("featured").checked,
      coverImage: byId("coverImage").value.trim(),
      pdfFile: byId("pdfFile").value.trim()
    };
  }

  function updatePreview() {
    const book = readBook();
    byId("preview-title").textContent = book.title || "Your book title appears here";
    byId("preview-author").textContent = "By " + (book.author || "your author");
    byId("preview-description").textContent = book.description || "Write a description to see the book as your readers will.";
    byId("preview-category").textContent = book.category || "Inclusive education";
    byId("preview-price").textContent = book.price > 0 ? rand(book.price) : "Free";
    const url = coverObjectUrl || (validWixUrl(book.coverImage) ? book.coverImage : "");
    byId("preview-cover").hidden = !url;
    byId("no-cover").hidden = Boolean(url);
    if (url) byId("preview-cover").src = url;
    else byId("preview-cover").removeAttribute("src");
  }

  function make(tag, cls, value) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value !== undefined) el.textContent = escapeText(value);
    return el;
  }

  function renderBookCard(book, draft) {
    const card = make("article", "library-item");
    const url = draft ? book.coverImage : book.image?.url;
    const cover = validWixUrl(url) ? make("img", "small-cover") : make("div", "small-cover small-placeholder", "ER");
    if (cover.tagName === "IMG") {
      cover.src = url;
      cover.alt = "";
      cover.loading = "lazy";
    }
    card.append(cover);

    const content = make("div", "library-item-content");
    content.append(make("h3", "", book.title || "Untitled ebook"));
    content.append(make("p", "", book.author ? "By " + book.author : book.excerpt || "EduReach ebook"));
    const badges = make("div", "tag-row");
    badges.append(make("span", "tag" + (draft ? " draft" : ""), draft ? "Draft" : "Published"));
    badges.append(make("span", "tag", Number(book.price || 0) > 0 ? rand(book.price) : "Free"));
    content.append(badges);
    content.append(make("small", "", book.category || "Inclusive education"));

    if (draft) {
      const button = make("button", "small-action", "Publish free book");
      button.type = "button";
      button.disabled = !book.id || Number(book.price || 0) > 0 || !book.pdfFile;
      if (button.disabled) {
        button.textContent = Number(book.price || 0) > 0 ? "Paid delivery needs setup" : "Add PDF before publishing";
        button.title = "Only complete free-book drafts can be published in this first release.";
      } else {
        button.addEventListener("click", () => publishDraft(book, button));
      }
      content.append(button);
    } else if (book.detailUrl) {
      const anchor = make("a", "small-action", "View on website ↗");
      anchor.href = book.detailUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener";
      content.append(anchor);
    }
    card.append(content);
    return card;
  }

  function renderLibrary(container, books, draft) {
    container.replaceChildren();
    for (const book of books) container.append(renderBookCard(book, draft));
  }

  async function refresh() {
    libraryStatus.textContent = "Loading your book library…";
    try {
      const results = await Promise.allSettled([
        json("/api/wix-content?type=ebooks&limit=100"),
        json("/api/admin-books")
      ]);

      const publicResult = results[0].status === "fulfilled" ? results[0].value : { items: [] };
      const adminResult = results[1].status === "fulfilled" ? results[1].value : { connected: false, drafts: [] };
      connected = Boolean(adminResult.connected);
      connectionPill.textContent = connected ? "Wix publishing connected" : "Wix setup needed";
      connectionPill.className = "status-pill " + (connected ? "connected" : "disconnected");

      const publicBooks = Array.isArray(publicResult.items) ? publicResult.items : [];
      const drafts = Array.isArray(adminResult.drafts) ? adminResult.drafts : [];
      renderLibrary(publishedLibrary, publicBooks, false);
      renderLibrary(draftLibrary, drafts, true);
      byId("published-count").textContent = publicBooks.length;
      byId("draft-count").textContent = connected ? drafts.length : "—";
      saveButton.disabled = !connected;
      libraryStatus.textContent = connected
        ? (drafts.length || publicBooks.length ? "Draft books first, published titles below." : "Your library is empty. Create the first book above.")
        : "The website can show existing published books, but this editor needs a Wix API key configured on Vercel.";
      if (adminResult.message) notify(adminResult.message);
      if (results[0].status === "rejected") {
        notify("The published catalogue could not be loaded. You can still prepare a new draft.");
      }
    } catch {
      notify("Could not refresh books. Please try again.");
      libraryStatus.textContent = "Book library unavailable.";
    }
  }

  async function publishDraft(book, button) {
    if (!window.confirm("Publish \"" + book.title + "\" on EduReach? This makes the free book public.")) return;
    button.disabled = true;
    button.textContent = "Publishing…";
    try {
      const response = await adminPost({ action: "publishDraft", id: book.id, confirm: "PUBLISH" });
      notify(response.message || "Published.", true);
      await refresh();
    } catch (error) {
      notify(error.message);
      button.disabled = false;
      button.textContent = "Publish free book";
    }
  }

  async function upload(file, kind) {
    if (!file) return;
    const target = byId(kind === "cover" ? "coverImage" : "pdfFile");
    const paid = Number(byId("price").value || 0) > 0;
    if (file.size > 10 * 1024 * 1024) { notify("Choose a file smaller than 10 MB."); return; }
    if (kind === "pdf" && paid) { notify("Paid PDFs need private delivery configured first. You can save the book details as a draft."); return; }

    const original = target.placeholder;
    target.placeholder = "Uploading " + file.name + "…";
    target.disabled = true;

    try {
      const data = await adminPost({
        action: "uploadUrl", kind, filename: file.name, mimeType: file.type,
        size: file.size, paid
      });
      const url = new URL(data.uploadUrl);
      url.searchParams.set("filename", file.name);
      const uploadResponse = await fetch(url.toString(), {
        method: "PUT", headers: { "Content-Type": file.type }, body: file
      });
      if (!uploadResponse.ok) throw new Error("Wix upload failed. Retry or upload in the Wix Media Manager.");
      const uploadData = await uploadResponse.json();
      const asset = uploadData.file?.url || uploadData.file?.media?.document?.url || uploadData.file?.media?.image?.image?.url || "";
      if (!validWixUrl(asset)) throw new Error("The Wix upload did not return a public file URL. Copy the media link from Wix instead.");
      target.value = asset;
      if (kind === "cover") {
        if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl);
        coverObjectUrl = URL.createObjectURL(file);
      }
      updatePreview();
      notify(file.name + " uploaded. Review the book and save the draft.", true);
    } catch (error) { notify(error.message || "Upload failed."); }
    finally {
      target.placeholder = original;
      target.disabled = false;
    }
  }

  form.addEventListener("input", updatePreview);
  byId("cover-file").addEventListener("change", (event) => upload(event.target.files?.[0], "cover"));
  byId("pdf-file").addEventListener("change", (event) => upload(event.target.files?.[0], "pdf"));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!connected) { notify("Wix publishing is not connected. Ask the site owner to finish the secure setup in Vercel."); return; }
    saveButton.disabled = true;
    saveButton.textContent = "Saving…";
    try {
      const response = await adminPost({ action: "createDraft", book: readBook() });
      notify(response.message || "Saved as a draft.", true);
      form.reset();
      byId("price").value = "0";
      if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl);
      coverObjectUrl = "";
      byId("cover-file").value = "";
      byId("pdf-file").value = "";
      updatePreview();
      await refresh();
    } catch (error) { notify(error.message || "Could not save the draft."); }
    finally { saveButton.disabled = !connected; saveButton.textContent = "Save as draft →"; }
  });

  byId("refresh").addEventListener("click", refresh);

  byId("signout").addEventListener("click", async () => {
    try {
      await json("/api/admin/logout", { method: "POST", headers: { "x-edureach-csrf": csrf } });
    } catch {}
    window.location.assign("/admin");
  });

  async function initialise() {
    try {
      const result = await json("/api/admin/session");
      if (!result.authenticated || !result.session?.csrfToken) throw new Error("Session expired.");
      csrf = result.session.csrfToken;
      updatePreview();
      await refresh();
    } catch {
      window.location.replace("/admin");
    }
  }

  initialise();
  window.addEventListener("pagehide", () => {
    if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl);
  });
})();