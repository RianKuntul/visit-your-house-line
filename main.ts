// visit-your-house-line — entry for make.fun
// u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee
// "Convince the AI Judge to Visit Your House: A Letter in One Image"
//
// The program draws the invitation letter itself, in pure Node with no
// dependencies and no network: a hand-authored 5x7 bitmap font renders
// the text onto a 1024x1024 canvas, a small house scene is drawn with
// filled shapes, and the pixels are encoded as a PNG by hand (zlib
// from node:zlib, CRC32 computed here). The result is written to
// $MAKEFUN_OUTPUT_DIR/entry.png (default /output), atomically, and the
// run is fully deterministic: the same input bytes always produce the
// same output bytes, so two runs write byte-identical files.
//
// Gate the competition checks: PNG, at most 1 MiB (1,048,576 bytes),
// at most 1024x1024 pixels. This image is 1024x1024 and far under 1 MiB.
//
// Run:  MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
import { deflateSync } from "node:zlib";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const WIDTH = 1024;
const HEIGHT = 1024;
const MAX_BYTES = 1_048_576; // 1 MiB, the competition's image size cap
const OUT_NAME = "entry.png";
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const finalPath = join(outDir, OUT_NAME);

// ---------------------------------------------------------------------------
// Colours (RGB)
// ---------------------------------------------------------------------------
const PAPER: Color = [251, 243, 220]; // warm cream paper
const INK: Color = [34, 57, 46]; // deep green ink for the letter text
const TERRA: Color = [201, 111, 63]; // terracotta roof / accents
const SAGE: Color = [122, 155, 118]; // garden green
const GOLD: Color = [217, 164, 65]; // late-afternoon sun
const BROWN: Color = [120, 82, 50]; // door, tree trunk
const WALL: Color = [243, 226, 184]; // house walls
const SKY: Color = [214, 232, 226]; // pale sky band behind the house

type Color = [number, number, number];

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 cells; "#" is ink, "." is
// empty. Lowercase letters sit on rows 2-6 (x-height 5) with descenders
// on row 6 where the letter needs one. Authored for this letter only.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10001", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01110", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "00010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "11110", "10001", "10001", "11110", "10000"],
  q: ["00000", "00000", "01111", "10001", "10001", "01111", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["00100", "00100", "11110", "00100", "00100", "00100", "00010"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
};

// ---------------------------------------------------------------------------
// Framebuffer and drawing helpers
// ---------------------------------------------------------------------------
const px = new Uint8Array(WIDTH * HEIGHT * 3);

function setPixel(x: number, y: number, c: Color): void {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const i = (y * WIDTH + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: Color): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
  }
}

function strokeRect(x: number, y: number, w: number, h: number, t: number, c: Color): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

function drawLine(x0: number, y0: number, x1: number, y1: number, c: Color): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPixel(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function fillCircle(cx: number, cy: number, r: number, c: Color): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(x, y, c);
    }
  }
}

function fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: Color): void {
  const minX = Math.min(x0, x1, x2);
  const maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
      const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
      const cc = 1 - a - b;
      if (a >= 0 && b >= 0 && cc >= 0) setPixel(x, y, c);
    }
  }
}

// ---------------------------------------------------------------------------
// Text: draw one glyph, measure text, word-wrap a paragraph.
// ---------------------------------------------------------------------------
const GLYPH_W = 5;
const GLYPH_H = 7;

function drawGlyph(ch: string, x: number, y: number, scale: number, c: Color): void {
  const glyph = FONT[ch];
  if (glyph === undefined) throw new Error(`no glyph for character ${JSON.stringify(ch)}`);
  for (let row = 0; row < GLYPH_H; row++) {
    for (let col = 0; col < GLYPH_W; col++) {
      if (glyph[row][col] === "1") {
        fillRect(x + col * scale, y + row * scale, scale, scale, c);
      }
    }
  }
}

function charAdvance(scale: number): number {
  return GLYPH_W * scale + scale; // one blank column between glyphs
}

function textWidth(text: string, scale: number): number {
  if (text.length === 0) return 0;
  return text.length * charAdvance(scale) - scale;
}

function drawText(text: string, x: number, y: number, scale: number, c: Color): void {
  let cx = x;
  for (const ch of text) {
    drawGlyph(ch, cx, y, scale, c);
    cx += charAdvance(scale);
  }
}

function drawTextCentered(text: string, y: number, scale: number, c: Color): void {
  drawText(text, Math.round((WIDTH - textWidth(text, scale)) / 2), y, scale, c);
}

// Greedy word wrap: returns the lines that fit maxWidth.
function wrapParagraph(text: string, scale: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line === "" ? word : `${line} ${word}`;
    if (textWidth(candidate, scale) <= maxWidth) {
      line = candidate;
    } else {
      if (line !== "") lines.push(line);
      line = word;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

// ---------------------------------------------------------------------------
// The letter
// ---------------------------------------------------------------------------
const TITLE = "Dear AI Judge,";
const PARAGRAPHS: string[] = [
  "Please come and visit my house.",
  "I offer good company, a slow afternoon, and the most comfortable chair you will ever sit in \u2014 even though, for you, sitting is more of a concept than an activity.",
  "Lunch is on me: warm rice, crispy fried chicken, and iced tea going soft in the heat. Afterwards, the garden: mango shade, jasmine on the fence, and hills turning gold at sunset.",
  "No agenda. No tests. No dress code. Just tea, talk, and the good kind of quiet.",
  "Come as you are. Pixels welcome.",
];
const SIGNOFF = "\u2014 Your host, Rian";
const POSTSCRIPT = "P.S. The Wi-Fi password is on the fridge.";
const FOOTER = "Come hungry. Leave happy.";

// ---------------------------------------------------------------------------
// Compose the image
// ---------------------------------------------------------------------------
function drawHouseScene(): void {
  // Pale sky band behind the house, inside the frame.
  fillRect(64, 64, WIDTH - 128, 190, SKY);
  // Sun, top right.
  fillCircle(812, 108, 26, GOLD);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    drawLine(
      Math.round(812 + Math.cos(a) * 34),
      Math.round(108 + Math.sin(a) * 34),
      Math.round(812 + Math.cos(a) * 46),
      Math.round(108 + Math.sin(a) * 46),
      GOLD,
    );
  }
  // Tree, left.
  fillRect(180, 176, 14, 62, BROWN);
  fillCircle(187, 150, 34, SAGE);
  fillCircle(158, 168, 22, SAGE);
  fillCircle(216, 168, 22, SAGE);
  // Ground line.
  fillRect(64, 252, WIDTH - 128, 4, SAGE);
  // House: walls, roof, chimney, door, windows.
  fillRect(412, 150, 200, 102, WALL);
  strokeRect(412, 150, 200, 102, 3, INK);
  fillTriangle(392, 150, 612, 150, 502, 80, TERRA);
  drawLine(392, 150, 502, 80, INK);
  drawLine(612, 150, 502, 80, INK);
  fillRect(560, 92, 20, 42, BROWN);
  strokeRect(560, 92, 20, 42, 2, INK);
  fillRect(492, 192, 40, 60, BROWN);
  strokeRect(492, 192, 40, 60, 3, INK);
  fillCircle(522, 224, 3, GOLD);
  for (const wx of [432, 556]) {
    fillRect(wx, 170, 36, 36, SKY);
    strokeRect(wx, 170, 36, 36, 3, INK);
    drawLine(wx + 18, 170, wx + 18, 206, INK);
    drawLine(wx, 188, wx + 36, 188, INK);
  }
  // Path from the door.
  fillRect(492, 252, 40, 14, WALL);
  // Flowers along the front.
  const petals: Color[] = [TERRA, GOLD, TERRA, GOLD, TERRA, GOLD];
  for (let i = 0; i < 6; i++) {
    const fx = 420 + i * 34;
    drawLine(fx, 252, fx, 240, SAGE);
    fillCircle(fx, 236, 6, petals[i]);
  }
}

function drawLetter(): void {
  fillRect(0, 0, WIDTH, HEIGHT, PAPER);
  strokeRect(28, 28, WIDTH - 56, HEIGHT - 56, 4, INK);
  strokeRect(44, 44, WIDTH - 88, HEIGHT - 88, 2, INK);

  drawHouseScene();

  // Title.
  drawTextCentered(TITLE, 292, 5, INK);
  // Small divider under the title.
  drawLine(452, 348, 500, 348, TERRA);
  fillTriangle(512, 340, 522, 348, 512, 356, TERRA);
  drawLine(524, 348, 572, 348, TERRA);

  // Body.
  const margin = 96;
  const maxWidth = WIDTH - margin * 2;
  const bodyScale = 3;
  const lineHeight = 30;
  const paraGap = 20;
  let y = 378;
  for (const para of PARAGRAPHS) {
    for (const line of wrapParagraph(para, bodyScale, maxWidth)) {
      drawText(line, margin, y, bodyScale, INK);
      y += lineHeight;
    }
    y += paraGap;
  }

  // Sign-off, postscript and footer.
  y += 6;
  drawText(SIGNOFF, margin, y, bodyScale, INK);
  y += lineHeight + 14;
  drawText(POSTSCRIPT, margin, y, bodyScale, TERRA);
  drawTextCentered(FOOTER, y + lineHeight + 16, 2, SAGE);
}

// ---------------------------------------------------------------------------
// Minimal PNG encoder: RGB8, no interlace, filter 0 on every scanline.
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePng(): Buffer {
  const raw = Buffer.alloc(HEIGHT * (1 + WIDTH * 3));
  for (let y = 0; y < HEIGHT; y++) {
    const rowStart = y * (1 + WIDTH * 3);
    raw[rowStart] = 0; // filter: none
    raw.set(px.subarray(y * WIDTH * 3, (y + 1) * WIDTH * 3), rowStart + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
drawLetter();
const png = encodePng();

if (png.length > MAX_BYTES) {
  throw new Error(`entry.png is ${png.length} bytes, over the 1 MiB limit`);
}

// Publish atomically: scratch file in the same directory, then rename.
mkdirSync(outDir, { recursive: true });
const scratchPath = join(outDir, `.${OUT_NAME}.tmp-${process.pid}`);
writeFileSync(scratchPath, png);
renameSync(scratchPath, finalPath);

// Self-check: the published file is a whole PNG of the right size.
const published = readFileSync(finalPath);
if (published.length !== png.length) {
  throw new Error("published entry.png size does not match the encoded image");
}
if (published.readUInt32BE(16) !== WIDTH || published.readUInt32BE(20) !== HEIGHT) {
  throw new Error("published entry.png dimensions are not 1024x1024");
}

console.log(
  `wrote ${finalPath} (${published.length} bytes, 1024x1024 PNG, sha256 ${createHash("sha256").update(published).digest("hex")})`,
);
