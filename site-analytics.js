(() => {
  "use strict";
  if (window.__EDUREACH_ANALYTICS_CONSENT__) return;
  window.__EDUREACH_ANALYTICS_CONSENT__ = true;

  // GA4 measurement ID identifies a property; it is not a secret.
  const measurementId = "G-FXDS1M5CFN";
  const consentKey = "edureach-analytics-consent";
  const allowed = new Set(["accepted", "declined"]);
  let choice = "";
  try {
    const saved = localStorage.getItem(consentKey);
    if (allowed.has(saved)) choice = saved;
  } catch {}

  function event(name, params = {}) {
    if (choice !== "accepted" || typeof window.gtag !== "function") return;
    window.gtag("event", name, params);
  }

  window.__EDUREACH_ANALYTICS_EVENT__ = event;

  function startAnalytics() {
    window["ga-disable-" + measurementId] = false;
    if (window.__EDUREACH_GTAG_STARTED__) return;
    window.__EDUREACH_GTAG_STARTED__ = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    let safeReferrer = "";
    try {
      const ref = new URL(document.referrer);
      if (ref.protocol === "https:" || ref.protocol === "http:") {
        safeReferrer = ref.origin + ref.pathname;
      }
    } catch {}
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      anonymize_ip: true,
      // Prevent checkout/session/order tokens in query strings entering GA4.
      page_location: window.location.origin + window.location.pathname,
      page_referrer: safeReferrer
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.append(script);
  }

  function choose(value) {
    choice = value;
    try { localStorage.setItem(consentKey, value); } catch {}
    banner.remove();
    if (value === "accepted") startAnalytics();
    if (value === "declined") window["ga-disable-" + measurementId] = true;
    if (value === "declined" && window.gtag) {
      window.gtag("consent", "update", { analytics_storage: "denied" });
    }
    choices.hidden = false;
  }

  const style = document.createElement("style");
  style.textContent = ".edureach-analytics-choice{position:fixed;bottom:1rem;left:1rem;z-index:180;background:#fff;color:#203347;border:1px solid #d8e4ef;border-radius:14px;max-width:min(380px,calc(100% - 2rem));padding:1rem;box-shadow:0 14px 35px #0c31552b;font:14px/1.5 system-ui,sans-serif}.edureach-analytics-choice p{margin:.3rem 0 1rem}.edureach-analytics-choice div{display:flex;gap:.5rem;flex-wrap:wrap}.edureach-analytics-choice button{border:1px solid #063b82;background:#063b82;color:#fff;cursor:pointer;padding:.55rem .8rem;border-radius:8px;font:inherit}.edureach-analytics-choice button:last-child{background:#fff;color:#063b82}.edureach-analytics-manage{position:fixed;bottom:.8rem;left:.8rem;z-index:179;border:1px solid #d4e1ea;border-radius:9px;background:#fff;color:#063b82;padding:.4rem .65rem;font:12px system-ui,sans-serif;cursor:pointer}";
  document.head.append(style);

  const banner = document.createElement("section");
  banner.className = "edureach-analytics-choice";
  banner.setAttribute("aria-label", "Optional website analytics");
  const heading = document.createElement("strong");
  heading.textContent = "Help us improve EduReach";
  const message = document.createElement("p");
  message.textContent = "May we use Google Analytics to count visits and understand which learning resources people find useful? Optional; no customer details are sent in our custom events.";
  const actions = document.createElement("div");
  const accept = document.createElement("button");
  accept.type = "button";
  accept.textContent = "Allow analytics";
  accept.addEventListener("click", () => choose("accepted"));
  const decline = document.createElement("button");
  decline.type = "button";
  decline.textContent = "No thanks";
  decline.addEventListener("click", () => choose("declined"));
  actions.append(accept, decline);
  banner.append(heading, message, actions);
  document.body.append(banner);

  const choices = document.createElement("button");
  choices.className = "edureach-analytics-manage";
  choices.type = "button";
  choices.textContent = "Analytics choices";
  choices.hidden = true;
  choices.addEventListener("click", () => { banner.isConnected || document.body.append(banner); choices.hidden = true; });
  document.body.append(choices);

  if (choice === "accepted") { banner.remove(); startAnalytics(); choices.hidden = false; }
  else if (choice === "declined") { banner.remove(); choices.hidden = false; }

  document.addEventListener("click", e => {
    const element = e.target.closest?.("a,button");
    if (!element) return;
    const href = element.tagName === "A" ? element.getAttribute("href") || "" : "";
    if (/^https:\/\/wa\.me\//i.test(href)) event("generate_lead", { contact_method: "whatsapp" });
    else if (/^mailto:/i.test(href)) event("generate_lead", { contact_method: "email" });
    else if (/^tel:/i.test(href)) event("generate_lead", { contact_method: "phone" });
    else if (/^\/ebooks\/[^/?#]+/.test(href)) event("select_content", { content_type: "ebook" });
    else if (/^\/checkout(?:[?#]|$)/.test(href)) event("begin_checkout");
    const label = String(element.getAttribute("aria-label") || element.textContent || "").slice(0, 100);
    if (element.tagName === "BUTTON" && /add .{0,75} to cart/i.test(label)) {
      event("add_to_cart", { item_category: "ebook" });
    }
  }, { capture: true });
})();