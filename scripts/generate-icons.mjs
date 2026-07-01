/**
 * Generates solid-color PNG icons for PWA manifest.
 * Uses node:zlib (available in Bun) — no extra dependencies.
 * Run: bun scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([lenBuf, t, data, crcBuf]);
}

/** Creates a minimal valid PNG of `size×size` pixels filled with RGB (r,g,b). */
function solidPNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB

  const rowLen = size * 3;
  const raw = Buffer.alloc(size * (rowLen + 1)); // +1 per row for filter byte
  for (let y = 0; y < size; y++) {
    const base = y * (rowLen + 1);
    raw[base] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const px = base + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }

  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public", { recursive: true });

// Brand primary: #1a274a (dark navy-indigo, approximated from oklch(0.28 0.07 265))
const [r, g, b] = [0x1a, 0x27, 0x4a];

writeFileSync("public/icon-192.png", solidPNG(192, r, g, b));
writeFileSync("public/icon-512.png", solidPNG(512, r, g, b));
writeFileSync("public/icon-1024.png", solidPNG(1024, r, g, b));

console.log("✓ public/icon-192.png   (192×192  navy)");
console.log("✓ public/icon-512.png   (512×512  navy)");
console.log("✓ public/icon-1024.png  (1024×1024 navy)");
