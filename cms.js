(() => {
  const EMPTY_MESSAGE = "New EduReach resources will be available soon.";
  const CHECKOUT_PATH = "/checkout";
  const DEFAULT_PAGE_SIZE = 9;
  const SOCIAL_LINKS = {
    facebook: "https://www.facebook.com/share/1EuwmMShrs/",
    instagram: "https://www.instagram.com/edureach.africa?igsh=YmcxMXpweGR1d3Nq"
  };
  const TYPE_LABELS = {
    articles: "Articles",
    ebooks: "Ebooks",
    downloads: "DownloadableResources",
    workshops: "WorkshopAlbums",
    gallery: "Gallery Albums",
    blogs: "Blogs",
    blog: "Blogs",
    team: "Team Members",
    partners: "Partners / Sponsors",
    testimonials: "Testimonials"
  };

  const TYPE_PATHS = {
    articles: "/resources/articles",
    ebooks: "/resources/ebooks",
    downloads: "/resources/downloads",
    workshops: "/resources/workshops",
    gallery: "/resources/gallery",
    blogs: "/blog",
    blog: "/blog",
    team: "/team",
    partners: "/partners",
    testimonials: "/testimonials"
  };

  const LISTING_COPY = {
    articles: "Search EduReach articles by title, topic or category.",
    ebooks: "Search ebooks and filter by category when Wix content is available.",
    downloads: "Search DownloadableResources by title, topic or category.",
    workshops: "Browse approved WorkshopAlbums with confirmed consent.",
    gallery: "Browse approved Gallery Albums with confirmed consent.",
    blogs: "Search EduReach blogs by title, topic or category.",
    blog: "Search EduReach blogs by title, topic or category.",
    team: "Search EduReach team members by name, role or area of expertise.",
    partners: "Search partners and sponsors by name, type or contribution.",
    testimonials: "Search testimonials by person, organization or topic."
  };

  const listStates = new WeakMap();
  const dateFormatter = new Intl.DateTimeFormat("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  ensureCmsPageChrome();

  document.querySelectorAll("[data-cms-list]").forEach((container) => {
    initList(container);
  });

  document.querySelectorAll("[data-cms-detail]").forEach((container) => {
    renderDetail(container);
  });

  function initList(container) {
    const type = container.dataset.cmsType;
    if (!type) return;

    const state = {
      type,
      limit: numeric(container.dataset.limit) || (isListingPage(container) ? DEFAULT_PAGE_SIZE : 3),
      page: 1,
      search: "",
      category: "",
      loading: false
    };

    listStates.set(container, state);
    ensureListControls(container, state);
    renderList(container);
  }

  async function renderList(container, append = false) {
    const state = listStates.get(container);
    if (!state || state.loading) return;

    state.loading = true;
    setLoadingState(container, append);

    try {
      const data = await fetchJson(buildListUrl(state));
      const items = Array.isArray(data.items) ? data.items : [];

      if (!append) container.innerHTML = "";

      updateControlsCategories(container, data.filters?.categories || []);

      if (!data.configured || (!items.length && !append)) {
        renderEmpty(container, container.dataset.emptyMessage || EMPTY_MESSAGE);
        renderLoadMore(container, state, false);
        return;
      }

      const fragment = document.createDocumentFragment();
      items.forEach((item) => fragment.append(createCard(item)));
      container.append(fragment);
      renderLoadMore(container, state, Boolean(data.pagination?.hasMore), data.pagination);
    } catch {
      if (!append) container.innerHTML = "";
      renderEmpty(container, "Resources could not be loaded right now.");
      renderLoadMore(container, state, false);
    } finally {
      state.loading = false;
    }
  }

  async function renderDetail(container) {
    const type = container.dataset.cmsType;
    const slug = getSlugFromPath(type);

    if (!type || !slug) {
      renderDetailState(container, "Resource not found.");
      return;
    }

    renderDetailState(container, "Loading resource...");

    try {
      const data = await fetchJson(`/api/wix-content?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`);

      if (!data.configured) {
        renderDetailState(container, EMPTY_MESSAGE);
        return;
      }

      if (!data.item) {
        renderDetailState(container, "Resource not found.");
        return;
      }

      renderDetailItem(container, data.item);
    } catch {
      renderDetailState(container, "This resource could not be loaded right now.");
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error("CMS request failed");
    return response.json();
  }

  function buildListUrl(state) {
    const params = new URLSearchParams({
      type: state.type,
      limit: String(state.limit),
      page: String(state.page)
    });

    if (state.search) params.set("search", state.search);
    if (state.category) params.set("category", state.category);

    return `/api/wix-content?${params.toString()}`;
  }

  function createCard(item) {
    const article = document.createElement("article");
    article.className = "resource-card cms-card reveal is-visible";

    if (item.image?.url) {
      const image = document.createElement("img");
      image.className = "cms-card-image";
      image.src = item.image.url;
      image.alt = item.image.alt || item.title || "";
      image.loading = "lazy";
      image.decoding = "async";
      article.append(image);
    }

    const meta = document.createElement("p");
    meta.className = "cms-meta";
    meta.textContent = cardMeta(item);
    article.append(meta);

    const heading = document.createElement("h3");
    heading.textContent = item.title || TYPE_LABELS[item.type] || "EduReach resource";
    article.append(heading);

    const badge = createAccessBadge(item);
    if (badge) article.append(badge);

    const description = document.createElement("p");
    description.textContent = item.excerpt || item.content || EMPTY_MESSAGE;
    article.append(description);

    const actions = document.createElement("div");
    actions.className = "cms-card-actions";
    actions.append(createCardAction(item));
    article.append(actions);

    return article;
  }

  function createCardAction(item) {
    const action = document.createElement("a");
    action.className = "button button-primary button-small";
    action.textContent = "Checking access...";
    action.setAttribute("aria-label", `Checking access for ${item.title || TYPE_LABELS[item.type] || "resource"}`);
    void hydrateCardAction(action, item);
    return action;
  }

  function renderDetailItem(container, item) {
    container.innerHTML = "";
    updateMetadata(item);

    const wrapper = document.createElement("article");
    wrapper.className = "cms-detail-card";

    const back = document.createElement("a");
    back.className = "button button-glass button-small";
    back.href = TYPE_PATHS[item.type] || "/#resources";
    back.textContent = "Back";
    wrapper.append(back);

    if (item.image?.url) {
      const image = document.createElement("img");
      image.className = "cms-detail-image";
      image.src = item.image.url;
      image.alt = item.image.alt || item.title || "";
      image.loading = "eager";
      image.decoding = "async";
      wrapper.append(image);
    }

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = item.label || TYPE_LABELS[item.type] || "Resource";
    wrapper.append(eyebrow);

    const heading = document.createElement("h1");
    heading.textContent = item.title || item.label || "EduReach resource";
    wrapper.append(heading);

    const meta = document.createElement("p");
    meta.className = "cms-meta";
    meta.textContent = cardMeta(item);
    wrapper.append(meta);

    wrapper.append(createDetailSocialActions());

    const badge = createAccessBadge(item, true);
    if (badge) wrapper.append(badge);

    const facts = createFacts(item);
    if (facts) wrapper.append(facts);

    const benefits = createBenefitsSection(item);
    if (benefits) wrapper.append(benefits);

    wrapper.append(renderContent(item));

    if (item.references) {
      const references = document.createElement("section");
      references.className = "cms-reference-block";
      const referenceHeading = document.createElement("h2");
      referenceHeading.textContent = "References";
      const referenceText = document.createElement("p");
      referenceText.textContent = item.references;
      references.append(referenceHeading, referenceText);
      wrapper.append(references);
    }

    if (item.tags?.length) {
      wrapper.append(createTags(item.tags));
    }

    if (item.mediaGallery?.length) {
      wrapper.append(createGallery(item));
    }

    appendDetailActions(wrapper, item);
    container.append(wrapper);
    loadRelatedResources(wrapper, item);
  }

  function renderContent(item) {
    const content = document.createElement("div");
    content.className = "cms-detail-content";
    const blocks = Array.isArray(item.contentBlocks) && item.contentBlocks.length
      ? item.contentBlocks
      : [{ type: "paragraph", text: item.content || item.excerpt || EMPTY_MESSAGE }];

    blocks.forEach((block) => {
      if (block.type === "heading") {
        const heading = document.createElement("h2");
        heading.textContent = block.text;
        content.append(heading);
        return;
      }

      if (block.type === "quote") {
        const quote = document.createElement("blockquote");
        quote.textContent = block.text;
        content.append(quote);
        return;
      }

      if (block.type === "list") {
        const list = document.createElement("ul");
        (block.items || []).forEach((itemText) => {
          const li = document.createElement("li");
          li.textContent = itemText;
          list.append(li);
        });
        content.append(list);
        return;
      }

      if (block.type === "image" && block.url) {
        const image = document.createElement("img");
        image.src = block.url;
        image.alt = block.alt || "";
        image.loading = "lazy";
        image.decoding = "async";
        content.append(image);
        return;
      }

      const paragraph = document.createElement("p");
      paragraph.textContent = block.text || "";
      content.append(paragraph);
    });

    return content;
  }

  function createFacts(item) {
    const facts = [
      ["Author", item.author],
      ["Role", item.role],
      ["Organization", item.organization],
      ["Type", item.partnerType],
      ["Sponsor tier", item.sponsorTier],
      ["Category", item.category],
      ["Date", formatDate(item.date)],
      ["Location", item.location],
      ["Programme", item.relatedProgramme],
      ["Qualifications", item.qualifications],
      ["Specialties", Array.isArray(item.specialties) ? item.specialties.join(", ") : item.specialties],
      ["Contribution", item.contribution],
      ["Rating", item.rating],
      ["Website", item.websiteUrl],
      ["LinkedIn", item.linkedinUrl],
      ["Email", item.email],
      ["Phone", item.phone],
      ["ISBN", item.isbn],
      ["Pages", item.pageCount],
      ["Language", item.language],
      ["Price", isProduct(item) ? productPriceLabel(item) : ""],
      ["File type", item.fileType],
      ["Credit", item.photographerCredit]
    ].filter(([, value]) => value);

    if (!facts.length) return null;

    const dl = document.createElement("dl");
    dl.className = "cms-detail-facts";

    facts.forEach(([label, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = String(value);
      dl.append(dt, dd);
    });

    return dl;
  }

  function createTags(tags) {
    const list = document.createElement("ul");
    list.className = "cms-tags";
    tags.forEach((tag) => {
      const li = document.createElement("li");
      li.textContent = tag;
      list.append(li);
    });
    return list;
  }

  function createGallery(item) {
    const section = document.createElement("section");
    section.className = "cms-gallery";
    section.setAttribute("aria-label", `${item.title} images`);

    item.mediaGallery.forEach((image, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cms-gallery-item";
      button.setAttribute("aria-label", `Open image ${index + 1} from ${item.title}`);

      const img = document.createElement("img");
      img.src = image.url;
      img.alt = image.alt || image.caption || `${item.title} image ${index + 1}`;
      img.loading = "lazy";
      img.decoding = "async";
      button.append(img);

      if (image.caption) {
        const caption = document.createElement("span");
        caption.textContent = image.caption;
        button.append(caption);
      }

      button.addEventListener("click", () => openLightbox(item.mediaGallery, index, item.title));
      section.append(button);
    });

    return section;
  }

  function openLightbox(images, startIndex, title) {
    let currentIndex = startIndex;
    const overlay = document.createElement("div");
    overlay.className = "cms-lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", title);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "cms-lightbox-close";
    close.textContent = "Close";

    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "cms-lightbox-nav cms-lightbox-prev";
    previous.setAttribute("aria-label", "Previous image");
    previous.textContent = "Previous";

    const next = document.createElement("button");
    next.type = "button";
    next.className = "cms-lightbox-nav cms-lightbox-next";
    next.setAttribute("aria-label", "Next image");
    next.textContent = "Next";

    const figure = document.createElement("figure");
    const img = document.createElement("img");
    const caption = document.createElement("figcaption");
    figure.append(img, caption);
    overlay.append(close, previous, figure, next);
    document.body.append(overlay);

    const update = () => {
      const image = images[currentIndex];
      img.src = image.url;
      img.alt = image.alt || image.caption || title;
      caption.textContent = image.caption || `${currentIndex + 1} of ${images.length}`;
      previous.disabled = images.length < 2;
      next.disabled = images.length < 2;
    };

    const move = (direction) => {
      currentIndex = (currentIndex + direction + images.length) % images.length;
      update();
    };

    const remove = () => {
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
    };

    const onKeydown = (event) => {
      if (event.key === "Escape") remove();
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    };

    close.addEventListener("click", remove);
    previous.addEventListener("click", () => move(-1));
    next.addEventListener("click", () => move(1));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) remove();
    });
    document.addEventListener("keydown", onKeydown);

    update();
    close.focus();
  }

  function appendDetailActions(wrapper, item) {
    const actions = document.createElement("div");
    actions.className = "cms-detail-actions";

    if (item.previewUrl) {
      actions.append(createDetailLink(item.previewUrl, "Preview", `Preview ${item.title}`));
    }

    if (shouldRenderAccessAction(item)) {
      const accessNote = item.accessType === "paid"
        ? createInlineNote("Checking payment status...")
        : null;
      const actionLink = createDetailLink("#", "Checking access...", "Checking access", false);
      actions.append(actionLink);
      if (accessNote) actions.append(accessNote);
      wrapper.append(actions);
      void hydrateDetailAction(actionLink, item, accessNote);
      return;
    }

    appendDirectoryActions(actions, item);
    if (actions.children.length) wrapper.append(actions);
  }

  function appendDirectoryActions(actions, item) {
    if (item.websiteUrl) {
      actions.append(createDetailLink(item.websiteUrl, "Visit Website", `Visit ${item.title} website`));
    }

    if (item.linkedinUrl) {
      actions.append(createDetailLink(item.linkedinUrl, "LinkedIn", `View ${item.title} on LinkedIn`));
    }

    if (item.email) {
      actions.append(createDetailLink(`mailto:${item.email}`, "Email", `Email ${item.title}`));
    }
  }

  function createDetailLink(href, label, ariaLabel, download = false) {
    const link = document.createElement("a");
    link.className = "button button-primary";
    link.href = href;
    link.textContent = label;
    link.setAttribute("aria-label", ariaLabel);

    if (download) link.setAttribute("download", "");

    if (isExternalUrl(href)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    return link;
  }

  function createDetailSocialActions() {
    const section = document.createElement("div");
    section.className = "cms-detail-social";

    const label = document.createElement("p");
    label.className = "cms-detail-social-label";
    label.textContent = "Follow EduReach";
    section.append(label);

    const actions = document.createElement("div");
    actions.className = "cms-detail-social-actions";

    [
      {
        label: "Instagram",
        href: "https://www.instagram.com/edureach.africa?igsh=YmcxMXpweGR1d3Nq",
        icon: '<svg class="social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="4"></rect><circle cx="12" cy="12" r="3.2"></circle><path d="M16.8 7.2h.01"></path></svg>'
      },
      {
        label: "Facebook",
        href: "https://www.facebook.com/share/1EuwmMShrs/",
        icon: '<svg class="social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 8.5h2V5h-2.4C10.8 5 9 6.8 9 9.7V12H7v3.5h2V21h3.6v-5.5H15l.5-3.5h-2.9V9.8c0-.8.4-1.3 1.4-1.3Z"></path></svg>'
      }
    ].forEach((link) => {
      const anchor = document.createElement("a");
      anchor.className = "cms-detail-social-link";
      anchor.href = link.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.setAttribute("aria-label", `Follow EduReach on ${link.label}`);
      anchor.innerHTML = `${link.icon}<span>${link.label}</span>`;
      actions.append(anchor);
    });

    section.append(actions);
    return section;
  }

  function createAccessBadge(item, detail = false) {
    if (!isProduct(item) || !item?.accessType) return null;

    const badge = document.createElement("span");
    badge.className = "cms-access-badge";
    badge.textContent = item.accessType === "paid" ? formatPrice(item) : "Free";
    if (item.accessType === "paid") badge.classList.add("is-paid");
    if (detail) badge.classList.add("cms-access-badge-detail");
    return badge;
  }

  function createBenefitsSection(item) {
    if (!item?.previewText) return null;

    const section = document.createElement("section");
    section.className = "cms-benefits-section";

    const heading = document.createElement("h2");
    heading.textContent = "What you’ll get";
    section.append(heading);

    const previewText = String(item.previewText).trim();
    if (previewText.includes("\n")) {
      const list = document.createElement("ul");
      previewText.split(/\n+/).filter(Boolean).forEach((entry) => {
        const li = document.createElement("li");
        li.textContent = entry.trim();
        list.append(li);
      });
      section.append(list);
    } else {
      const paragraph = document.createElement("p");
      paragraph.textContent = previewText;
      section.append(paragraph);
    }

    return section;
  }

  function createInlineNote(message) {
    const note = document.createElement("p");
    note.className = "cms-empty cms-inline-note";
    note.dataset.cmsActionNote = "true";
    note.textContent = message;
    if (!message) note.hidden = true;
    return note;
  }

  async function loadRelatedResources(wrapper, item) {
    if (!item.category || !item.type || !TYPE_PATHS[item.type]) return;

    try {
      const data = await fetchJson(
        `/api/wix-content?type=${encodeURIComponent(item.type)}&limit=4&category=${encodeURIComponent(item.category)}`
      );
      const related = (data.items || [])
        .filter((candidate) => candidate.slug && candidate.slug !== item.slug)
        .slice(0, 3);

      if (!related.length) return;

      const section = document.createElement("section");
      section.className = "cms-related";
      const heading = document.createElement("h2");
      heading.textContent = "Related resources";
      const grid = document.createElement("div");
      grid.className = "resource-grid cms-grid";
      related.forEach((candidate) => grid.append(createCard(candidate)));
      section.append(heading, grid);
      wrapper.append(section);
    } catch {
      // Related content is helpful but not required for the detail page.
    }
  }

  function ensureListControls(container, state) {
    if (!isListingPage(container) || container.dataset.controlsReady === "true") return;

    const form = document.createElement("form");
    form.className = "cms-toolbar";
    form.setAttribute("role", "search");
    form.innerHTML = `
      <p>${LISTING_COPY[state.type] || "Search EduReach resources."}</p>
      <div class="cms-toolbar-row">
        <label class="sr-only" for="cms-search-${state.type}">Search ${TYPE_LABELS[state.type]}</label>
        <input id="cms-search-${state.type}" type="search" placeholder="Search" autocomplete="off" data-cms-search />
        <label class="sr-only" for="cms-category-${state.type}">Filter by category</label>
        <select id="cms-category-${state.type}" data-cms-category>
          <option value="">All categories</option>
        </select>
        <button class="button button-primary button-small" type="submit">Search</button>
        <button class="button button-glass button-small" type="button" data-cms-clear>Clear</button>
      </div>
    `;

    container.parentNode.insertBefore(form, container);
    container.dataset.controlsReady = "true";

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      state.search = form.querySelector("[data-cms-search]").value.trim();
      state.category = form.querySelector("[data-cms-category]").value;
      state.page = 1;
      renderList(container);
    });

    form.querySelector("[data-cms-category]").addEventListener("change", (event) => {
      state.category = event.currentTarget.value;
      state.page = 1;
      renderList(container);
    });

    form.querySelector("[data-cms-clear]").addEventListener("click", () => {
      form.reset();
      state.search = "";
      state.category = "";
      state.page = 1;
      renderList(container);
    });
  }

  function updateControlsCategories(container, categories) {
    if (!isListingPage(container)) return;
    const form = container.parentElement.querySelector(".cms-toolbar");
    const select = form?.querySelector("[data-cms-category]");
    if (!select || !categories.length) return;

    const current = select.value;
    const unique = [...new Set(categories)].filter(Boolean).sort((a, b) => a.localeCompare(b));
    select.innerHTML = '<option value="">All categories</option>';
    unique.forEach((category) => {
      const option = document.createElement("option");
      option.value = slugify(category);
      option.textContent = category;
      select.append(option);
    });
    select.value = current;
  }

  function renderLoadMore(container, state, hasMore, pagination = {}) {
    if (!isListingPage(container)) return;

    let wrapper = container.parentElement.querySelector(".cms-load-more-wrap");
    if (!hasMore && !wrapper) return;

    if (!hasMore && wrapper) {
      wrapper.remove();
      return;
    }

    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "cms-load-more-wrap";
      const summary = document.createElement("p");
      summary.className = "cms-pagination-summary";
      const button = document.createElement("button");
      button.className = "button button-primary";
      button.type = "button";
      button.textContent = "Load More";
      wrapper.append(summary, button);
      container.after(wrapper);

      button.addEventListener("click", () => {
        state.page += 1;
        renderList(container, true);
      });
    }

    const summary = wrapper.querySelector(".cms-pagination-summary");
    const button = wrapper.querySelector("button");
    if (button) button.textContent = "Load More";
    if (pagination.total) {
      const shown = Math.min(state.page * state.limit, pagination.total);
      summary.textContent = `Showing ${shown} of ${pagination.total}`;
    } else {
      summary.textContent = "";
    }
  }

  function setLoadingState(container, append) {
    if (append) {
      const button = container.parentElement.querySelector(".cms-load-more-wrap button");
      if (button) button.textContent = "Loading...";
      return;
    }

    container.innerHTML = "";
    renderEmpty(container, "Loading resources...", "cms-state");
  }

  function renderEmpty(container, message, className = "cms-empty") {
    const empty = document.createElement("p");
    empty.className = className;
    empty.textContent = message;
    container.append(empty);
  }

  function renderDetailState(container, message) {
    container.innerHTML = "";
    const state = document.createElement("p");
    state.className = "cms-empty cms-detail-state";
    state.textContent = message;
    container.append(state);
  }

  function getSlugFromPath(type) {
    const base = TYPE_PATHS[type];
    if (!base) return "";

    const pathname = window.location.pathname.replace(/\/$/, "");
    if (!pathname.startsWith(`${base}/`)) return "";
    return decodeURIComponent(pathname.slice(base.length + 1)).trim();
  }

  function resolveAccessActionHref(item, accessState = { accessGranted: false, downloadUrl: "" }) {
    if (!isProduct(item)) {
      return item.websiteUrl || item.detailUrl || TYPE_PATHS[item.type] || "/#resources";
    }

    if (item.accessType === "paid" && !accessState.accessGranted) {
      return CHECKOUT_PATH;
    }

    return accessState.downloadUrl || item.downloadLink || item.fileUrl || item.detailUrl || TYPE_PATHS[item.type] || "/#resources";
  }

  function resolveAccessActionLabel(item, accessState = { accessGranted: false, downloadUrl: "" }) {
    if (item.accessButtonLabel) return item.accessButtonLabel;
    if (!isProduct(item)) return item.ctaLabel || "View";
    if (item.accessType === "paid" && !accessState.accessGranted) return "Buy / Access Resource";
    if (item.accessType === "paid") return "Download Resource";
    return item.ctaLabel || "Download Free Resource";
  }

  function actionHref(item) {
    return resolveAccessActionHref(item);
  }

  async function getResourceAccessState(item) {
    if (!item || item.accessType !== "paid") {
      return { accessGranted: true, order: null, downloadUrl: "" };
    }

    const orderId = readLatestOrderId();
    if (!orderId) {
      return { accessGranted: false, order: null, downloadUrl: "" };
    }

    try {
      const response = await fetch(`/api/orders?orderId=${encodeURIComponent(orderId)}`, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.order) {
        return { accessGranted: false, order: null, downloadUrl: "" };
      }

      const order = result.order;
      const matchingItem = (order.items || []).find((orderItem) => matchesResource(item, orderItem));
      const accessGranted = order.status === "paid" && Boolean(matchingItem);

      return {
        accessGranted,
        order,
        downloadUrl: accessGranted ? matchingItem?.downloadUrl || "" : ""
      };
    } catch {
      return { accessGranted: false, order: null, downloadUrl: "" };
    }
  }

  async function hydrateCardAction(action, item) {
    const accessState = await getResourceAccessState(item);
    const href = resolveAccessActionHref(item, accessState);
    action.href = href;
    action.textContent = resolveAccessActionLabel(item, accessState);
    action.setAttribute("aria-label", `${action.textContent} ${item.title || TYPE_LABELS[item.type] || "resource"}`);
    bindPaidCheckoutAction(action, item, null, accessState);

    if (item.accessType === "paid" && !accessState.accessGranted) {
      if (isExternalUrl(href)) {
        action.target = "_blank";
        action.rel = "noopener noreferrer";
      } else {
        action.removeAttribute("target");
        action.removeAttribute("rel");
      }
    } else if (shouldDownload(item, accessState)) {
      action.setAttribute("download", "");
      action.removeAttribute("target");
      action.removeAttribute("rel");
    } else {
      action.removeAttribute("download");
      action.removeAttribute("target");
      action.removeAttribute("rel");
    }
  }

  async function hydrateDetailAction(action, item, note) {
    const accessState = await getResourceAccessState(item);
    const href = resolveAccessActionHref(item, accessState);
    action.href = href;
    action.textContent = resolveAccessActionLabel(item, accessState);
    action.setAttribute("aria-label", `${action.textContent} ${item.title || TYPE_LABELS[item.type] || "resource"}`);
    bindPaidCheckoutAction(action, item, note, accessState);

    if (item.accessType === "paid" && !accessState.accessGranted) {
      if (isExternalUrl(href)) {
        action.target = "_blank";
        action.rel = "noopener noreferrer";
      } else {
        action.removeAttribute("target");
        action.removeAttribute("rel");
      }
      if (note) note.textContent = "Payment confirmation is still required to unlock this resource.";
    } else if (shouldDownload(item, accessState)) {
      action.setAttribute("download", "");
      action.removeAttribute("target");
      action.removeAttribute("rel");
      if (note) note.remove();
    } else {
      action.removeAttribute("download");
      action.removeAttribute("target");
      action.removeAttribute("rel");
      if (note) note.remove();
    }
  }

  function bindPaidCheckoutAction(action, item, note, accessState) {
    if (item.accessType !== "paid" || accessState.accessGranted || action.dataset.paidCheckoutBound) return;

    action.dataset.paidCheckoutBound = "true";
    action.addEventListener("click", (event) => {
      event.preventDefault();
      startPaidResourceCheckout(item, action, note);
    });
  }

  function startPaidResourceCheckout(item, action, note) {
    const cartApi = window.EDUREACH_CART;
    const product = cartApi?.productFromCmsItem?.(item);

    if (!cartApi?.addItem || !product) {
      showCheckoutActionError(
        action,
        note,
        "Checkout could not be started for this resource. Please try again or contact EduReach."
      );
      return;
    }

    try {
      cartApi.addItem(product, 1);
      action.textContent = "Opening checkout...";
      action.setAttribute("aria-busy", "true");
      if (note) {
        note.hidden = false;
        note.classList.remove("is-error");
        note.textContent = "Opening secure checkout...";
      }
      window.location.assign(CHECKOUT_PATH);
    } catch (error) {
      console.error("EduReach checkout handoff failed.", error);
      showCheckoutActionError(
        action,
        note,
        "Checkout could not be started. Please try again."
      );
    }
  }

  function showCheckoutActionError(action, note, message) {
    const target = note || ensureActionNote(action);
    if (!target) return;

    action.removeAttribute("aria-busy");
    target.hidden = false;
    target.classList.add("is-error");
    target.textContent = message;
  }

  function ensureActionNote(action) {
    if (!action.parentElement) return null;

    const existing = action.parentElement.querySelector("[data-cms-action-note]");
    if (existing) return existing;

    const note = createInlineNote("");
    action.insertAdjacentElement("afterend", note);
    return note;
  }

  function shouldDownload(item, accessState = { accessGranted: false, downloadUrl: "" }) {
    if (item.accessType === "paid" && !accessState.accessGranted) return false;
    return Boolean(accessState.downloadUrl || item.downloadLink || item.fileUrl);
  }

  function matchesResource(item, orderItem) {
    const itemType = String(item?.type || "").trim().toLowerCase();
    const orderType = String(orderItem?.type || "").trim().toLowerCase();
    const itemSlug = String(item?.slug || "").trim();
    const orderSlug = String(orderItem?.slug || orderItem?.key || orderItem?.id || "").trim();
    return itemType === orderType && itemSlug === orderSlug;
  }

  function readLatestOrderId() {
    try {
      const stored = JSON.parse(localStorage.getItem("edureach.orders.v1") || "{}");
      return stored?.__latest || "";
    } catch {
      return "";
    }
  }

  function isExternalUrl(href) {
    return /^https?:\/\//i.test(href) || String(href).startsWith("wix:");
  }

  function cardMeta(item) {
    const parts = [];
    if (item.role) parts.push(item.role);
    if (item.organization) parts.push(item.organization);
    if (item.partnerType) parts.push(item.partnerType);
    if (item.sponsorTier) parts.push(item.sponsorTier);
    if (item.author && item.type === "testimonials") parts.push(item.author);
    if (item.category) parts.push(item.category);
    if (item.date) parts.push(formatDate(item.date));
    if (item.accessType === "paid") parts.push(formatPrice(item));
    return parts.filter(Boolean).join(" | ") || item.label || TYPE_LABELS[item.type] || "Resource";
  }

  function isProduct(item) {
    return item?.type === "downloads" || item?.type === "ebooks";
  }

  function shouldRenderAccessAction(item) {
    return isProduct(item) || Boolean(item.downloadLink || item.fileUrl);
  }

  function isPurchasableProduct(item) {
    return isProduct(item) && item.accessType === "paid";
  }

  function productPriceLabel(item) {
    if (!isProduct(item)) return "";
    return item.accessType === "paid" ? formatPrice(item) : "Free";
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
  }

  function formatPrice(item) {
    const price = Number(item.price);
    if (!Number.isFinite(price)) return item.price ? String(item.price) : "Paid";

    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: item.currency || "ZAR"
    }).format(price);
  }

  function updateMetadata(item) {
    const title = item.seoTitle || item.title || "EduReach resource";
    const description = item.seoDescription || item.excerpt || "";
    const canonical = new URL(item.detailUrl || window.location.pathname, window.location.origin).href;

    document.title = `${title} | EduReach`;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:url", canonical, "property");
    if (item.image?.url) setMeta("og:image", item.image.url, "property");
    setCanonical(canonical);
  }

  function setMeta(name, content, attribute = "name") {
    if (!content) return;
    let tag = document.querySelector(`meta[${attribute}="${name}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attribute, name);
      document.head.append(tag);
    }
    tag.setAttribute("content", content);
  }

  function setCanonical(href) {
    let tag = document.querySelector('link[rel="canonical"]');
    if (!tag) {
      tag = document.createElement("link");
      tag.rel = "canonical";
      document.head.append(tag);
    }
    tag.href = href;
  }

  function isListingPage(container) {
    return Boolean(container.closest(".cms-listing-page"));
  }

  function numeric(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function ensureCmsPageChrome() {
    if (!document.body.classList.contains("cms-page")) return;

    ensureMobileMenu();
    ensureFooter();
  }

  function ensureMobileMenu() {
    const headerInner = document.querySelector(".header-inner");
    const navigation = document.querySelector(".primary-nav");
    if (!headerInner || !navigation || document.querySelector(".menu-toggle")) return;

    if (!navigation.id) navigation.id = "primary-navigation";

    const button = document.createElement("button");
    button.className = "menu-toggle";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", navigation.id);
    button.setAttribute("aria-label", "Open navigation menu");
    button.innerHTML = `
      <span class="menu-line" aria-hidden="true"></span>
      <span class="menu-line" aria-hidden="true"></span>
      <span class="menu-line" aria-hidden="true"></span>
    `;

    headerInner.insertBefore(button, navigation);

    const closeMenu = () => {
      navigation.classList.remove("open");
      document.body.classList.remove("nav-open");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open navigation menu");
    };

    button.addEventListener("click", () => {
      const isOpen = navigation.classList.toggle("open");
      document.body.classList.toggle("nav-open", isOpen);
      button.setAttribute("aria-expanded", String(isOpen));
      button.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });

    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  function ensureFooter() {
    if (document.querySelector(".site-footer")) return;

    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="container footer-layout">
        <div class="footer-brand">
          <img src="/assets/logo.png" alt="EduReach" width="260" height="75" />
          <p>Inclusive education consultancy supporting schools, learners, families and communities.</p>
        </div>

        <nav class="footer-links" aria-label="Quick links">
          <h2>Quick Links</h2>
          <a href="/#story">Our Story</a>
          <a href="/#founder">Founder</a>
          <a href="/#services">Services</a>
          <a href="/#vision">Our Vision</a>
          <a href="/#mission">Our Mission</a>
          <a href="/#pilot">School Pilot</a>
          <a href="/#contact">Contact</a>
        </nav>

        <div class="footer-links">
          <h2>Contact</h2>
          <a href="mailto:edureach70@gmail.com">edureach70@gmail.com</a>
          <a href="https://www.google.com/maps/search/?api=1&query=12A%20Chat%20Crescent%2C%20Birdswood%2C%20Richards%20Bay%2C%203900%2C%20South%20Africa" target="_blank" rel="noopener noreferrer">12A Chat Crescent, Richards Bay</a>
          <a href="tel:+27812148384">+27 81 214 8384</a>
          <a href="https://wa.me/27812148384" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>

        <nav class="footer-links" aria-label="Social media">
          <h2>Social Media</h2>
          <a class="footer-social-link" href="${SOCIAL_LINKS.facebook}" target="_blank" rel="noopener noreferrer" aria-label="Visit EduReach Africa on Facebook">
            <svg class="social-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <path d="M14 8.5h2V5h-2.4C10.8 5 9 6.8 9 9.7V12H7v3.5h2V21h3.6v-5.5H15l.5-3.5h-2.9V9.8c0-.8.4-1.3 1.4-1.3Z"></path>
            </svg>
            <span>Facebook</span>
          </a>
          <a class="footer-social-link" href="${SOCIAL_LINKS.instagram}" target="_blank" rel="noopener noreferrer" aria-label="Visit EduReach Africa on Instagram">
            <svg class="social-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <rect x="4" y="4" width="16" height="16" rx="4"></rect>
              <circle cx="12" cy="12" r="3.2"></circle>
              <path d="M16.8 7.2h.01"></path>
            </svg>
            <span>Instagram</span>
          </a>
        </nav>
      </div>

      <div class="container footer-bottom">
        <p>&copy; <span data-cms-current-year></span> EduReach. All rights reserved.</p>
        <a href="/#home">Back to top</a>
      </div>
    `;

    document.body.insertBefore(footer, document.querySelector("script"));
    footer.querySelector("[data-cms-current-year]").textContent = new Date().getFullYear();
  }
})();
