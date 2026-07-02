(() => {
  const googleAnalyticsId = "G-FXDS1M5CFN";

  if (!window.__EDUREACH_GOOGLE_ANALYTICS_INITIALIZED__) {
    window.__EDUREACH_GOOGLE_ANALYTICS_INITIALIZED__ = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };

    const googleTagScript = document.createElement("script");
    googleTagScript.async = true;
    googleTagScript.src = `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`;
    document.head.append(googleTagScript);

    window.gtag("js", new Date());
    window.gtag("config", googleAnalyticsId);
  }

  const config = window.SITE_CONFIG || window.EDUREACH_CONFIG || {};
  const body = document.body;
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".primary-nav");
  const socialLinks = [
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
  ];

  const injectHeaderSocialLinks = () => {
    if (!navigation || navigation.querySelector(".header-social-links")) return;

    const container = document.createElement("div");
    container.className = "header-social-links";
    container.setAttribute("aria-label", "Follow EduReach on social media");

    socialLinks.forEach((link) => {
      const anchor = document.createElement("a");
      anchor.className = "header-social-link";
      anchor.href = link.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.setAttribute("aria-label", `Follow EduReach on ${link.label}`);
      anchor.innerHTML = link.icon;
      container.append(anchor);
    });

    navigation.append(container);
  };

  injectHeaderSocialLinks();
  const navLinks = navigation ? [...navigation.querySelectorAll("a")] : [];
  const whatsappButtons = [...document.querySelectorAll(".js-whatsapp")];
  const emailButtons = [...document.querySelectorAll(".js-email, a[href^='mailto:']")];
  const form = document.getElementById("contact-form");
  const formStatus = document.getElementById("form-status");
  const currentYear = document.getElementById("current-year");
  const revealItems = [...document.querySelectorAll(".reveal")];
  const faqToggle = document.getElementById("faq-toggle");
  const faqWidget = document.getElementById("faq-widget");
  const faqClose = document.getElementById("faq-close");
  const faqQuestions = document.querySelectorAll(".faq-question");

  const trim = (value) => String(value || "").trim();
  const phoneTel = trim(config.phoneTel).replace(/[^\d+]/g, "");
  const whatsappUrl = trim(config.whatsappUrl);
  const whatsappNumber = trim(config.whatsappNumber || phoneTel).replace(/[^\d]/g, "");
  const contactEmail = trim(config.email || config.contactEmail);
  const formEndpoint = trim(config.formEndpoint);
  const defaultWhatsAppMessage = "Hello EduReach, I would like to book a consultation about inclusive education support.";

  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }

  const closeMenu = () => {
    if (!menuButton || !navigation) return;
    navigation.classList.remove("open");
    body.classList.remove("nav-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation menu");
  };

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      const isOpen = navigation.classList.toggle("open");
      body.classList.toggle("nav-open", isOpen);
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  const buildWhatsAppUrl = (message) => {
    const baseUrl = whatsappUrl || (whatsappNumber ? `https://wa.me/${whatsappNumber}` : "");
    if (!baseUrl) return "";
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}text=${encodeURIComponent(message)}`;
  };

  whatsappButtons.forEach((button) => {
    const url = buildWhatsAppUrl(defaultWhatsAppMessage);

    if (url) {
      button.href = url;
      button.target = "_blank";
      button.rel = "noopener noreferrer";
    } else {
      button.href = "#contact";
      button.title = "Add your WhatsApp number in site-config.js to activate this button.";
    }
  });

  const closeFaq = () => {
    if (!faqWidget || !faqToggle) return;
    faqWidget.classList.remove("is-open");
    faqWidget.setAttribute("aria-hidden", "true");
    faqToggle.setAttribute("aria-expanded", "false");
  };

  if (faqToggle && faqWidget && faqClose) {
    faqToggle.addEventListener("click", () => {
      faqWidget.classList.add("is-open");
      faqWidget.setAttribute("aria-hidden", "false");
      faqToggle.setAttribute("aria-expanded", "true");
    });

    faqClose.addEventListener("click", closeFaq);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeFaq();
    });
  }

  faqQuestions.forEach((question) => {
    question.setAttribute("aria-expanded", "false");

    question.addEventListener("click", () => {
      const isActive = question.classList.toggle("is-active");
      question.setAttribute("aria-expanded", String(isActive));
    });
  });

  emailButtons.forEach((button) => {
    if (contactEmail) {
      button.href = `mailto:${contactEmail}`;
    } else {
      button.href = "#contact";
      button.title = "Add your contact email in site-config.js to activate this button.";
    }
  });

  const setFormStatus = (message, type = "info") => {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.classList.toggle("is-error", type === "error");
    formStatus.classList.toggle("is-success", type === "success");
  };

  if (form) {
    if (!formEndpoint) {
      setFormStatus("The contact form is not configured yet. Please try again later.", "error");
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!formEndpoint) {
        setFormStatus("The contact form is not configured yet. Please try again later.", "error");
        return;
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        setFormStatus("Please complete the required fields before sending.", "error");
        return;
      }

      const data = new FormData(form);
      if (data.get("website")) return;

      const payload = Object.fromEntries(data.entries());
      delete payload.website;

      setFormStatus("Sending your message...");

      try {
        const response = await fetch(formEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => null);

        if (!response.ok || result?.ok === false) {
          throw new Error("Form endpoint failed");
        }

        form.reset();
        setFormStatus("Thank you. Your message has been sent.", "success");
      } catch (error) {
        setFormStatus("We could not send your message right now. Please try again later.", "error");
      }
    });
  }

  const sections = [...document.querySelectorAll("main section[id]")];
  const headerLinks = [...document.querySelectorAll('.primary-nav a[href^="#"]:not(.button)')];

  if ("IntersectionObserver" in window && sections.length) {
    const navObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      headerLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${visible.target.id}`;
        link.toggleAttribute("aria-current", isActive);
        if (isActive) link.setAttribute("aria-current", "page");
      });
    }, { rootMargin: "-35% 0px -55% 0px", threshold: [0.05, 0.25, 0.5] });

    sections.forEach((section) => navObserver.observe(section));
  }

  if ("IntersectionObserver" in window && revealItems.length) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }
})();