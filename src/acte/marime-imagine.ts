// A received picture's size, read from its header before anything decodes it (attack test 2026-10-29, H1): a PNG of
// 389 KB declaring 20000 × 20000 took 2 GB to decode, and a larger one crashed the page. A browser's decoder allocates
// the whole picture before it can be checked, so the check comes first. The format is taken from the bytes, not from
// the declared type: a PNG sent as "image/jpeg" is still a PNG.

/** The most pixels a picture may declare before it is decoded: a phone photo is 12 to 50 million. */
export const MAX_PIXELI = 60_000_000;

const be16 = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const be32 = (b: Uint8Array, i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const le16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const le24 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const ascii = (b: Uint8Array, i: number, s: string) => [...s].every((c, k) => b[i + k] === c.charCodeAt(0));

/** A PNG's, JPEG's or WebP's width and height from its header; undefined for anything else or a header cut short. */
export function marimeImagine(b: Uint8Array): { w: number; h: number } | undefined {
  // PNG: the signature, then IHDR with the width and height.
  if (b.length >= 24 && b[0] === 0x89 && ascii(b, 1, "PNG") && ascii(b, 12, "IHDR")) return { w: be32(b, 16), h: be32(b, 20) };
  // JPEG: the markers in turn up to the first frame header (SOF0–SOF15, not DHT, JPG or DAC).
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: be16(b, i + 7), h: be16(b, i + 5) };
      i += 2 + be16(b, i + 2);
    }
    return undefined;
  }
  // WebP: lossy (VP8), lossless (VP8L) or extended (VP8X, the canvas).
  if (b.length >= 30 && ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP")) {
    if (ascii(b, 12, "VP8 ") && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) return { w: le16(b, 26) & 0x3fff, h: le16(b, 28) & 0x3fff };
    if (ascii(b, 12, "VP8L") && b[20] === 0x2f) {
      const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { w: (v & 0x3fff) + 1, h: ((v >>> 14) & 0x3fff) + 1 };
    }
    if (ascii(b, 12, "VP8X")) return { w: le24(b, 24) + 1, h: le24(b, 27) + 1 };
  }
  return undefined;
}

/** Whether a received picture may be decoded: its header read, its size above zero and within MAX_PIXELI. */
export function imagineSigura(b: Uint8Array): boolean {
  const m = marimeImagine(b);
  return !!m && m.w > 0 && m.h > 0 && m.w * m.h <= MAX_PIXELI;
}
