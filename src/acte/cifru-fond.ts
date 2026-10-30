// The ciphertext field in the app (docs/decisions.md 2026-10-23, "Colshare's app takes the site's material"):
// colshare.app's field of base64 (colshare-web/home/fond.js cifru()) without the pointer. Characters fill the canvas
// from the left; while the app is encrypting (`activ`), a band at -27° crosses it every couple of seconds, lighting
// what it passes in ochre and stirring the bytes under it. `text` is the real ciphertext when there is one (the chunk
// being sent); else the field is drawn from a fixed hash. Still with reduced motion; frames only while it moves.
// A scramble (`unda`, the desk's lock) starts at a point and spreads fast: each character it reaches runs through
// others, a little brighter, for a second or so of its own, then settles on a new value, one after another, as falling
// dominoes do. Several scrambles overlap while the dial keeps turning, so most of the field churns at once.

import { culoriMaterial, faraMiscare } from "./material.ts";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const hash = (n: number) => { const t = Math.sin(n) * 43758.5453; return t - Math.floor(t); };
const LAT = 9.6, INALT = 18, UMPLE = 900, TRECE = 2200;
const PANTA = Math.tan((27 * Math.PI) / 180);
/**
 * How fast a scramble spreads (px per ms), how ragged its edge is (px, each cell its own delay), how long a character
 * runs through others once reached (ms, at least, plus up to AMESTEC_IN_PLUS of its own), and how often it changes (ms).
 */
const UNDA_VITEZA = 1.5, UNDA_ZIMTI = 120, AMESTEC = 650, AMESTEC_IN_PLUS = 900, SCHIMB = 55;

export interface OptiuniCifru {
  /** The bytes shown, base64; repeated to fill the field. */
  text?: string;
  /** Encrypting now: the band crosses the field until the canvas goes. */
  activ?: boolean;
  /** Fill from the left (the first time this field is shown); otherwise it is full at once. */
  umple?: boolean;
  /** The characters' strength at rest. */
  alfa?: number;
}

/** Stops the field's frames; `unda` starts a wave at (x, y), in the canvas's own pixels. */
export type CampCifru = (() => void) & { unda(x: number, y: number): void };

/** Draws the field on `c` at its laid-out size. */
export function cifruFond(c: HTMLCanvasElement, o: OptiuniCifru = {}): CampCifru {
  const r = c.getBoundingClientRect(), ctx = c.getContext("2d");
  const W = r.width, H = r.height;
  if (!W || !H || !ctx) return Object.assign(() => {}, { unda: () => {} });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const col = Math.ceil(W / LAT) + 1, rand = Math.ceil(H / INALT) + 1;
  const text = o.text && o.text.length > 8 ? o.text : Array.from({ length: 997 }, (_, i) => B64[Math.floor(hash(i * 3.3 + 0.7) * 64)]).join("");
  const alfa = o.alfa ?? 0.1;
  const misca = !faraMiscare();
  const { ovaz: OVAZ, ocru: OCRU } = culoriMaterial(c);
  const t0 = performance.now();
  let cadru = 0, oprit = false;
  // The waves running now, and how many have crossed the whole field: a character's value is the count of waves
  // that have passed it.
  let unde: { x: number; y: number; t0: number }[] = [], trecute = 0;
  // A scramble is over once its edge has crossed the field and the last character it reached has settled.
  const durata = (Math.hypot(W, H) + UNDA_ZIMTI) / UNDA_VITEZA + AMESTEC + AMESTEC_IN_PLUS;

  const deseneaza = (acum: number) => {
    cadru = 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = `400 11px "Martian Mono", ui-monospace, monospace`;
    ctx.textBaseline = "top";
    // Neighbours of the same strength and colour go out as one string, spaced to the grid: a character at a time was
    // most of each frame on a phone, and the animations stuttered (profile 2026-10-25). Without letterSpacing (older
    // browsers), a character at a time as before.
    const siruri = typeof (ctx as { letterSpacing?: string }).letterSpacing === "string";
    if (siruri) { ctx.letterSpacing = "0px"; ctx.letterSpacing = `${LAT - ctx.measureText("M").width}px`; }
    let sir = "", sx = 0, sa = -1, so = false, culoare = "";
    const scrie = (py: number) => {
      if (!sir) return;
      ctx.globalAlpha = sa;
      ctx.fillText(sir, sx, py);
      sir = "";
    };
    const p = o.umple && misca ? (acum - t0) / UMPLE : 2;
    // The band: a -27° line moving left to right across the field and a little beyond, once per TRECE.
    const faza = ((acum % TRECE) / TRECE) * (W + H * PANTA + 160) - 80;
    // A wave that has crossed everything is folded into the count.
    for (const u of unde) if (acum - u.t0 > durata) trecute++;
    unde = unde.filter((u) => acum - u.t0 <= durata);
    let viu = p < 1.4 || unde.length > 0;
    for (let y = 0; y < rand; y++) {
      const py = y * INALT;
      for (let x = 0; x < col; x++) {
        const i = y * col + x, px = x * LAT;
        let ch = text[i % text.length], a = alfa, ocru = false;
        const f = (p - (x / col) * 0.8 - hash(y * 31.7 + x * 7.3) * 0.12) * 5;
        if (f <= 0) { scrie(py); continue; }
        if (f < 1) { a = 0.45; ch = B64[Math.floor(hash(i + acum * 0.01) * 64)]; }
        else if (trecute || unde.length) {
          // Reached a little before or after the edge, then running for a time of its own: the scrambles that have
          // let it settle set its character; one still running keeps it changing.
          const intarziere = hash(i * 1.93 + 0.41) * UNDA_ZIMTI, tine = AMESTEC + hash(i * 4.37 + 2.1) * AMESTEC_IN_PLUS;
          let n = trecute, ruleaza = -1;
          for (const u of unde) {
            const atins = u.t0 + (Math.hypot(px - u.x, py - u.y) + intarziere) / UNDA_VITEZA;
            if (acum >= atins + tine) n++;
            else if (acum >= atins) ruleaza = Math.max(ruleaza, (acum - atins) / tine);
          }
          ch = n ? B64[Math.floor(hash(i * 7.7 + n * 13.1) * 64)] : ch;
          if (ruleaza >= 0) {
            // Running: a new character every few frames, each cell on its own beat, bright at first and calming down.
            a = alfa + (Math.min(0.7, alfa * 3.6) - alfa) * (1 - ruleaza * 0.7) * (0.6 + 0.4 * hash(i * 9.1 + Math.floor(acum / SCHIMB)));
            ch = B64[Math.floor(hash(i * 3.1 + Math.floor((acum + hash(i * 6.3) * SCHIMB) / SCHIMB)) * 64)];
          }
        }
        if (o.activ && misca) {
          // Distance from the band, measured across it.
          const d = Math.abs(px + (H - py) * PANTA - faza);
          if (d < 46) { a = Math.max(a, 0.85 - d / 60); ocru = d < 30; if (d < 14) ch = B64[Math.floor(hash(i * 3.1 + Math.floor(acum / 70)) * 64)]; }
          viu = true;
        }
        if (!siruri) { ctx.fillStyle = `rgba(${ocru ? OCRU : OVAZ},${a})`; ctx.fillText(ch, px, py); continue; }
        if (sir && (a !== sa || ocru !== so)) scrie(py);
        if (!sir) {
          sx = px; sa = a; so = ocru;
          const cul = ocru ? OCRU : OVAZ;
          if (cul !== culoare) { culoare = cul; ctx.fillStyle = `rgb(${cul})`; }
        }
        sir += ch;
      }
      scrie(py);
    }
    ctx.globalAlpha = 1;
    if (viu && !oprit && misca) cadru = requestAnimationFrame(deseneaza);
  };
  deseneaza(t0);
  return Object.assign(() => { oprit = true; cancelAnimationFrame(cadru); }, {
    unda(x: number, y: number) {
      if (!misca || oprit) return;
      unde.push({ x, y, t0: performance.now() });
      if (!cadru) cadru = requestAnimationFrame(deseneaza);
    },
  });
}
