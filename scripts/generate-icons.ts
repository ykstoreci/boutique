import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

async function main() {
  const iconsDir = path.resolve(process.cwd(), "public", "icons");
  await fs.mkdir(iconsDir, { recursive: true });

  const svg = `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="110" fill="#111111"/>
    <!-- Panier stylisé / Boutique -->
    <path d="M150 160 H362 L340 340 H172 Z" stroke="#ffffff" stroke-width="28" stroke-linejoin="round" fill="none"/>
    <path d="M210 160 V130 C210 102 232 80 260 80 C288 80 310 102 310 130 V160" stroke="#ffffff" stroke-width="28" stroke-linecap="round" fill="none"/>
    <circle cx="210" cy="390" r="22" fill="#25D366"/>
    <circle cx="310" cy="390" r="22" fill="#25D366"/>
  </svg>
  `;

  const svgBuffer = Buffer.from(svg);

  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(iconsDir, "icon-512.png"));
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(iconsDir, "icon-192.png"));
  await sharp(svgBuffer).resize(72, 72).png().toFile(path.join(iconsDir, "icon-72.png"));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(iconsDir, "apple-touch-icon.png"));

  console.log("Icônes PWA générées avec succès dans public/icons/");
}

main().catch(console.error);

