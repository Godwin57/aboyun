// Generates simple placeholder PWA icons (no dependencies). Replace with real artwork later.
// Run: node scripts/generate-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BG = [0xbe, 0x18, 0x5d]; // theme colour
const FG = [0xff, 0xff, 0xff];

function crc32(buf) {
  let c;
  const table = Array.from({ length: 256 }, (_, n) => {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Solid background with a centred white disc whose radius is `ratio` of the size. */
function png(size, ratio) {
  const rows = [];
  const c = size / 2;
  const r = size * ratio;
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      const inside = (x + 0.5 - c) ** 2 + (y + 0.5 - c) ** 2 <= r * r;
      const [R, G, B] = inside ? FG : BG;
      row[1 + x * 3] = R;
      row[2 + x * 3] = G;
      row[3 + x * 3] = B;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", png(192, 0.32));
writeFileSync("public/icons/icon-512.png", png(512, 0.32));
// Maskable: keep the artwork inside the central 80% safe zone.
writeFileSync("public/icons/maskable-512.png", png(512, 0.24));
// Apple touch icon
writeFileSync("public/icons/apple-touch-icon.png", png(180, 0.32));
console.log("Icons written to public/icons");
