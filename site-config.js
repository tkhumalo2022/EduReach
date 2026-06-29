const SITE_CONFIG = {
  phoneDisplay: "+27 81 214 8384",
  phoneTel: "+27812148384",
  whatsappUrl: "https://wa.me/27812148384",
  email: "edureach70@gmail.com",

  // Optional:
  // Add a form service endpoint such as Formspree, Basin or your own API.
  // Leave blank to use the mailto fallback.
  formEndpoint: ""
};

window.SITE_CONFIG = SITE_CONFIG;

window.EDUREACH_CONFIG = {
  phoneDisplay: SITE_CONFIG.phoneDisplay,
  phoneTel: SITE_CONFIG.phoneTel,
  whatsappUrl: SITE_CONFIG.whatsappUrl,
  whatsappNumber: SITE_CONFIG.phoneTel.replace(/[^\d]/g, ""),
  contactEmail: SITE_CONFIG.email,
  formEndpoint: SITE_CONFIG.formEndpoint
};
