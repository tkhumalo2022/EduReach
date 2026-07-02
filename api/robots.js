import { SITE_ORIGIN } from "../src/lib/seo.js";

const ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /checkout
Disallow: /payment-success
Disallow: /payment-cancelled
Disallow: /api/orders
Disallow: /api/payfast/
Disallow: /admin/
Disallow: /private/

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;

export default function handler(req, res) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.statusCode = 405;
    res.end("Method not allowed.");
    return;
  }

  res.statusCode = 200;
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(req.method === "HEAD" ? "" : ROBOTS_TXT);
}
