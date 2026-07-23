import { readFile, writeFile } from "node:fs/promises";

const files = {
  html: new URL("../index.html", import.meta.url),
  script: new URL("../script.js", import.meta.url),
  styles: new URL("../styles.css", import.meta.url)
};

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    throw new Error(`Could not apply ${label}: expected source was not found.`);
  }
  return source.replace(before, after);
}

async function optimizeIndex() {
  let html = await readFile(files.html, "utf8");

  html = replaceRequired(
    html,
    '  <link rel="preload" as="image" href="assets/images/hero-inclusive-classroom.png" />',
    `  <link
    rel="preload"
    as="image"
    href="assets/images/hero-inclusive-classroom-1200.webp"
    imagesrcset="assets/images/hero-inclusive-classroom-800.webp 800w, assets/images/hero-inclusive-classroom-1200.webp 1200w, assets/images/hero-inclusive-classroom-1600.webp 1586w"
    imagesizes="100vw"
    type="image/webp"
    fetchpriority="high"
  />`,
    "responsive hero preload"
  );

  html = replaceRequired(
    html,
    `      <img
        class="hero-image"
        src="assets/images/hero-inclusive-classroom.png"
        alt="Teacher supporting diverse learners in a bright classroom"
        width="1600"
        height="1000"
      />`,
    `      <img
        class="hero-image"
        src="assets/images/hero-inclusive-classroom-1200.webp"
        srcset="assets/images/hero-inclusive-classroom-800.webp 800w, assets/images/hero-inclusive-classroom-1200.webp 1200w, assets/images/hero-inclusive-classroom-1600.webp 1586w"
        sizes="100vw"
        alt="Teacher supporting diverse learners in a bright classroom"
        width="1586"
        height="992"
        loading="eager"
        decoding="async"
        fetchpriority="high"
      />`,
    "responsive LCP image"
  );

  html = replaceRequired(
    html,
    `          <img
            src="assets/images/about-learning-support.png"
            alt="Learner receiving individual support during a school activity"
            width="1024"
            height="1536"
            loading="lazy"
            decoding="async"
          />`,
    `          <img
            src="assets/images/about-learning-support-768.webp"
            srcset="assets/images/about-learning-support-480.webp 480w, assets/images/about-learning-support-768.webp 768w, assets/images/about-learning-support-1024.webp 1024w"
            sizes="(min-width: 900px) 42vw, 100vw"
            alt="Learner receiving individual support during a school activity"
            width="1024"
            height="1536"
            loading="lazy"
            decoding="async"
          />`,
    "responsive story image"
  );

  html = replaceRequired(
    html,
    `      <img
        class="cta-image"
        src="assets/images/about-learning-support.png"
        alt=""
        width="1024"
        height="1536"
        loading="lazy"
        decoding="async"
      />`,
    `      <img
        class="cta-image"
        src="assets/images/about-learning-support-1024.webp"
        srcset="assets/images/about-learning-support-480.webp 480w, assets/images/about-learning-support-768.webp 768w, assets/images/about-learning-support-1024.webp 1024w"
        sizes="100vw"
        alt=""
        width="1024"
        height="1536"
        loading="lazy"
        decoding="async"
      />`,
    "responsive consultation image"
  );

  html = replaceRequired(
    html,
    `            <div>
              <dt>Qualifications</dt>
              <dd>
                Master's degree in Educational Psychology with research
                focused on autism</dd>
                </dd>Currently undertaking Phd research focused on cerebral
              </dd>
            </div>`,
    `            <div>
              <dt>Qualifications</dt>
              <dd>
                Master's degree in Educational Psychology with research
                focused on autism
              </dd>
            </div>`,
    "founder definition-list markup"
  );

  const descriptiveLinks = new Map([
    ["/team", "View all EduReach team members"],
    ["/partners", "View all EduReach partners and sponsors"],
    ["/testimonials", "View all EduReach testimonials"],
    ["/resources/articles", "View all EduReach articles"],
    ["/blog", "View all EduReach blog posts"],
    ["/resources/downloads", "View all downloadable EduReach resources"],
    ["/resources/ebooks", "View all EduReach ebooks"],
    ["/resources/gallery", "View all EduReach gallery albums"],
    ["/resources/workshops", "View all EduReach workshop albums"]
  ]);

  for (const [href, label] of descriptiveLinks) {
    html = replaceRequired(
      html,
      `<a class="button button-small button-primary" href="${href}">View All</a>`,
      `<a class="button button-small button-primary" href="${href}" aria-label="${label}">View All</a>`,
      `descriptive label for ${href}`
    );
  }

  html = replaceRequired(
    html,
    `  <script src="site-config.js"></script>
  <script src="cart.js"></script>
  <script src="script.js"></script>
  <script src="cms.js"></script>`,
    `  <script src="site-config.js"></script>
  <script src="cart.js"></script>
  <script src="script.js"></script>
  <script src="deferred-cms.js"></script>`,
    "deferred CMS loading"
  );

  await writeFile(files.html, html);
}

async function optimizeMainScript() {
  let script = await readFile(files.script, "utf8");

  script = replaceRequired(
    script,
    `  const googleAnalyticsId = "G-FXDS1M5CFN";

  if (!window.__EDUREACH_GOOGLE_ANALYTICS_INITIALIZED__) {
    window.__EDUREACH_GOOGLE_ANALYTICS_INITIALIZED__ = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };

    const googleTagScript = document.createElement("script");
    googleTagScript.async = true;
    googleTagScript.src = \`https://www.googletagmanager.com/gtag/js?id=\${googleAnalyticsId}\`;
    document.head.append(googleTagScript);

    window.gtag("js", new Date());
    window.gtag("config", googleAnalyticsId);
  }`,
    `  const googleAnalyticsId = "G-FXDS1M5CFN";
  const analyticsEvents = ["pointerdown", "keydown", "touchstart", "scroll"];

  const initializeGoogleAnalytics = () => {
    if (window.__EDUREACH_GOOGLE_ANALYTICS_INITIALIZED__) return;
    window.__EDUREACH_GOOGLE_ANALYTICS_INITIALIZED__ = true;
    analyticsEvents.forEach((eventName) => {
      window.removeEventListener(eventName, initializeGoogleAnalytics);
    });

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };

    const googleTagScript = document.createElement("script");
    googleTagScript.async = true;
    googleTagScript.src = \`https://www.googletagmanager.com/gtag/js?id=\${googleAnalyticsId}\`;
    document.head.append(googleTagScript);

    window.gtag("js", new Date());
    window.gtag("config", googleAnalyticsId);
  };

  analyticsEvents.forEach((eventName) => {
    window.addEventListener(eventName, initializeGoogleAnalytics, {
      once: true,
      passive: true
    });
  });
  window.setTimeout(initializeGoogleAnalytics, 12000);`,
    "deferred Google Analytics"
  );

  await writeFile(files.script, script);
}

async function optimizeStyles() {
  let styles = await readFile(files.styles, "utf8");
  styles = replaceRequired(
    styles,
    "  --teal: #0f8f8f;",
    "  --teal: #087676;",
    "accessible teal contrast"
  );
  await writeFile(files.styles, styles);
}

await Promise.all([optimizeIndex(), optimizeMainScript(), optimizeStyles()]);
console.log("EduReach static assets optimized for mobile performance and accessibility.");
