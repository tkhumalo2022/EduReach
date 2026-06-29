(() => {
  const config = window.SITE_CONFIG || window.EDUREACH_CONFIG || {};
  const body = document.body;
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".primary-nav");
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
