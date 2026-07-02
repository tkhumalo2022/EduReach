(() => {
  const PAYFAST_SUFFIXES = [".payfast.co.za", ".payfast.io"];
  const FALLBACK_DELAY_MS = 1200;
  const watchedForms = new WeakSet();

  function isPayFastForm(form) {
    if (!(form instanceof HTMLFormElement)) return false;

    try {
      const host = new URL(form.action, window.location.href).hostname.toLowerCase();
      return host === "payfast.co.za" || host === "payfast.io" || PAYFAST_SUFFIXES.some((suffix) => host.endsWith(suffix));
    } catch {
      return false;
    }
  }

  function watchForm(form) {
    if (!isPayFastForm(form) || watchedForms.has(form)) return;
    watchedForms.add(form);
    form.target = "_self";

    window.setTimeout(() => {
      if (!form.isConnected || document.visibilityState === "hidden") return;
      showManualContinue(form);
    }, FALLBACK_DELAY_MS);
  }

  function showManualContinue(form) {
    const checkout = document.querySelector("[data-checkout-page]");
    if (!checkout || checkout.querySelector("[data-payfast-continue]")) return;

    const status = checkout.querySelector(".form-status");
    if (status) {
      status.textContent = "PayFast did not open automatically. Click Continue to PayFast below.";
      status.classList.remove("is-error", "is-success");
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "button button-primary";
    button.dataset.payfastContinue = "true";
    button.textContent = "Continue to PayFast";

    button.addEventListener("click", () => {
      button.disabled = true;
      if (status) status.textContent = "Opening PayFast...";

      form.hidden = false;
      form.style.display = "none";

      const submitter = document.createElement("button");
      submitter.type = "submit";
      submitter.hidden = true;
      form.append(submitter);

      try {
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit(submitter);
        } else {
          HTMLFormElement.prototype.submit.call(form);
        }
      } catch {
        HTMLFormElement.prototype.submit.call(form);
      }

      window.setTimeout(() => {
        if (document.visibilityState === "visible") {
          button.disabled = false;
          if (status) status.textContent = "PayFast is still not opening. Click Continue to PayFast again or try another browser tab.";
        }
      }, 3000);
    });

    if (status) {
      status.insertAdjacentElement("afterend", button);
    } else {
      checkout.append(button);
    }
  }

  document.querySelectorAll("form").forEach(watchForm);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLFormElement) watchForm(node);
        if (node instanceof Element) node.querySelectorAll("form").forEach(watchForm);
      });
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
