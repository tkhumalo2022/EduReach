import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const indexPath = "index.html";
const previewUrl = "https://edureach.network/assets/images/social-preview.png";
let html = await readFile(indexPath, "utf8");

html = html
  .replaceAll("https://edureach.network/assets/images/hero-inclusive-classroom.png", previewUrl)
  .replace(
    `  <meta property="og:image" content="${previewUrl}" />`,
    `  <meta property="og:image" content="${previewUrl}" />\n  <meta property="og:image:width" content="1200" />\n  <meta property="og:image:height" content="630" />\n  <meta property="og:image:alt" content="EduReach inclusive education consultancy homepage" />`,
  );

if (!html.includes('"image": "https://edureach.network/assets/images/social-preview.png"')) {
  html = html.replace(
    '      "url": "https://edureach.network",',
    '      "url": "https://edureach.network",\n      "image": "https://edureach.network/assets/images/social-preview.png",',
  );
}

await writeFile(indexPath, html);
await mkdir("assets/images", { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.goto("https://edureach.network/", { waitUntil: "networkidle", timeout: 120_000 });
  await page.addStyleTag({
    content: `
      *,*::before,*::after{animation:none!important;transition:none!important}
      [class*="cookie"],[id*="cookie"],[class*="chat"],[id*="chat"],
      [class*="whatsapp"],[aria-label*="WhatsApp"]{visibility:hidden!important}
    `,
  });
  await page.screenshot({ path: "assets/images/social-preview.png", type: "png" });
} finally {
  await browser.close();
}
