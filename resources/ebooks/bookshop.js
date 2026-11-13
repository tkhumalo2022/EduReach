(() => {
  "use strict";
  const section = document.getElementById("featured-books");
  const host = document.getElementById("featured-book-spotlight");
  const count = document.getElementById("book-count");
  const validImage = (value) => {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" && (url.hostname === "static.wixstatic.com" || url.hostname.endsWith(".wixstatic.com"));
    } catch { return false; }
  };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const money = (value) => new Intl.NumberFormat("en-ZA", {
    currency: "ZAR", style: "currency"
  }).format(Number(value) || 0);

  async function loadBookshop() {
    try {
      const response = await fetch("/api/wix-content?type=ebooks&limit=100", {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error("Could not load book data");
      const result = await response.json();
      const books = Array.isArray(result.items) ? result.items : [];
      count.textContent = books.length === 1 ? "1 published book" : books.length + " published books";
      const chosen = books.find((book) => book.featured) || books[0];
      if (!chosen) return;
      if (!books.some((book) => book.featured)) {
        document.getElementById("featured-title").textContent = "New in the library";
      }
      renderSpotlight(chosen);
      section.hidden = false;
    } catch {
      count.textContent = "Browse published books below";
    }
  }

  function renderSpotlight(book) {
    const card = element("article", "spotlight-card");
    const coverWrap = element("div", "spotlight-cover-wrap");
    if (validImage(book.image?.url)) {
      const cover = element("img", "spotlight-cover");
      cover.src = book.image.url;
      cover.alt = book.image.alt || "Cover of " + book.title;
      cover.loading = "lazy";
      coverWrap.append(cover);
    } else {
      const placeholder = element("div", "spotlight-cover-placeholder");
      placeholder.append(element("span", "", "EDUREACH"));
      placeholder.append(element("strong", "", book.title || "Inclusive Learning"));
      coverWrap.append(placeholder);
    }

    const copy = element("div", "spotlight-copy");
    copy.append(element("p", "spotlight-eyebrow", book.featured ? "HANDPICKED BY EDUREACH" : "LATEST PUBLICATION"));
    copy.append(element("h3", "", book.title || "EduReach ebook"));
    if (book.author) copy.append(element("p", "spotlight-author", "By " + book.author));
    copy.append(element("p", "spotlight-description", book.excerpt || "Explore this digital publication and the learning support it offers."));
    const footer = element("div", "spotlight-footer");
    footer.append(element("strong", "", book.accessType === "paid" ? money(book.price) : "Free"));
    const link = element("a", "bookshop-primary", "Explore this book ↗");
    link.href = book.detailUrl || "/resources/ebooks";
    footer.append(link);
    copy.append(footer);
    card.append(coverWrap, copy);
    host.replaceChildren(card);
  }

  loadBookshop();
})();