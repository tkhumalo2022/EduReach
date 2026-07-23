(() => {
  const cmsTargets = [
    ...document.querySelectorAll("[data-cms-list], [data-cms-detail]")
  ];
  const triggerEvents = ["pointerdown", "keydown", "touchstart", "scroll"];
  let loading = false;
  let observer;
  let fallbackTimer;

  const cleanup = () => {
    triggerEvents.forEach((eventName) => {
      window.removeEventListener(eventName, loadCms);
    });
    observer?.disconnect();
    window.clearTimeout(fallbackTimer);
  };

  const loadCms = () => {
    if (loading || window.__EDUREACH_CMS_LOADING__) return;
    loading = true;
    window.__EDUREACH_CMS_LOADING__ = true;
    cleanup();

    const script = document.createElement("script");
    script.src = "/cms.js";
    script.async = true;
    script.addEventListener("error", () => {
      loading = false;
      window.__EDUREACH_CMS_LOADING__ = false;
    }, { once: true });
    document.body.append(script);
  };

  if (!cmsTargets.length) return;

  triggerEvents.forEach((eventName) => {
    window.addEventListener(eventName, loadCms, {
      once: true,
      passive: true
    });
  });

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadCms();
    }, { rootMargin: "800px 0px" });
    cmsTargets.forEach((target) => observer.observe(target));
  } else {
    loadCms();
    return;
  }

  fallbackTimer = window.setTimeout(loadCms, 12000);
})();
