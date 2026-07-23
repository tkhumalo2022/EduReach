import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourceDirectory = new URL("./optimized-assets/", import.meta.url);
const destinationDirectory = new URL("../assets/images/", import.meta.url);
const assets = [
  "hero-inclusive-classroom-800.webp",
  "hero-inclusive-classroom-1200.webp",
  "hero-inclusive-classroom-1600.webp",
  "about-learning-support-480.webp",
  "about-learning-support-768.webp",
  "about-learning-support-1024.webp"
];

await mkdir(destinationDirectory, { recursive: true });

for (const asset of assets) {
  const encoded = await readFile(new URL(`${asset}.b64`, sourceDirectory), "utf8");
  await writeFile(new URL(asset, destinationDirectory), Buffer.from(encoded.trim(), "base64"));
}

console.log(`Wrote ${assets.length} responsive WebP assets.`);
