(() => {
  const CART_KEY = "edureach.cart.v1";
  const ORDERS_KEY = "edureach.orders.v1";
  const CUSTOMER_KEY = "edureach.checkoutCustomer.v1";
  const PRODUCT_TYPES = new Set(["ebooks", "downloads"]);
  const MAX_QUANTITY = 99;
  const currencyFormatter = new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR"
  });

  ensureCartNavigation();
  updateCartBadges();
  bindDeclarativeCartButtons();
  renderCartPage();
  renderCheckoutPage();
  renderSuccessPage();
  renderCancelledPage();

  window.EDUREACH_CART = {
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getCart,
    getCount,
    createAddToCartButton,
    productFromCmsItem
  };

  function addItem(product, quantity = 1) {
    const item = normalizeProduct(product);
    if (!item) return null;

    const cart = getCart();
    const existing = cart.find((cartItem) => cartItem.key === item.key);
    const nextQuantity = clampQuantity((existing?.quantity || 0) + quantity);

    if (existing) {
      existing.quantity = nextQuantity;
    } else {
      cart.push({ ...item, quantity: nextQuantity });
    }

    saveCart(cart);
    announceCartUpdate();
    return item;
  }

  function removeItem(key) {
    saveCart(getCart().filter((item) => item.key !== key));
    announceCartUpdate();
  }

  function updateQuantity(key, quantity) {
    const nextQuantity = clampQuantity(quantity);
    const cart = getCart();
    const item = cart.find((cartItem) => cartItem.key === key);

    if (!item) return;
    item.quantity = nextQuantity;
    saveCart(cart);
    announceCartUpdate();
  }

  function clearCart() {
    saveCart([]);
    announceCartUpdate();
  }

  function getCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(parsed)
        ? parsed.map(normalizeStoredItem).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  }

  function getCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
  }

  function createAddToCartButton(item, options = {}) {
    const product = productFromCmsItem(item);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `button button-primary${options.small === false ? "" : " button-small"}`;
    button.textContent = "Add to Cart";
    button.disabled = !product;

    if (product) {
      button.setAttribute("aria-label", `Add ${product.title} to cart`);
      button.addEventListener("click", () => {
        addItem(product, 1);
        showAddedState(button);
      });
    } else {
      button.textContent = "Unavailable";
    }

    return button;
  }

  function productFromCmsItem(item) {
    if (!item || !PRODUCT_TYPES.has(item.type) || item.accessType !== "paid") return null;

    return normalizeProduct({
      id: item.id,
      type: item.type,
      slug: item.slug,
      title: item.title,
      price: item.price,
      currency: item.currency || "ZAR",
      image: item.image,
      detailUrl: item.detailUrl,
      fileType: item.fileType || "PDF"
    });
  }

  function bindDeclarativeCartButtons() {
    document.querySelectorAll("[data-add-to-cart]").forEach((button) => {
      button.addEventListener("click", () => {
        const product = normalizeProduct({
          id: button.dataset.productId,
          type: button.dataset.productType,
          slug: button.dataset.productSlug,
          title: button.dataset.productTitle,
          price: button.dataset.productPrice,
          currency: button.dataset.productCurrency || "ZAR"
        });

        if (!product) return;
        addItem(product, 1);
        showAddedState(button);
      });
    });
  }

  function renderCartPage() {
    const container = document.querySelector("[data-cart-page]");
    if (!container) return;

    const render = () => {
      const cart = getCart();
      container.innerHTML = "";

      if (!cart.length) {
        container.append(createEmptyState("Your cart is empty.", "Browse resources to add paid ebooks and downloadable resources."));
        return;
      }

      const layout = div("commerce-layout");
      const list = div("commerce-items");
      cart.forEach((item) => list.append(createCartRow(item)));
      layout.append(list, createCartSummary(cart));
      container.append(layout);
    };

    render();
    window.addEventListener("edureach-cart-updated", render);
  }

  function renderCheckoutPage() {
    const container = document.querySelector("[data-checkout-page]");
    if (!container) return;

    const cart = getCart();
    container.innerHTML = "";

    if (!cart.length) {
      container.append(createEmptyState("Your cart is empty.", "Add paid resources before checking out."));
      return;
    }

    const customer = readCustomer();
    const layout = div("commerce-layout checkout-layout");
    const form = document.createElement("form");
    form.className = "checkout-form";
    form.noValidate = true;
    form.append(
      checkoutField("name", "Name", "given-name", customer.name, true),
      checkoutField("surname", "Surname", "family-name", customer.surname, true),
      checkoutField("email", "Email", "email", customer.email, true)
    );

    const status = document.createElement("p");
    status.className = "form-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.textContent = "PayFast will process your secure payment.";

    const button = document.createElement("button");
    button.className = "button button-primary";
    button.type = "submit";
    button.textContent = "Checkout with PayFast";
    form.append(button, status);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await submitCheckout(form, status, button);
    });

    layout.append(form, createCheckoutSummary(cart));
    container.append(layout);
  }

  async function submitCheckout(form, status, button) {
    if (!form.checkValidity()) {
      form.reportValidity();
      status.textContent = "Please complete your customer information.";
      status.classList.add("is-error");
      return;
    }

    const formData = new FormData(form);
    const customer = {
      name: clean(formData.get("name")),
      surname: clean(formData.get("surname")),
      email: clean(formData.get("email")).toLowerCase()
    };
    const cart = getCart();

    saveCustomer(customer);
    button.disabled = true;
    status.classList.remove("is-error", "is-success");
    status.textContent = "Validating your cart and preparing PayFast checkout...";

    try {
      const response = await fetch("/api/payfast/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          customer,
          items: cart.map((item) => ({
            id: item.id,
            type: item.type,
            slug: item.slug,
            quantity: item.quantity
          }))
        })
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || "Checkout could not be started.");
      }

      saveOrderSnapshot(result.order);
      status.textContent = "Redirecting to PayFast...";
      launchPayFast(result.paymentUrl, result.fields);
    } catch (error) {
      status.textContent = error.message || "Checkout could not be started.";
      status.classList.add("is-error");
      button.disabled = false;
    }
  }

  function renderSuccessPage() {
    const container = document.querySelector("[data-payment-success]");
    if (!container) return;

    const orderId = new URLSearchParams(window.location.search).get("order") || readLatestOrderId();
    container.innerHTML = "";

    if (!orderId) {
      container.append(createEmptyState("Payment successful.", "Your order details could not be found on this device."));
      return;
    }

    const loading = stateMessage("Confirming your PayFast payment...");
    container.append(loading);
    loadOrderWithPolling(container, orderId, 0);
  }

  async function loadOrderWithPolling(container, orderId, attempt) {
    const order = await fetchOrder(orderId);
    const resolvedOrder = order || null;

    if (resolvedOrder?.status === "paid" || attempt >= 12) {
      container.innerHTML = "";
      renderOrderResult(container, resolvedOrder, "success");
      if (resolvedOrder?.status === "paid") clearCart();
      return;
    }

    if (resolvedOrder) saveOrderSnapshot(resolvedOrder);
    window.setTimeout(() => loadOrderWithPolling(container, orderId, attempt + 1), 2500);
  }

  function renderCancelledPage() {
    const container = document.querySelector("[data-payment-cancelled]");
    if (!container) return;

    const orderId = new URLSearchParams(window.location.search).get("order") || readLatestOrderId();
    container.innerHTML = "";

    if (!orderId) {
      renderOrderResult(container, null, "cancelled");
      return;
    }

    container.append(stateMessage("Checking your payment status..."));
    void fetchOrder(orderId).then((order) => {
      container.innerHTML = "";
      renderOrderResult(container, order, "cancelled");
    });
  }

  async function fetchOrder(orderId) {
    try {
      const response = await fetch(`/api/orders?orderId=${encodeURIComponent(orderId)}`, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.order) return null;
      saveOrderSnapshot(result.order);
      return result.order;
    } catch {
      return null;
    }
  }

  function renderOrderResult(container, order, state) {
    const panel = div("order-result");
    const title = document.createElement("h2");
    const intro = document.createElement("p");

    if (state === "cancelled") {
      title.textContent = "Payment Cancelled";
      intro.textContent = "No payment was completed. Your cart is still available if you would like to try again.";
    } else if (order?.status === "paid") {
      title.textContent = "Payment Successful";
      intro.textContent = "Thank you. Your EduReach digital resources are ready to download.";
    } else {
      title.textContent = "Payment Return Received";
      intro.textContent = "PayFast confirmation is still syncing. Download buttons will appear once the order is marked paid.";
    }

    panel.append(title, intro);

    if (order) {
      panel.append(createOrderMeta(order), createOrderItems(order));
    } else {
      panel.append(stateMessage("Order details are not available yet."));
    }

    const actions = div("commerce-actions");
    actions.append(linkButton("/resources/ebooks", "Browse Ebooks", "button button-glass commerce-secondary"));
    actions.append(linkButton("/cart", state === "cancelled" ? "Return to Cart" : "View Cart", "button button-primary"));
    panel.append(actions);
    container.append(panel);
  }

  function createCartRow(item) {
    const row = div("cart-row");

    if (item.image?.url) {
      const image = document.createElement("img");
      image.className = "cart-row-image";
      image.src = item.image.url;
      image.alt = item.image.alt || item.title;
      image.loading = "lazy";
      row.append(image);
    }

    const body = div("cart-row-body");
    const title = document.createElement("h2");
    title.textContent = item.title;
    const meta = document.createElement("p");
    meta.textContent = `${labelForType(item.type)} | ${formatCurrency(item.priceCents, item.currency)}`;
    body.append(title, meta);

    const controls = div("cart-row-controls");
    const quantityLabel = document.createElement("label");
    quantityLabel.className = "sr-only";
    quantityLabel.htmlFor = `quantity-${item.key}`;
    quantityLabel.textContent = `Quantity for ${item.title}`;
    const quantity = document.createElement("input");
    quantity.id = `quantity-${item.key}`;
    quantity.type = "number";
    quantity.min = "1";
    quantity.max = String(MAX_QUANTITY);
    quantity.value = String(item.quantity);
    quantity.addEventListener("change", () => updateQuantity(item.key, quantity.value));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button button-glass button-small commerce-secondary";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => removeItem(item.key));
    controls.append(quantityLabel, quantity, remove);

    const total = document.createElement("strong");
    total.className = "cart-row-total";
    total.textContent = formatCurrency(item.priceCents * item.quantity, item.currency);
    row.append(body, controls, total);
    return row;
  }

  function createCartSummary(cart) {
    const summary = div("cart-summary");
    const title = document.createElement("h2");
    title.textContent = "Cart Total";
    summary.append(title, summaryLine("Subtotal", cartTotal(cart)), summaryLine("Grand Total", cartTotal(cart), true));

    const actions = div("commerce-actions");
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "button button-glass commerce-secondary";
    clear.textContent = "Clear Cart";
    clear.addEventListener("click", clearCart);
    actions.append(clear, linkButton("/checkout", "Checkout", "button button-primary"));
    summary.append(actions);
    return summary;
  }

  function createCheckoutSummary(cart) {
    const summary = div("cart-summary checkout-summary");
    const title = document.createElement("h2");
    title.textContent = "Order Summary";
    summary.append(title);
    cart.forEach((item) => {
      summary.append(summaryLine(`${item.quantity} x ${item.title}`, item.priceCents * item.quantity));
    });
    summary.append(summaryLine("Subtotal", cartTotal(cart)), summaryLine("Grand Total", cartTotal(cart), true));
    return summary;
  }

  function createOrderMeta(order) {
    const meta = document.createElement("dl");
    meta.className = "order-meta";
    appendDefinition(meta, "Order ID", order.id);
    appendDefinition(meta, "Customer", [order.customer?.name, order.customer?.surname].filter(Boolean).join(" "));
    appendDefinition(meta, "Email", order.customer?.email);
    appendDefinition(meta, "Amount", formatCurrency(order.amountCents, order.currency));
    appendDefinition(meta, "Status", order.status);
    appendDefinition(meta, "Date", formatDate(order.date));
    return meta;
  }

  function createOrderItems(order) {
    const list = div("order-items");
    (order.items || []).forEach((item) => {
      const row = div("order-item");
      const body = div("order-item-body");
      const title = document.createElement("h3");
      title.textContent = item.title;
      const meta = document.createElement("p");
      meta.textContent = `${item.quantity} x ${formatCurrency(item.unitAmountCents, item.currency)}`;
      body.append(title, meta);
      row.append(body);

      if (item.downloadUrl) {
        const download = linkButton(item.downloadUrl, "Download", "button button-primary button-small");
        download.setAttribute("download", "");
        if (isExternalUrl(item.downloadUrl)) {
          download.target = "_blank";
          download.rel = "noopener noreferrer";
        }
        row.append(download);
      } else {
        const note = document.createElement("p");
        note.className = "download-note";
        note.textContent = order.status === "paid" ? "File pending." : "Awaiting payment confirmation.";
        row.append(note);
      }

      list.append(row);
    });
    return list;
  }

  function createEmptyState(titleText, messageText) {
    const state = div("empty-cart-state");
    const title = document.createElement("h2");
    title.textContent = titleText;
    const message = document.createElement("p");
    message.textContent = messageText;
    const actions = div("commerce-actions");
    actions.append(linkButton("/resources/ebooks", "Browse Ebooks", "button button-primary"));
    actions.append(linkButton("/resources/downloads", "Browse Downloads", "button button-glass commerce-secondary"));
    state.append(title, message, actions);
    return state;
  }

  function checkoutField(name, labelText, autocomplete, value, required) {
    const field = div("field");
    const label = document.createElement("label");
    label.htmlFor = `checkout-${name}`;
    label.textContent = labelText;
    const input = document.createElement("input");
    input.id = `checkout-${name}`;
    input.name = name;
    input.type = name === "email" ? "email" : "text";
    input.autocomplete = autocomplete;
    input.value = value || "";
    input.required = required;
    field.append(label, input);
    return field;
  }

  function summaryLine(label, cents, strong = false) {
    const line = div(strong ? "summary-line summary-line-total" : "summary-line");
    const labelNode = document.createElement("span");
    labelNode.textContent = label;
    const valueNode = document.createElement(strong ? "strong" : "span");
    valueNode.textContent = formatCurrency(cents);
    line.append(labelNode, valueNode);
    return line;
  }

  function appendDefinition(list, label, value) {
    if (!value) return;
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    list.append(term, description);
  }

  function launchPayFast(paymentUrl, fields) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = paymentUrl;
    form.hidden = true;

    Object.entries(fields || {}).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = String(value);
      form.append(input);
    });

    document.body.append(form);
    form.submit();
  }

  function ensureCartNavigation() {
    document.querySelectorAll(".primary-nav").forEach((navigation) => {
      if (navigation.querySelector("[data-cart-nav]")) return;

      const existingLink = [...navigation.querySelectorAll("a")].find((anchor) => {
        return anchor.getAttribute("href") === "/cart";
      });

      if (existingLink) {
        existingLink.classList.add("cart-nav-link");
        existingLink.dataset.cartNav = "true";
        if (!existingLink.querySelector("[data-cart-count]")) {
          const badge = document.createElement("span");
          badge.className = "cart-badge";
          badge.dataset.cartCount = "true";
          badge.textContent = "0";
          existingLink.append(badge);
        }
        return;
      }

      const link = document.createElement("a");
      link.className = "cart-nav-link";
      link.href = "/cart";
      link.dataset.cartNav = "true";
      link.innerHTML = '<span aria-hidden="true">&#128722;</span><span>Cart</span><span class="cart-badge" data-cart-count>0</span>';

      if (window.location.pathname.replace(/\/$/, "") === "/cart") {
        link.setAttribute("aria-current", "page");
      }

      const primaryButton = navigation.querySelector(".button");
      if (primaryButton) {
        navigation.insertBefore(link, primaryButton);
      } else {
        navigation.append(link);
      }
    });
  }

  function updateCartBadges() {
    const count = getCount();
    document.querySelectorAll("[data-cart-count]").forEach((badge) => {
      badge.textContent = String(count);
      badge.classList.toggle("is-empty", count === 0);
    });
  }

  function announceCartUpdate() {
    updateCartBadges();
    window.dispatchEvent(new CustomEvent("edureach-cart-updated"));
  }

  function normalizeProduct(product) {
    const type = clean(product?.type);
    const slug = slugify(product?.slug);

    if (!PRODUCT_TYPES.has(type) || !slug) return null;

    const priceCents = product.price == null && product.priceCents != null
      ? Math.round(Number(product.priceCents) || 0)
      : priceToCents(product.price);
    const key = `${type}:${slug}`;

    return {
      key,
      id: clean(product.id),
      type,
      slug,
      title: clean(product.title) || "EduReach resource",
      priceCents,
      currency: clean(product.currency) || "ZAR",
      image: normalizeImage(product.image),
      detailUrl: clean(product.detailUrl),
      fileType: clean(product.fileType || "PDF")
    };
  }

  function normalizeStoredItem(item) {
    const product = normalizeProduct(item);
    if (!product) return null;
    return {
      ...product,
      quantity: clampQuantity(item.quantity)
    };
  }

  function normalizeImage(image) {
    if (!image?.url) return null;
    return {
      url: clean(image.url),
      alt: clean(image.alt)
    };
  }

  function priceToCents(value) {
    if (typeof value === "number") {
      return value > 10000 ? Math.round(value) : Math.round(value * 100);
    }

    const normalized = clean(value)
      .replace(/[^\d.,-]/g, "")
      .replace(/,/g, ".");
    const number = Number(normalized);
    return Number.isFinite(number) ? Math.round(number * 100) : 0;
  }

  function clampQuantity(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 1;
    return Math.max(1, Math.min(MAX_QUANTITY, Math.trunc(number)));
  }

  function cartTotal(cart) {
    return cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function saveCustomer(customer) {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
  }

  function readCustomer() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveOrderSnapshot(order) {
    if (!order?.id) return;

    const orders = readOrders();
    orders[order.id] = order;
    orders.__latest = order.id;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  function readLatestOrderId() {
    return readOrders().__latest || "";
  }

  function readOrders() {
    try {
      const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "{}");
      return orders && typeof orders === "object" ? orders : {};
    } catch {
      return {};
    }
  }

  function showAddedState(button) {
    const original = button.textContent;
    button.textContent = "Added";
    button.disabled = true;
    window.setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, 1300);
  }

  function stateMessage(message) {
    const state = document.createElement("p");
    state.className = "cms-state";
    state.textContent = message;
    return state;
  }

  function linkButton(href, text, className) {
    const link = document.createElement("a");
    link.className = className;
    link.href = href;
    link.textContent = text;
    return link;
  }

  function div(className) {
    const element = document.createElement("div");
    element.className = className;
    return element;
  }

  function formatCurrency(cents, currency = "ZAR") {
    if (currency !== "ZAR") {
      return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency
      }).format(Number(cents || 0) / 100);
    }

    return currencyFormatter.format(Number(cents || 0) / 100);
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function labelForType(type) {
    return type === "ebooks" ? "Ebook" : "Downloadable Resource";
  }

  function isExternalUrl(href) {
    return /^https?:\/\//i.test(href) || String(href).startsWith("wix:");
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function slugify(value) {
    return clean(value)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
})();
