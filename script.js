(() => {
  const config = window.EDUREACH_CONFIG || {};
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.primary-nav');
  const navLinks = navigation ? navigation.querySelectorAll('a') : [];
  const whatsappButtons = document.querySelectorAll('.js-whatsapp');
  const form = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');
  const currentYear = document.getElementById('current-year');

  if (currentYear) currentYear.textContent = new Date().getFullYear();

  if (menuButton && navigation) {
    menuButton.addEventListener('click', () => {
      const isOpen = navigation.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        navigation.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const whatsappMessage = encodeURIComponent("Hello EduReach, I'd like to learn more about your inclusive education services.");
  whatsappButtons.forEach((button) => {
    if (config.whatsappNumber) {
      button.href = `https://wa.me/${config.whatsappNumber}?text=${whatsappMessage}`;
      button.target = '_blank';
      button.rel = 'noopener noreferrer';
    } else {
      button.href = '#contact';
      button.title = 'Add your WhatsApp number in site-config.js to activate this button.';
    }
  });

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = new FormData(form);
      const name = data.get('name');
      const email = data.get('email');
      const message = data.get('message');

      if (!config.contactEmail) {
        formStatus.textContent = 'The form is ready. Add your contact email in site-config.js to activate sending.';
        return;
      }

      const subject = encodeURIComponent(`EduReach website enquiry from ${name}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
      window.location.href = `mailto:${config.contactEmail}?subject=${subject}&body=${body}`;
      formStatus.textContent = 'Your email application is opening.';
      form.reset();
    });
  }

  const sections = [...document.querySelectorAll('main section[id], header[id]')];
  const headerLinks = [...document.querySelectorAll('.primary-nav a[href^="#"]:not(.button)')];

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      headerLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`);
      });
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0.05, 0.25, 0.5] });
    sections.forEach((section) => observer.observe(section));
  }
})();
