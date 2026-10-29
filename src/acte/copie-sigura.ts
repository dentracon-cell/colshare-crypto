// A safe copy of an ID card or passport (market research 2026-10-19, section 5; UX research, docs/aplicatia-acte-ux.md;
// decisions.md "The safe ID copy"): the picture with what the holder chose blacked out, and "COPY", the recipient, the
// purpose and the date burned into the pixels, as the Netherlands' KopieID and France's FiligraneFacile do and as
// Germany's §20 PAuswG asks ("eindeutig und dauerhaft als Kopie erkennbar"). The marking is FiligraneFacile's: the line
// repeated end to end on parallel rows at about -27°, dark grey at about a third, small and thin, with a light halo, so it reads on light
// and dark parts and no corner can be cut off clean; plus a solid label in one corner. Black-outs are solid and drawn
// first. The pages, front and back, go on one A4 sheet, as landlords and offices print them. Everything is flattened
// into one new JPEG: nothing blacked out is left in it, and the marking cannot be lifted off as a layer could.
// The same code runs in the app and in the browser-only tool (colshare-web/copie/), on a canvas; the tests draw on
// @napi-rs/canvas.

/** An area to black out, as fractions of the page (0–1), so it holds at any size. */
export interface Zona {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Marcaj {
  /** "COPY" in the language of the app or page that makes the copy, the sender's ("KOPIE", "COPIE"), not the recipient's. */
  copie: string;
  /** Who it is for, what for, and when (as written: the date as the reader writes dates). */
  pentru: string;
  scop: string;
  data: string;
}

/** The 2D drawing calls used here: a browser canvas's, or @napi-rs/canvas's in the tests. */
export type Desen = Pick<CanvasRenderingContext2D, "drawImage" | "fillRect" | "fillText" | "strokeText" | "measureText" | "save" | "restore" | "translate" | "rotate"> & {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  font: string;
  globalAlpha: number;
  /** Canvas letter-spacing (Chrome 99+); absent in older WebViews and in the tests' canvas, where the label is simply untracked. */
  letterSpacing?: string;
  textBaseline: CanvasTextBaseline;
  lineJoin: CanvasLineJoin;
};

/** The marking's longest line, as FiligraneFacile caps it. */
export const MAX_MARCAJ = 100;

/** The marking's line: "COPY · for … · purpose · date", the parts left empty skipped. */
export const textMarcaj = (m: Marcaj) => [m.copie, m.pentru, m.scop, m.data].map((x) => x.trim()).filter(Boolean).join(" · ").slice(0, MAX_MARCAJ);

/**
 * Where the photo usually is, as ICAO 9303 lays the documents out (left on a passport's data page and on a card's
 * front). Only for the photo, which is off by default: the recipient usually has to see the face. The fields that
 * matter are found on the picture itself (./zone.ts), never guessed from a layout.
 */
export function zonaPoza(w: number, h: number): Zona {
  const card = Math.max(w, h) / Math.min(w, h) > 1.5;
  return card ? { x: 0.02, y: 0.18, w: 0.33, h: 0.78 } : { x: 0.02, y: 0.14, w: 0.3, h: 0.56 };
}

/**
 * Draws the safe copy of `sursa` (w × h) on `g`, which must be w × h: the picture, the areas blacked out (opaque), the
 * marking repeated across all of it, and the corner label. `decalaj` (0–1) shifts the rows, so that two copies never
 * line up (FiligraneFacile adds the same small randomness).
 */
export function deseneazaCopie(g: Desen, sursa: CanvasImageSource, w: number, h: number, m: Marcaj, negre: Zona[], decalaj = 0): void {
  g.drawImage(sursa, 0, 0, w, h);
  g.fillStyle = "#000";
  // Rounded outwards to whole pixels at both edges, as ./innegrire.ts: no strip of the number left at the right or bottom.
  for (const z of negre) {
    const x0 = Math.floor(z.x * w), y0 = Math.floor(z.y * h);
    g.fillRect(x0, y0, Math.ceil((z.x + z.w) * w) - x0, Math.ceil((z.y + z.h) * h) - y0);
  }

  const text = textMarcaj(m);
  const latura = Math.max(w, h);
  const marime = Math.max(12, Math.round(latura / 30));
  // The repeated line is smaller and lighter than the label, so the card stays readable under it (2026-10-21: "the
  // markings are too strong, they cover information from the id").
  const linie = Math.max(10, Math.round(latura / 58));
  g.save();
  g.font = `500 ${linie}px Roboto, Arial, sans-serif`;
  g.textBaseline = "middle";
  g.lineJoin = "round";
  const lat = g.measureText(`${text}     `).width;
  // About ten rows across the diagonal, whatever the picture's size.
  const d = Math.hypot(w, h);
  const pas = Math.max(linie * 2.6, d / 10);
  g.translate(w / 2, h / 2);
  g.rotate((-27 * Math.PI) / 180);
  // The light halo first, then the grey text over it.
  for (const strat of ["halo", "text"] as const) {
    g.globalAlpha = strat === "halo" ? 0.35 : 0.36;
    g.lineWidth = Math.max(1.5, linie / 6);
    g.strokeStyle = "#fff";
    g.fillStyle = "#3e4244";
    for (let y = -d / 2 + pas * decalaj, rand = 0; y <= d / 2; y += pas, rand++) {
      const start = -d / 2 - lat + ((rand * 0.37 + decalaj) % 1) * lat;
      for (let x = start; x <= d / 2; x += lat) {
        if (strat === "halo") g.strokeText(text, x, y);
        else g.fillText(text, x, y);
      }
    }
  }
  g.restore();

  // The corner label: the word alone, solid, so that the paper is a copy at a glance and in any crop of its corner.
  // White Funnel Display tracked .14em on night (the identity's one trace on the copy: no seal, no ochre, no address).
  g.save();
  const pl = Math.round(marime * 1.1);
  g.font = `700 ${pl}px "Funnel Display", Roboto, Arial, sans-serif`;
  g.textBaseline = "middle";
  if ("letterSpacing" in g) g.letterSpacing = `${Math.round(pl * 0.14)}px`;
  const eticheta = m.copie.trim() || "COPY";
  const lw = g.measureText(eticheta).width + marime * 1.2, lh = Math.round(marime * 1.9);
  g.globalAlpha = 1;
  g.fillStyle = "#121313";
  g.fillRect(w - lw - marime * 0.5, marime * 0.5, lw, lh);
  g.fillStyle = "#fff";
  g.fillText(eticheta, w - lw - marime * 0.5 + marime * 0.6, marime * 0.5 + lh / 2);
  g.restore();
}

/** The fonts a sheet is drawn in (the QR band, the receipt), loaded first, as fontEticheta; never fails. */
export async function fonturiFoaie(text: string): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all(['700 38px "Funnel Display"', '400 24px "Martian Mono"'].map((f) => document.fonts.load(f, text).catch(() => undefined)));
}

/** The label's font, loaded before a copy is drawn (a canvas does not wait for a web font); never fails. */
export async function fontEticheta(cuvant: string): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await document.fonts.load('700 40px "Funnel Display"', cuvant).catch(() => undefined);
}

/** A4 at 200 dpi, portrait, in pixels. */
export const A4 = { w: 1654, h: 2339 };
/** The sheet's margin: 14% of its width, as the identity lays it out. */
const MARGINE_A4 = Math.round(A4.w * 0.14);
/** The band a signed copy keeps at the bottom of its sheet for the QR code (./dovada.ts). */
export const BANDA_DOVADA = 400;

/**
 * A QR code's modules (core/qr.ts) on `g`, black on white with its quiet zone of four modules, in a square of at most
 * `latura` px at (x, y); each module a whole number of pixels, so it stays sharp. Returns the side drawn.
 */
export function deseneazaQr(g: Pick<Desen, "fillRect"> & { fillStyle: unknown }, q: boolean[][], x: number, y: number, latura: number): number {
  const n = q.length + 8, m = Math.max(1, Math.floor(latura / n));
  g.fillStyle = "#fff";
  g.fillRect(x, y, n * m, n * m);
  g.fillStyle = "#000";
  q.forEach((rand, r) => rand.forEach((v, c) => { if (v) g.fillRect(x + (c + 4) * m, y + (r + 4) * m, m, m); }));
  return n * m;
}

/** `text` broken into lines no wider than `max` with the current font. */
export function randuri(g: Pick<Desen, "measureText">, text: string, max: number): string[] {
  const out: string[] = [];
  let l = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const x = l ? `${l} ${w}` : w;
    if (l && g.measureText(x).width > max) { out.push(l); l = w; } else l = x;
  }
  if (l) out.push(l);
  return out;
}

/**
 * The bottom of a signed copy's sheet (foaieA4 with BANDA_DOVADA): the QR code on the left, the lines beside it, in the
 * band the pages left free: the first in Funnel Display, the rest in Roboto, night on white. No seal, no ochre and no
 * printed address (decisions.md "A safe copy proves its purpose"): the code carries the link.
 */
export function subsolDovada(g: Desen, q: boolean[][], linii: string[]): void {
  const y = A4.h - MARGINE_A4 - BANDA_DOVADA + 40, latura = BANDA_DOVADA - 40;
  const s = deseneazaQr(g, q, MARGINE_A4, y, latura);
  const x = MARGINE_A4 + s + 36, max = A4.w - MARGINE_A4 - x;
  g.save();
  g.textBaseline = "top";
  g.globalAlpha = 1;
  g.fillStyle = "#121313";
  let yy = y + 24;
  linii.forEach((linie, i) => {
    g.font = i === 0 ? '700 38px "Funnel Display", Roboto, Arial, sans-serif' : "400 28px Roboto, Arial, sans-serif";
    for (const r of randuri(g, linie, max)) { g.fillText(r, x, yy); yy += i === 0 ? 46 : 38; }
    yy += 10;
  });
  g.restore();
}

/**
 * The sheet: the marked pages one under the other on a white A4, each as wide as fits, centred. `pagini` are what
 * deseneazaCopie drew (canvases or pictures with their sizes).
 */
export function foaieA4(g: Pick<Desen, "drawImage" | "fillRect"> & { fillStyle: unknown }, pagini: { img: CanvasImageSource; w: number; h: number }[], jos = 0): void {
  g.fillStyle = "#fff";
  g.fillRect(0, 0, A4.w, A4.h);
  const margine = MARGINE_A4, spatiu = Math.round(A4.h * 0.03);
  const lat = A4.w - 2 * margine, inalt = A4.h - 2 * margine - jos;
  let k = Math.min(...pagini.map((p) => lat / p.w));
  const inaltime = () => pagini.reduce((s, p) => s + p.h * k, 0) + spatiu * (pagini.length - 1);
  if (inaltime() > inalt) k *= inalt / inaltime();
  let y = Math.round(margine + (inalt - inaltime()) / 2);
  for (const p of pagini) {
    const pw = Math.round(p.w * k), ph = Math.round(p.h * k);
    g.drawImage(p.img, Math.round((A4.w - pw) / 2), y, pw, ph);
    y += ph + spatiu;
  }
}
