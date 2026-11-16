(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const pane = $("publisher");
  if (!pane) return;
  const form = $("publisher-form");
  const controls = ["publisher-save", "publisher-cover-upload", "publisher-pdf-upload"];
  const validPublicUrl = value => {
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password &&
        (u.hostname === "static.wixstatic.com" || u.hostname.endsWith(".wixstatic.com"));
    } catch { return false; }
  };
  const validUploadUrl = value => {
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password && !u.port &&
        (u.hostname === "upload.wixmp.com" || u.hostname.endsWith(".wixmp.com"));
    } catch { return false; }
  };
  const money = n => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(n) || 0);
  let csrf = "";
  let type = "ebooks";
  let connected = false;
  let busy = false;
  let draftId = "";
  let coverImage = "";
  let pdfFile = "";
  let localCover = "";
  let currentDrafts = [];

  function message(value, style = "") {
    $("publisher-message").textContent = value;
    $("publisher-message").className = "publisher-message " + style;
  }
  function updateEnabled() {
    const paidBook = type === "ebooks" && Number($("publisher-price").value) > 0;
    $("publisher-article-body").hidden = type !== "articles";
    $("publisher-body").required = type === "articles";
    $("publisher-price-field").hidden = type !== "ebooks";
    $("publisher-pdf-wrap").hidden = type === "articles" || paidBook;
    $("publisher-file-warning").hidden = type === "articles";
    $("publisher-pdf").disabled = !connected || busy || paidBook || type === "articles";
    $("publisher-save").disabled = !connected || busy;
    $("publisher-cover-upload").disabled = !connected || busy;
    $("publisher-pdf-upload").disabled = !connected || busy || paidBook || type === "articles";
    $("publisher-refresh").disabled = busy;
    $("publisher-author").required = type !== "articles";
    pane.querySelector("[data-publisher-author]").hidden = type === "articles";
    if (paidBook && pdfFile) {
      pdfFile = "";
      $("publisher-pdf-status").textContent = "Paid PDFs are not allowed in public media storage.";
    }
  }
  function preview() {
    $("publisher-preview-title").textContent = $("publisher-title-input").value.trim() || "Your new resource";
    $("publisher-preview-topic").textContent = $("publisher-topic").value;
    $("publisher-preview-copy").textContent = $("publisher-description").value.trim() || "Add a title and description to see how your content will read.";
    $("publisher-preview-price").textContent = type === "articles" ? "Article" : type === "downloads" ? "Free resource" : Number($("publisher-price").value) > 0 ? money($("publisher-price").value) : "Free book";
    const wrap = $("publisher-preview-cover");
    wrap.replaceChildren();
    const imgUrl = localCover || (validPublicUrl(coverImage) ? coverImage : "");
    if (imgUrl) {
      const img = document.createElement("img");
      img.src = imgUrl;
      img.alt = "Selected book or resource cover";
      wrap.append(img);
    } else {
      const label = document.createElement("span");
      label.textContent = "ER";
      wrap.append(label);
    }
    updateEnabled();
  }
  function changeType(next) {
    if (!["ebooks", "downloads", "articles"].includes(next)) return;
    if (next !== type) reset(true);
    type = next;
    pane.querySelectorAll("[data-publisher-type]").forEach(button => {
      const active = button.dataset.publisherType === type;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    preview();
    if (csrf) refresh();
  }
  function reset(preserveType = false) {
    if (localCover) URL.revokeObjectURL(localCover);
    localCover = "";
    coverImage = "";
    pdfFile = "";
    draftId = "";
    form.reset();
    $("publisher-pdf-status").textContent = "No PDF uploaded yet.";
    $("publisher-cover-status").textContent = "No cover uploaded yet.";
    $("publisher-save").textContent = "Save to Wix drafts";
    if (!preserveType) type = "ebooks";
    message("New draft ready. Nothing will be published automatically.");
    preview();
  }
  async function request(url, options = {}) {
    const res = await fetch(url, { cache: "no-store", credentials: "same-origin", ...options });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error("Your admin session has expired. Sign in again.");
    if (!res.ok) throw new Error(data.message || "The action could not be completed.");
    return data;
  }
  async function post(body) {
    return request("/api/admin/publishing", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-edureach-csrf": csrf },
      body: JSON.stringify(body)
    });
  }
  async function refresh() {
    if (!csrf) return;
    const list = $("publisher-draft-list");
    list.replaceChildren();
    const loading = document.createElement("p");
    loading.textContent = "Checking saved drafts in Wix…";
    list.append(loading);
    try {
      const data = await request("/api/admin/publishing?type=" + encodeURIComponent(type));
      connected = Boolean(data.connected);
      const status = $("publisher-connection");
      status.textContent = connected ? "Wix drafts connected" : "Wix connection needed";
      status.className = "publisher-connection " + (connected ? "connected" : "disconnected");
      $("publisher-setup").hidden = connected;
      currentDrafts = Array.isArray(data.drafts) ? data.drafts : [];
      list.replaceChildren();
      if (!currentDrafts.length) {
        const empty = document.createElement("p");
        empty.textContent = connected ? "No saved drafts for this category yet." : "Drafts and uploads will be available after Wix publishing is connected.";
        list.append(empty);
      }
      for (const draft of currentDrafts) {
        const card = document.createElement("article");
        card.className = "publisher-draft";
        const title = document.createElement("h4");
        title.textContent = draft.title || "Untitled draft";
        const details = document.createElement("p");
        details.textContent = draft.topic + (draft.type === "ebooks" ? " · " + money(draft.price) : " · " + (draft.type === "articles" ? "Article" : "Free PDF"));
        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Edit this draft";
        edit.addEventListener("click", () => editDraft(draft));
        card.append(title, details, edit);
        list.append(card);
      }
      if (!connected) message(data.message || "Wix publishing needs a one-time connection. Your live website is unchanged.");
    } catch (err) {
      connected = false;
      $("publisher-connection").textContent = "Connection unavailable";
      $("publisher-connection").className = "publisher-connection disconnected";
      $("publisher-setup").hidden = false;
      list.textContent = err.message;
      message(err.message, "error");
    } finally { updateEnabled(); }
  }
  function editDraft(draft) {
    if (draft.type !== type) changeType(draft.type);
    draftId = draft.id;
    $("publisher-id").value = draft.id;
    $("publisher-title-input").value = draft.title || "";
    $("publisher-description").value = draft.description || "";
    $("publisher-author").value = draft.author || "";
    $("publisher-topic").value = [...$("publisher-topic").options].some(o => o.value === draft.topic) ? draft.topic : "Inclusive education";
    $("publisher-price").value = draft.price || 0;
    $("publisher-body").value = draft.body || "";
    coverImage = validPublicUrl(draft.coverImage) ? draft.coverImage : "";
    pdfFile = validPublicUrl(draft.pdfFile) ? draft.pdfFile : "";
    $("publisher-cover-status").textContent = coverImage ? "Existing cover attached." : "No cover uploaded.";
    $("publisher-pdf-status").textContent = draft.hasPdf && !pdfFile ? "Stored attachment cannot be displayed here." : pdfFile ? "Existing free PDF attached." : "No PDF uploaded.";
    $("publisher-save").textContent = "Update Wix draft";
    if (localCover) URL.revokeObjectURL(localCover);
    localCover = "";
    preview();
    pane.scrollIntoView({ behavior: "smooth", block: "start" });
    $("publisher-title-input").focus({ preventScroll: true });
    message("Editing saved draft: " + (draft.title || "Untitled") + ". Changes will stay unpublished.");
  }
  async function upload(kind) {
    if (!connected || busy || !csrf) return;
    const file = $(kind === "cover" ? "publisher-cover" : "publisher-pdf").files?.[0];
    if (!file) return message("Choose a " + (kind === "cover" ? "cover image" : "free PDF") + " first.", "error");
    if (kind === "freePdf" && (type === "articles" || type === "ebooks" && Number($("publisher-price").value) > 0)) return message("Paid books and articles cannot upload public PDFs.", "error");
    if (kind === "cover" && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return message("Choose a JPG, PNG or WEBP image.", "error");
    if (kind === "freePdf" && file.type !== "application/pdf") return message("Choose a PDF document.", "error");
    if (file.size > (kind === "cover" ? 5 : 10) * 1024 * 1024) return message("This file is too large.", "error");
    busy = true;
    updateEnabled();
    const el = $(kind === "cover" ? "publisher-cover-status" : "publisher-pdf-status");
    el.textContent = "Uploading securely to Wix…";
    message("Uploading " + file.name + "…");
    try {
      const signed = await post({ action: "uploadUrl", kind, mimeType: file.type, filename: file.name, size: file.size });
      if (!validUploadUrl(signed.uploadUrl)) throw new Error("Wix returned an untrusted upload address.");
      const put = await fetch(signed.uploadUrl, {
        method: "PUT", redirect: "error",
        headers: { "Content-Type": file.type },
        body: file
      });
      if (!put.ok) throw new Error("Wix declined the upload (" + put.status + ").");
      const result = await put.json().catch(() => ({}));
      const item = result.file || {};
      const url = item.url || item.media?.image?.image?.url || item.media?.document?.url || "";
      if (!validPublicUrl(url) || item.private === true) throw new Error("Wix did not return a valid public asset.");
      if (kind === "cover") {
        coverImage = url;
        if (localCover) URL.revokeObjectURL(localCover);
        localCover = "";
      } else { pdfFile = url; }
      el.textContent = "Uploaded: " + file.name;
      message("Upload complete. Select Save to Wix drafts to attach it to your content.", "success");
      preview();
    } catch (err) {
      el.textContent = "Upload not completed.";
      message(err.message || "Upload failed. Check Wix Media permissions and browser upload access.", "error");
    } finally {
      busy = false;
      updateEnabled();
    }
  }
  async function save(event) {
    event.preventDefault();
    if (!connected || !csrf || busy) return;
    if (!form.reportValidity()) return;
    const entry = {
      type,
      title: $("publisher-title-input").value.trim(),
      description: $("publisher-description").value.trim(),
      topic: $("publisher-topic").value,
      author: $("publisher-author").value.trim(),
      body: $("publisher-body").value.trim(),
      price: type === "ebooks" ? Number($("publisher-price").value) : 0,
      coverImage, pdfFile
    };
    if (type === "ebooks" && entry.price > 0 && pdfFile) return message("Paid PDF links must not be public.", "error");
    busy = true;
    updateEnabled();
    message(draftId ? "Updating draft in Wix…" : "Saving new draft in Wix…");
    try {
      const result = await post({ action: "saveDraft", id: draftId, entry });
      if (result.draft?.id) draftId = result.draft.id;
      $("publisher-save").textContent = "Update Wix draft";
      message(result.message || "Saved as a draft. Nothing published.", "success");
      await refresh();
    } catch (err) {
      message(err.message || "Draft could not be saved.", "error");
    } finally { busy = false; updateEnabled(); }
  }

  pane.querySelectorAll("[data-publisher-type]").forEach(b => b.addEventListener("click", () => changeType(b.dataset.publisherType)));
  form.addEventListener("submit", save);
  form.addEventListener("input", preview);
  $("publisher-reset").addEventListener("click", () => reset());
  $("publisher-refresh").addEventListener("click", refresh);
  $("publisher-cover-upload").addEventListener("click", () => upload("cover"));
  $("publisher-pdf-upload").addEventListener("click", () => upload("freePdf"));
  $("publisher-cover").addEventListener("change", () => {
    if (localCover) URL.revokeObjectURL(localCover);
    const file = $("publisher-cover").files?.[0];
    localCover = file && file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    preview();
  });
  window.addEventListener("edureach:admin-ready", event => {
    csrf = String(event.detail?.csrfToken || "");
    refresh();
  });
  window.addEventListener("edureach:admin-closed", () => {
    csrf = "";
    connected = false;
    currentDrafts = [];
    $("publisher-draft-list").replaceChildren();
    updateEnabled();
  });
  reset();
  updateEnabled();
})();