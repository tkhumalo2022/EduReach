export const SITE_ORIGIN = "https://edureach.network";
export const DEFAULT_TITLE = "EduReach | Inclusive Education Consultancy";
export const DEFAULT_DESCRIPTION =
  "EduReach supports schools, educators, learners and families through inclusive education training, learner support, research and practical school programmes.";
export const DEFAULT_IMAGE_PATH = "/assets/images/hero-inclusive-classroom.png";

const CONTENT_OG_TYPES = Object.freeze({
  articles: "article",
  blogs: "article",
  downloads: "article",
  ebooks: "book",
  gallery: "website",
  workshops: "website",
  team: "profile",
  partners: "website",
  testimonials: "article"
});

export function canonicalUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);
    return `${SITE_ORIGIN}${normalizePath(url.pathname)}`;
  }

  return `${SITE_ORIGIN}${normalizePath(path)}`;
}

export function absoluteUrl(value = DEFAULT_IMAGE_PATH) {
  const url = String(value || "").trim();
  if (!url) return canonicalUrl(DEFAULT_IMAGE_PATH);
  if (/^https?:\/\//i.test(url)) return url;
  return canonicalUrl(url);
}

export function normalizePath(path = "/") {
  const cleanPath = String(path || "/").trim().split("#")[0].split("?")[0] || "/";
  const prefixed = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  return prefixed.length > 1 ? prefixed.replace(/\/+$/, "") : "/";
}

export function pageTitle(title = DEFAULT_TITLE) {
  const cleanTitle = text(title) || DEFAULT_TITLE;
  return cleanTitle.toLowerCase().includes("edureach") ? cleanTitle : `${cleanTitle} | EduReach`;
}

export function itemSeo(item, type = "") {
  const title = text(item?.seoTitle || item?.title || DEFAULT_TITLE);
  const description = text(item?.seoDescription || item?.excerpt || item?.content || DEFAULT_DESCRIPTION);

  return {
    title,
    pageTitle: pageTitle(title),
    description,
    canonical: canonicalUrl(item?.detailUrl || "/"),
    image: absoluteUrl(item?.image?.url || DEFAULT_IMAGE_PATH),
    ogType: CONTENT_OG_TYPES[type || item?.type] || "website"
  };
}

export function staticSeo({ title, description = DEFAULT_DESCRIPTION, path = "/", image = DEFAULT_IMAGE_PATH, ogType = "website" }) {
  const cleanTitle = text(title || DEFAULT_TITLE);
  const cleanDescription = text(description || DEFAULT_DESCRIPTION);

  return {
    title: cleanTitle,
    pageTitle: pageTitle(cleanTitle),
    description: cleanDescription,
    canonical: canonicalUrl(path),
    image: absoluteUrl(image),
    ogType
  };
}

export function organizationStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "EduReach Inclusive Education Consultancy",
    url: SITE_ORIGIN,
    description: "Inclusive education consultancy supporting schools, educators, learners, families and communities.",
    email: "edureach70@gmail.com",
    telephone: "+27812148384",
    address: {
      "@type": "PostalAddress",
      streetAddress: "12A Chat Crescent",
      addressLocality: "Birdswood",
      addressRegion: "Richards Bay",
      postalCode: "3900",
      addressCountry: "South Africa"
    },
    areaServed: "South Africa"
  };
}

export function contentStructuredData(item, type = "") {
  if (!["articles", "blogs"].includes(type || item?.type)) return null;

  const seo = itemSeo(item, type);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": (type || item?.type) === "blogs" ? "BlogPosting" : "Article",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": seo.canonical
    },
    headline: seo.title,
    description: seo.description,
    url: seo.canonical,
    publisher: {
      "@type": "EducationalOrganization",
      name: "EduReach Inclusive Education Consultancy",
      url: SITE_ORIGIN
    }
  };

  if (item?.image?.url) structuredData.image = [absoluteUrl(item.image.url)];
  if (item?.author) structuredData.author = { "@type": "Person", name: text(item.author) };
  if (item?.date) structuredData.datePublished = item.date;
  if (item?.lastModified || item?.date) structuredData.dateModified = item.lastModified || item.date;

  return structuredData;
}

export function renderSeoTags(meta, structuredData = []) {
  const data = Array.isArray(structuredData) ? structuredData.filter(Boolean) : [structuredData].filter(Boolean);
  const tags = [
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    '<meta name="robots" content="index, follow" />',
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:type" content="${escapeHtml(meta.ogType || "website")}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`
  ];

  data.forEach((entry) => {
    tags.push(`<script type="application/ld+json">${safeJsonScript(entry)}</script>`);
  });

  return tags.join("\n  ");
}

export function injectSeoIntoHtml(html, meta, structuredData = []) {
  const titleTag = `<title>${escapeHtml(meta.pageTitle || meta.title)}</title>`;
  let output = html.includes("<title>")
    ? html.replace(/<title>[\s\S]*?<\/title>/i, titleTag)
    : html.replace("</head>", `  ${titleTag}\n</head>`);

  output = output
    .replace(/\s*<meta\s+name=["']description["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+name=["']robots["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<link\s+rel=["']canonical["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>\s*/gi, "\n");

  return output.replace("</head>", `  ${renderSeoTags(meta, structuredData)}\n</head>`);
}

export function buildSitemapXml(entries) {
  const seen = new Set();
  const urls = [];

  entries.forEach((entry) => {
    const loc = canonicalUrl(entry?.loc || entry?.path || "");
    if (seen.has(loc)) return;
    seen.add(loc);

    const lastmod = validIsoDate(entry?.lastmod);
    const lastmodTag = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : "";
    urls.push(`  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmodTag}\n  </url>`);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escapeXml(value = "") {
  return escapeHtml(value).replace(/'/g, "&apos;");
}

function validIsoDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function safeJsonScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function text(value) {
  if (value == null) return "";
  return String(value).trim();
}
