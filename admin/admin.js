(() => {
  "use strict";

  const loginView = document.querySelector("[data-login-view]");
  const dashboardView = document.querySelector("[data-dashboard-view]");
  const loginForm = document.querySelector("[data-login-form]");
  const loginMessage = document.querySelector("[data-login-message]");
  const loginButton = document.querySelector("[data-login-button]");
  const passwordInput = document.querySelector("#admin-password");
  const passwordToggle = document.querySelector("[data-password-toggle]");
  const logoutButton = document.querySelector("[data-logout]");
  const refreshButton = document.querySelector("[data-refresh-content]");
  const recentList = document.querySelector("[data-recent-list]");
  const contentCount = document.querySelector("[data-content-count]");
  const cmsStatus = document.querySelector("[data-cms-status]");
  const cmsDot = document.querySelector("[data-cms-dot]");
  const libraryDot = document.querySelector("[data-library-dot]");

  let session = null;

  passwordToggle?.addEventListener("click", () => {
    const showPassword = passwordInput.type === "password";
    passwordInput.type = showPassword ? "text" : "password";
    passwordToggle.textContent = showPassword ? "Hide" : "Show";
    passwordToggle.setAttribute("aria-pressed", String(showPassword));
    passwordInput.focus();
  });

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      setLoginMessage("Enter your admin email and password.", true);
      return;
    }

    setLoginBusy(true);
    setLoginMessage("Checking your details…");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok || !data?.session) {
        setLoginMessage(data?.message || "Sign in was not successful.", true);
        return;
      }

      session = data.session;
      loginForm.reset();
      showDashboard(session);
    } catch {
      setLoginMessage("The admin service could not be reached. Please try again.", true);
    } finally {
      setLoginBusy(false);
    }
  });

  logoutButton?.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: session?.csrfToken ? { "x-edureach-csrf": session.csrfToken } : {}
      });
    } finally {
      session = null;
      showLogin();
      logoutButton.disabled = false;
    }
  });

  refreshButton?.addEventListener("click", () => loadContentSnapshot(true));

  initialise();

  async function initialise() {
    const localDashboardPreview =
      ["terminal.local", "localhost", "127.0.0.1"].includes(window.location.hostname) &&
      new URLSearchParams(window.location.search).get("preview") === "dashboard";

    if (localDashboardPreview) {
      session = {
        name: "EduReach Admin",
        email: "edureach70@gmail.com",
        csrfToken: "local-preview"
      };
      showDashboard(session);
      return;
    }

    loginView.setAttribute("aria-busy", "true");

    try {
      const response = await fetch("/api/admin/session", {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      const data = await response.json();

      if (response.ok && data?.authenticated && data?.session) {
        session = data.session;
        showDashboard(session);
      } else {
        showLogin();
      }
    } catch {
      showLogin();
      setLoginMessage("Sign in to open the admin workspace.");
    } finally {
      loginView.removeAttribute("aria-busy");
    }
  }

  function showDashboard(activeSession) {
    loginView.hidden = true;
    dashboardView.hidden = false;
    document.body.classList.add("dashboard-active");

    const adminName = document.querySelector("[data-admin-name]");
    const dayPeriod = document.querySelector("[data-day-period]");
    if (adminName) adminName.textContent = displayName(activeSession?.name);
    if (dayPeriod) dayPeriod.textContent = getDayPeriod();

    document.title = "Admin Workspace | EduReach";
    dashboardView.querySelector("h1")?.focus?.({ preventScroll: true });
    loadContentSnapshot();
  }

  function showLogin() {
    dashboardView.hidden = true;
    loginView.hidden = false;
    document.body.classList.remove("dashboard-active");
    document.title = "Admin Login | EduReach";
    window.setTimeout(() => document.querySelector("#admin-email")?.focus(), 40);
  }

  async function loadContentSnapshot(force = false) {
    if (force && refreshButton) refreshButton.disabled = true;
    recentList.innerHTML = '<p class="loading-state">Loading published content…</p>';

    const types = ["articles", "blogs", "downloads", "ebooks", "workshops", "gallery"];

    try {
      const statusRequest = fetch("/api/wix-content?status=1", { headers: { Accept: "application/json" } });
      const contentRequests = types.map((type) =>
        fetch(`/api/wix-content?type=${encodeURIComponent(type)}&limit=1`, {
          headers: { Accept: "application/json" }
        }).then(async (response) => ({ type, response, data: await response.json() }))
      );

      const [statusResponse, results] = await Promise.all([
        statusRequest.then(async (response) => ({ response, data: await response.json() })),
        Promise.all(contentRequests)
      ]);

      const cmsHealthy = statusResponse.response.ok && statusResponse.data?.status === "healthy";
      cmsStatus.textContent = cmsHealthy ? "Connected" : "Needs attention";
      cmsDot.classList.toggle("is-live", cmsHealthy);

      const successful = results.filter((result) => result.response.ok && result.data?.configured !== false);
      const totalItems = successful.reduce((total, result) => {
        const paginationTotal = Number(result.data?.pagination?.total);
        return total + (Number.isFinite(paginationTotal) ? paginationTotal : (result.data?.items?.length || 0));
      }, 0);

      contentCount.textContent = `${totalItems} published item${totalItems === 1 ? "" : "s"}`;
      libraryDot.classList.toggle("is-live", successful.length > 0);

      const recentItems = successful
        .flatMap((result) => (result.data?.items || []).map((item) => ({ ...item, sourceType: result.type })))
        .sort((left, right) => Date.parse(right.date || 0) - Date.parse(left.date || 0))
        .slice(0, 6);

      renderRecentItems(recentItems);
    } catch {
      cmsStatus.textContent = "Unavailable";
      contentCount.textContent = "Could not load";
      cmsDot.classList.remove("is-live");
      libraryDot.classList.remove("is-live");
      recentList.innerHTML = '<p class="empty-state">Published content could not be loaded right now. The Wix dashboard is still available.</p>';
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  function renderRecentItems(items) {
    recentList.replaceChildren();

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No published items were returned yet. Use Wix CMS to create the first one.";
      recentList.append(empty);
      return;
    }

    items.forEach((item) => {
      const article = document.createElement("article");
      const identity = document.createElement("div");
      const typeBadge = document.createElement("span");
      const copy = document.createElement("div");
      const title = document.createElement("h3");
      const meta = document.createElement("p");
      const link = document.createElement("a");

      article.className = "recent-item";
      identity.className = "recent-identity";
      typeBadge.className = "recent-type";
      typeBadge.textContent = shortType(item.sourceType);
      title.textContent = item.title || "Untitled item";
      meta.textContent = `${typeLabel(item.sourceType)}${item.date ? ` · ${formatDate(item.date)}` : ""}`;
      link.href = item.detailUrl || publicPath(item.sourceType);
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "View ↗";
      link.setAttribute("aria-label", `View ${item.title || typeLabel(item.sourceType)} on the public website`);

      copy.append(title, meta);
      identity.append(typeBadge, copy);
      article.append(identity, link);
      recentList.append(article);
    });
  }

  function setLoginBusy(busy) {
    loginButton.disabled = busy;
    loginButton.querySelector("span").textContent = busy ? "Signing in…" : "Sign in securely";
    loginForm.setAttribute("aria-busy", String(busy));
  }

  function setLoginMessage(message, isError = false) {
    loginMessage.textContent = message;
    loginMessage.classList.toggle("is-error", isError);
  }

  function displayName(name) {
    const clean = String(name || "Admin").replace(/EduReach/gi, "").trim();
    return clean || "Admin";
  }

  function getDayPeriod() {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  }

  function shortType(type) {
    return ({ articles: "AR", blogs: "BL", downloads: "DL", ebooks: "EB", workshops: "WS", gallery: "GA" })[type] || "ER";
  }

  function typeLabel(type) {
    return ({
      articles: "Article",
      blogs: "Blog post",
      downloads: "Resource",
      ebooks: "Ebook",
      workshops: "Workshop",
      gallery: "Gallery"
    })[type] || "Content";
  }

  function publicPath(type) {
    return ({
      articles: "/resources/articles",
      blogs: "/blog",
      downloads: "/resources/downloads",
      ebooks: "/resources/ebooks",
      workshops: "/resources/workshops",
      gallery: "/resources/gallery"
    })[type] || "/";
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  }
})();
