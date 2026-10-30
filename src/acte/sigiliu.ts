// Colshare's seal, the Inlay (Colshare/colshare_seal_update, README "Seal — Inlay"): an ochre ring around a night face
// engraved with lines at -27°, the angle of the safe copy's marking. The slit is one line left out of the engraving
// and runs edge to edge through ring and face; it is a real gap, the colour of whatever is behind the seal. The same
// shape tells a link's state (kept, sent, opened, expired) and plays the one brand animation, "the seal opens".
// Pure geometry, drawn as filled paths (no masks, no clip paths): the app, the link pages, the wordmark, the Android
// vectors (scripts/colshare-imagini.mjs) and the tests all draw from here.
import { INEL } from "./inel-cale.ts";
import { MARCA } from "./marca-cale.ts";

/** A link's life told with the seal: kept (no slit), sent (the slit: the logo), opened (halves parted), expired (outline). */
export type StareSigiliu = "intreg" | "taiat" | "deschis" | "expirat";
/** The three cuts: fine engraving from 120 px, bold from 32 px, below that one heavy line each side of a wider slit. */
export type Taietura = "fin" | "gros" | "mic";

/** Everything is measured in a 100-unit box, centre (50, 50); the seal's diameter D is 92 of it. */
export const D = 92;
const O = { x: 50, y: 50 };
export const R_INEL = 46;
const UNGHI = (27 * Math.PI) / 180;
/** Along the slit (rising to the right on screen, y down) and its normal (pointing down-right). */
const U = { x: Math.cos(UNGHI), y: -Math.sin(UNGHI) };
const N = { x: Math.sin(UNGHI), y: Math.cos(UNGHI) };
/** The slit's centre line, 0.04 D above the seal's centre, as an offset along N. */
export const T_FANTA = -3.7;
/** How far each half moves along the normal once opened: 4 % of D. */
export const DEPARTARE = 0.04 * D;

interface Geometrie {
  /** The night face's radius, and the circle the engraving is clipped to (the night channel between the two). */
  fata: number; gravura: number;
  /** The slit's width, a line's width, the first line's centre from the slit's centre line, the pitch, lines per side. */
  fanta: number; linie: number; prima: number; pas: number; cate: number;
}
const GEOMETRIE: Record<Taietura, Geometrie> = {
  fin: { fata: 38.6, gravura: 36.2, fanta: 8.3, linie: 1.45, prima: 8.3 / 2 + 1.45 / 2, pas: 3.2, cate: 99 },
  gros: { fata: 38, gravura: 35.6, fanta: 8.3, linie: 2.9, prima: 8.3 / 2 + 2.9 / 2, pas: 6.2, cate: 99 },
  mic: { fata: 33, gravura: 27.5, fanta: 12, linie: 11.5, prima: 16.95, pas: 0, cate: 1 },
};
export const geometrie = (t: Taietura): Readonly<Geometrie> => GEOMETRIE[t];

/** The cut for a seal drawn `px` wide (its diameter D on screen). */
export const taietura = (px: number): Taietura => (px >= 120 ? "fin" : px >= 32 ? "gros" : "mic");

const r2 = (n: number) => Math.round(n * 1000) / 1000;
const punct = (t: number, s: number) => ({ x: O.x + t * N.x + s * U.x, y: O.y + t * N.y + s * U.y });
const pt = (p: { x: number; y: number }) => `${r2(p.x)} ${r2(p.y)}`;

/** The arc of the circle of radius r round O from P to Q through M, as an SVG "A" command. */
function arc(r: number, p: { x: number; y: number }, m: { x: number; y: number }, q: { x: number; y: number }): string {
  const a = (v: { x: number; y: number }) => Math.atan2(v.y - O.y, v.x - O.x);
  const cruce = (p.x - O.x) * (m.y - O.y) - (p.y - O.y) * (m.x - O.x);
  const sens = cruce > 0 ? 1 : 0;
  const pozitiv = (x: number) => ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const intindere = sens ? pozitiv(a(q) - a(p)) : pozitiv(a(p) - a(q));
  return `A${r2(r)} ${r2(r)} 0 ${intindere > Math.PI ? 1 : 0} ${sens} ${pt(q)}`;
}

/** The part of the disc of radius r between the offsets t1 and t2 along N: a band, or a segment; "" when empty. */
export function banda(r: number, t1: number, t2: number): string {
  const a = Math.max(t1, -r), b = Math.min(t2, r);
  if (a >= b) return "";
  const h = (t: number) => Math.sqrt(Math.max(0, r * r - t * t));
  const m = (a + b) / 2;
  // Along the chord at a, the arc on the +U side up to b, back along the chord at b, the arc on the -U side down to a.
  const a1 = punct(a, -h(a)), a2 = punct(a, h(a)), b2 = punct(b, h(b)), b1 = punct(b, -h(b));
  return `M${pt(a1)}L${pt(a2)}${arc(r, a2, punct(m, h(m)), b2)}L${pt(b1)}${arc(r, b1, punct(m, -h(m)), a1)}Z`;
}

/** The ring (between the face and the edge) on the far side of the offset `t` along N: `semn` -1 before it, 1 after. */
function inel(r: number, t: number, semn: -1 | 1): string {
  const h = (rr: number) => Math.sqrt(rr * rr - t * t);
  const capat = semn * R_INEL, capatFata = semn * r;
  const o1 = punct(t, -h(R_INEL)), o2 = punct(t, h(R_INEL)), i1 = punct(t, -h(r)), i2 = punct(t, h(r));
  return `M${pt(o1)}${arc(R_INEL, o1, punct(capat, 0), o2)}L${pt(i2)}${arc(r, i2, punct(capatFata, 0), i1)}Z`;
}

/** One side of the seal as paths: the ring, the night face, the engraving's lines. */
export interface Piese { inel: string; fata: string; linii: string }

/** The seal cut along its slit, [upper, lower]; with `fara` the uncut seal as one side (the lines stay where they are). */
export function piese(t: Taietura, fara = false): Piese[] {
  const g = GEOMETRIE[t], hw = g.fanta / 2;
  const linii = (semn: -1 | 1) => {
    const d: string[] = [];
    for (let k = 0; k < g.cate; k++) {
      const c = T_FANTA + semn * (g.prima + k * g.pas);
      const b = banda(g.gravura, c - g.linie / 2, c + g.linie / 2);
      if (!b) break;
      d.push(b);
    }
    return d.join("");
  };
  if (fara) {
    // The whole ring: the outer circle and the face's circle, the second drawn the other way round (nonzero fill).
    const cerc = (r: number, sens: 0 | 1) => `M${50 - r} 50A${r} ${r} 0 1 ${sens} ${50 + r} 50A${r} ${r} 0 1 ${sens} ${50 - r} 50Z`;
    return [{ inel: cerc(R_INEL, 1) + cerc(g.fata, 0), fata: cerc(g.fata, 1), linii: linii(-1) + linii(1) }];
  }
  return [
    { inel: inel(g.fata, T_FANTA - hw, -1), fata: banda(g.fata, -g.fata, T_FANTA - hw), linii: linii(-1) },
    { inel: inel(g.fata, T_FANTA + hw, 1), fata: banda(g.fata, T_FANTA + hw, g.fata), linii: linii(1) },
  ];
}

/**
 * COL, Cipher · Obfuscation · Lock (decisions.md 2026-10-22): engraved tone on tone in the fine cut's ring, like the
 * lettering on a coin's rim, the upper arc and the lower arc each side of the slit. English on every page, never
 * translated. Only the fine cut (120 px and up) carries it; the bold and small cuts, the icon and the favicon stay bare.
 */
export const COL_INEL = ["CIPHER · OBFUSCATION · LOCK", "AES-256 · COLSHARE"] as const;
/** The darker ochre the letters are cut in, on night and on paper alike. */
export const COL_CULOARE = "#A9771A";

/**
 * The two arcs the engraving runs along, in degrees round the centre (0° to the right, clockwise on screen): the upper
 * one over the top from its left end, at the ring's middle (the letters centred on it, tops outward); the lower one
 * under the bottom from its left end, 0.5 inside the edge, the letters' baseline `dy` further in (tops toward the
 * centre; spaced along the arc, then moved in, as SVG text on a path with dy is). Each stops 11° short of
 * where the ring's middle meets the slit's edges, which are worked out from T_FANTA (the slit is off centre).
 * scripts/colshare-inel.mjs lays the letters along them.
 */
export function arceInel() {
  const g = GEOMETRIE.fin, hw = g.fanta / 2, rm = (R_INEL + g.fata) / 2, LIBER = 11;
  const grade = (t: number, s: number) => { const p = punct(t, s); return (Math.atan2(p.y - O.y, p.x - O.x) * 180) / Math.PI; };
  const h = (t: number) => Math.sqrt(rm * rm - t * t);
  const pozitiv = (a: number) => ((a % 360) + 360) % 360;
  return {
    sus: { r: rm, de: pozitiv(grade(T_FANTA - hw, -h(T_FANTA - hw))) + LIBER, la: pozitiv(grade(T_FANTA - hw, h(T_FANTA - hw))) - LIBER },
    jos: { r: rm + 3.2, dy: -1.6, de: pozitiv(grade(T_FANTA + hw, -h(T_FANTA + hw))) - LIBER, la: pozitiv(grade(T_FANTA + hw, h(T_FANTA + hw))) - 360 + LIBER },
  };
}

/**
 * The engraving as SVG, [upper half, lower half], in the 100-unit box: the letters outlined in Martian Mono 500
 * (./inel-cale.ts), so it looks the same in a browser, the app, a file and on canvas, with no font to load.
 */
export function inscriptieInel(culoare: string = COL_CULOARE): [string, string] {
  return [`<path class="col-inel" fill="${culoare}" d="${INEL.sus}"/>`, `<path class="col-inel" fill="${culoare}" d="${INEL.jos}"/>`];
}

/** Full colour: the face stays night on every background. One colour: the face drops out, the ground shows through. */
export type Culori = "plin" | "unu";
const NOAPTE = "#121313";

/** A side of the seal as SVG, the ring and lines in currentColor. */
const parte = (p: Piese, culori: Culori) =>
  `<path d="${p.inel}"/>${culori === "plin" ? `<path fill="${NOAPTE}" d="${p.fata}"/>` : ""}<path d="${p.linii}"/>`;

/** The engraving each half carries, [upper, lower]: the fine cut in full colour only (one colour is one ink). */
const col = (t: Taietura, culori: Culori): [string, string] => (t === "fin" && culori === "plin" ? inscriptieInel() : ["", ""]);

/** The offset of a half along the normal: upper half up-left (semn -1), lower half down-right. */
const deplasare = (cat: number, semn: -1 | 1) => ({ x: r2(semn * cat * N.x), y: r2(semn * cat * N.y) });

/**
 * The wordmark at a font size of `px` (the outlines of scripts/colshare-marca.mjs): the letters in currentColor, the
 * seal in the class .sigiliu's colour (the ochre) in place of the "o", the bold cut from 56 px type, the small one
 * below. Named for screen readers.
 */
export function marcaSvg(px: number, nume = "Colshare", culori: Culori = "plin"): string {
  const [x, y, w, h] = MARCA.vb, s = MARCA.sigiliu;
  return `<svg class="marca-svg" viewBox="${x} ${y} ${w} ${h}" width="${r2((w * px) / 100)}" height="${r2((h * px) / 100)}" role="img" aria-label="${nume}"><path d="${MARCA.litere}"/>${sigiliuInMarca(px, culori)}</svg>`;
  function sigiliuInMarca(marime: number, c: Culori) {
    const k = s.d / D;
    const p = piese(marime >= 56 ? "gros" : "mic");
    return `<g class="sigiliu" transform="translate(${r2(s.x - 4 * k)} ${r2(s.y - 4 * k)}) scale(${r2(k)})">${p.map((q) => parte(q, c)).join("")}</g>`;
  }
}

interface Optiuni {
  /** The seal's diameter on screen in px (picks the cut and the outline's stroke); default 44. */
  px?: number;
  /** Extra classes on the svg. */
  clasa?: string;
  /** "deschis": start from the closed seal and play the opening once (CSS .sigiliu.anim); "taiat": play the cut once
   *  (CSS .sigiliu.taie). Reduced motion shows the end. */
  anim?: boolean;
  /** Accessible name; without one the seal is decorative. */
  eticheta?: string;
  /** Full colour (default) or one colour (on ochre, print). */
  culori?: Culori;
}

/**
 * The seal as inline SVG, ring and engraving in currentColor (the page sets the ochre). Opened halves move outside the
 * seal, so every state is drawn in the same box with a margin, laid out at the seal's own size.
 */
export function sigiliuSvg(stare: StareSigiliu, o: Optiuni = {}): string {
  const px = o.px ?? 44, culori = o.culori ?? "plin";
  // The 100-unit box plus 1 around it; D (92 units) is drawn px wide, the rest hangs into a negative margin.
  const vb = "-1 -1 102 102", u = px / D;
  const marime = r2(102 * u), margine = r2(-5 * u);
  const a11y = o.eticheta ? `role="img" aria-label="${o.eticheta.replace(/"/g, "&quot;")}"` : 'aria-hidden="true"';
  const cap = `<svg class="sigiliu ${o.clasa ?? ""}" viewBox="${vb}" width="${marime}" height="${marime}" style="margin:${margine}px" ${a11y}>`;
  if (stare === "expirat") {
    // A 1.5 px dashed outline: slate on night, stone on paper (acte.css --sigiliu-stins).
    const g = 1.5 / u;
    return `${cap}<circle cx="50" cy="50" r="${r2(R_INEL - g / 2)}" fill="none" style="stroke:var(--sigiliu-stins, #6A6C6F)" stroke-width="${r2(g)}" stroke-dasharray="${r2(g * 2)} ${r2(g * 2)}"/></svg>`;
  }
  const t = taietura(px), [iSus, iJos] = col(t, culori);
  if (stare === "intreg") return `${cap}${parte(piese(t, true)[0], culori)}${iSus}${iJos}</svg>`;
  const [p1, p2] = piese(t), sus = parte(p1, culori) + iSus, jos = parte(p2, culori) + iJos;
  if (stare === "taiat" && o.anim) {
    // Cut: each half starts closed over the slit (the whole seal), then moves back to its place; the slit opens.
    const hw = GEOMETRIE[t].fanta / 2, s0 = deplasare(hw, 1), j0 = deplasare(hw, -1);
    const v = (p: { x: number; y: number }) => `--x0:${p.x}px;--y0:${p.y}px`;
    return `${cap.replace('class="sigiliu', 'class="sigiliu taie')}<g class="jumatate" style="${v(s0)}">${sus}</g><g class="jumatate" style="${v(j0)}">${jos}</g></svg>`;
  }
  if (stare === "taiat") return `${cap}${sus}${jos}</svg>`;
  // Opened: each half moved along the normal; animated, each starts closed over the slit (no gap), then parts.
  const s1 = deplasare(DEPARTARE, -1), j1 = deplasare(DEPARTARE, 1);
  if (!o.anim) return `${cap}<g transform="translate(${s1.x} ${s1.y})">${sus}</g><g transform="translate(${j1.x} ${j1.y})">${jos}</g></svg>`;
  const hw = GEOMETRIE[t].fanta / 2;
  const s0 = deplasare(hw, 1), j0 = deplasare(hw, -1);
  const v = (p: { x: number; y: number }, q: { x: number; y: number }) => `--x0:${p.x}px;--y0:${p.y}px;--x1:${q.x}px;--y1:${q.y}px`;
  return `${cap.replace('class="sigiliu', 'class="sigiliu anim')}<g class="jumatate" style="${v(s0, s1)}">${sus}</g><g class="jumatate" style="${v(j0, j1)}">${jos}</g></svg>`;
}

/**
 * The cut seal in its 100-unit box as an SVG group: `cerneala` for ring and lines, the face in night for full colour,
 * the fine cut in full colour engraved with COL.
 */
export const sigiliuGrup = (t: Taietura, cerneala: string, culori: Culori = "plin", transform = ""): string =>
  `<g fill="${cerneala}"${transform ? ` transform="${transform}"` : ""}>${piese(t).map((q, i) => parte(q, culori) + col(t, culori)[i]).join("")}</g>`;

/** The seal alone as a standalone SVG file (colshare-web/acte/marca, the favicon), `px` wide, which picks the cut. */
export const sigiliuFisier = (px: number, cerneala: string, culori: Culori = "plin"): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${px}" height="${px}">${sigiliuGrup(taietura(px), cerneala, culori)}</svg>\n`;
