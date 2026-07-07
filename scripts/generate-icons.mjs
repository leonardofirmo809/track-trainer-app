/**
 * Generates PWA PNG icons by rasterizing public/icon.svg (the real 8020Pace logo).
 * Uses `sharp` (already a project dependency transitively via @cloudflare/vite-plugin's
 * toolchain / node_modules) to render the SVG at each required size.
 * Run: node scripts/generate-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync("public/icon.svg");

async function renderPng(size, outPath) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath}  (${size}×${size})`);
}

await renderPng(192, "public/icon-192.png");
await renderPng(512, "public/icon-512.png");
await renderPng(1024, "public/icon-1024.png");

// Apple's canonical touch-icon size/path (iOS looks for /apple-touch-icon.png
// even without an explicit <link>, and 180×180 is Apple's documented size).
await renderPng(180, "public/apple-touch-icon.png");
