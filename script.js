(() => {
  const config = window.EDUREACH_CONFIG || {};
  const body = document.body;
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".primary-nav");
  const navLinks = navigation ? [...navigation.querySelectorAll("a")] : [];
  const whatsappButtons = [...document.querySelectorAll(".js-whatsapp")];
  const emailButtons = [...document.querySelectorAll(".js-email, a[href='mailto:']")];
  const form = document.getElementById("contact-form");
  const formStatus = document.getElementById("form-status");
  const currentYear = document.getElementById("current-year");
  const revealItems = [...document.querySelectorAll(".reveal")];

  const trim = (value) => String(value || "").trim();
  const whatsappNumber = trim(config.whatsappNumber).replace(/[^\d]/g, "");
  const contactEmail = trim(config.contactEmail);
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
    if (!whatsappNumber) return "";
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  // TODO:
  // Update the WhatsApp number in site-config.js.
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

  const formatMessage = (data) => {
    const entries = [
      ["Name", data.get("name")],
      ["Email", data.get("email")],
      ["Phone", data.get("phone")],
      ["School or organisation", data.get("organisation")],
      ["Support needed", data.get("service")],
      ["Message", data.get("message")]
    ];

    return entries
      .map(([label, value]) => [label, trim(value)])
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}: ${value}`)
      .join("\n");
  };

  const openEmailFallback = (name, messageBody) => {
    if (!contactEmail) return false;
    const subject = encodeURIComponent(`EduReach website enquiry from ${name || "Website visitor"}`);
    const bodyText = encodeURIComponent(messageBody);
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${bodyText}`;
    return true;
  };

  const openWhatsAppFallback = (messageBody) => {
    const url = buildWhatsAppUrl(messageBody);
    if (!url) return false;
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  };

  if (form) {
    if (!formEndpoint && !contactEmail && !whatsappNumber) {
      setFormStatus("The form is ready. Add an email, WhatsApp number, or form endpoint in site-config.js to activate sending.");
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        setFormStatus("Please complete the required fields before sending.", "error");
        return;
      }

      const data = new FormData(form);
      if (data.get("website")) return;

      const name = trim(data.get("name")) || "Website visitor";
      const messageBody = formatMessage(data);
      const payload = Object.fromEntries(data.entries());
      delete payload.website;

      if (formEndpoint) {
        setFormStatus("Sending your message...");

        try {
          const response = await fetch(formEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (!response.ok) throw new Error("Form endpoint failed");
          form.reset();
          setFormStatus("Thank you. Your message has been sent.", "success");
          return;
        } catch (error) {
          setFormStatus("The online form could not send. Preparing another contact option instead.", "error");
        }
      }

      if (openEmailFallback(name, messageBody)) {
        form.reset();
        setFormStatus("Your email application is opening with the enquiry prepared.", "success");
        return;
      }

      if (openWhatsAppFallback(messageBody)) {
        form.reset();
        setFormStatus("WhatsApp is opening with the enquiry prepared.", "success");
        return;
      }

      setFormStatus("Add a contact email, WhatsApp number, or form endpoint in site-config.js to activate sending.", "error");
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
