// The engraving in the app (docs/decisions.md 2026-10-23, "Colshare's app takes the site's material"): colshare.app's
// hero engraving (colshare-web/home/fond.js gravura()) without the pointer. Lines at -27° cross the canvas; where they
// pass the seal they become the seal: the ring in ochre, the engraved face in faint oat, the slit left out. Drawn once
// outward from the slit when `deseneaza` asks for it (about a second), else at once; with reduced motion, at once.

import { culoriMaterial, faraMiscare } from "./material.ts";
import { R_INEL, T_FANTA, geometrie } from "./sigiliu.ts";

const UNGHI = (27 * Math.PI) / 180;
const U = { x: Math.cos(UNGHI), y: -Math.sin(UNGHI) };
const N = { x: Math.sin(UNGHI), y: Math.cos(UNGHI) };
const DURATA = 1100;

/** Zones along a line: the hatch around the seal, the ring, the engraved face. */
const FOND = 0, INEL = 1, FATA = 2;

export interface OptiuniGravura {
  /** The seal's centre, as shares of the canvas's width and height. */
  x: number;
  y: number;
  /** The seal's radius as a share of the canvas's shorter side. */
  r: number;
  /** Draw it out from the slit (once); otherwise it appears whole. */
  deseneaza?: boolean;
  /** The hatch's strength around the seal (0 leaves only the seal). */
  fond?: number;
}

/** Draws the engraving on `c` at its laid-out size; returns a function that stops a drawing still running. */
export function gravura(c: HTMLCanvasElement, o: OptiuniGravura): () => void {
  const W = c.clientWidth, H = c.clientHeight, ctx = c.getContext("2d");
  if (!W || !H || !ctx) return () => {};
  const { ovaz: OVAZ, ocru: OCRU } = culoriMaterial(c);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  // Drawn again at the same size (the folding band, each frame), the canvas keeps its pixels' memory.
  const w = Math.round(W * dpr), h = Math.round(H * dpr);
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const R = o.r * Math.min(W, H), cx = o.x * W, cy = o.y * H;
  // The seal's own proportions (sigiliu.ts): the ring's inner edge, the engraved circle, the slit (width, offset).
  const k = R / R_INEL, g = geometrie("fin");
  const F = g.fata * k, G = g.gravura * k, fanta = (g.fanta / 2) * k, t0 = T_FANTA * k;
  const pas = Math.max(2.6, R / 21), L = Math.hypot(W, H);
  // Each run: [x1, y1, x2, y2, zone, t (distance from the slit along N)].
  // Worked out along each line, not walked in 2 px steps: on a whole window that was a million points at each draw.
  // A point s along the line at t is at sqrt(t² + s²) from the seal's centre.
  const runs: [number, number, number, number, number, number][] = [];
  for (let t = Math.ceil(-L / pas) * pas; t <= L; t += pas) {
    const ox = cx + N.x * t, oy = cy + N.y * t;
    // Where the line crosses the canvas, with 4 px to spare.
    let s0 = -Infinity, s1 = Infinity;
    for (const [o, u, hi] of [[ox, U.x, W + 4], [oy, U.y, H + 4]]) {
      let a = (-4 - o) / u, b = (hi - o) / u;
      if (a > b) [a, b] = [b, a];
      s0 = Math.max(s0, a); s1 = Math.min(s1, b);
    }
    if (s0 >= s1) continue;
    const run = (a: number, b: number, z: number) => {
      a = Math.max(a, s0); b = Math.min(b, s1);
      if (b > a) runs.push([ox + U.x * a, oy + U.y * a, ox + U.x * b, oy + U.y * b, z, t]);
    };
    const at = Math.abs(t);
    if (at >= R) { run(s0, s1, FOND); continue; }
    const sR = Math.sqrt(R * R - t * t);
    run(s0, -sR, FOND);
    run(sR, s1, FOND);
    // The slit leaves the line empty across the seal; else the ring, and the engraved face inside it.
    if (Math.abs(t - t0) < fanta) continue;
    if (at >= F) run(-sR, sR, INEL);
    else { const sF = Math.sqrt(F * F - t * t); run(-sR, -sF, INEL); run(sF, sR, INEL); }
    if (at < G) { const sG = Math.sqrt(G * G - t * t); run(-sG, sG, FATA); }
  }
  const fond = o.fond ?? 0.07;
  const maxT = Math.max(...runs.map((r) => Math.abs(r[5] - t0)), 1);
  const traseaza = (p: number) => {
    ctx.clearRect(0, 0, W, H);
    for (const [x1, y1, x2, y2, z, t] of runs) {
      // A line comes in when the drawing has reached its distance from the slit, growing from the seal's axis.
      const a = Math.min(1, Math.max(0, (p * 1.35 - Math.abs(t - t0) / maxT) * 4));
      // Round the seal, one line in five: the hatch stays a texture, the seal's own lines stay fine.
      if (!a || (z === FOND && (!fond || Math.round((t - t0) / pas) % 5))) continue;
      ctx.strokeStyle = z === INEL ? `rgba(${OCRU},${0.92 * a})` : z === FATA ? `rgba(${OVAZ},${0.3 * a})` : `rgba(${OVAZ},${fond * a})`;
      ctx.lineWidth = z === INEL ? pas * 0.62 : z === FATA ? 1 : 0.7;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, f = Math.min(1, a * 1.2);
      ctx.beginPath();
      ctx.moveTo(mx + (x1 - mx) * f, my + (y1 - my) * f);
      ctx.lineTo(mx + (x2 - mx) * f, my + (y2 - my) * f);
      ctx.stroke();
    }
  };
  if (!o.deseneaza || faraMiscare()) { traseaza(1); return () => {}; }
  let cadru = 0, gata = false;
  const t1 = performance.now();
  const pas_ = (acum: number) => {
    const p = Math.min(1, (acum - t1) / DURATA);
    traseaza(1 - (1 - p) ** 3);
    if (p < 1 && !gata) cadru = requestAnimationFrame(pas_);
  };
  cadru = requestAnimationFrame(pas_);
  return () => { gata = true; cancelAnimationFrame(cadru); traseaza(1); };
}
