// A box editor over one page picture (decisions.md 2026-10-30, "Black out on the ask page; marked copies from the
// desk"): the person drags boxes over what to hide, and an ID's code lines (<<<) can be hidden with one switch, then the
// black is painted into the picture's pixels before anything leaves the device (./innegrire.ts deseneazaNegru), so
// nothing under a box can be uncovered. Used by the ask page (./pagina-cerere.ts), the desk (./birou/birou.ts) and the
// app's Black out and safe copy (./app.ts), where the boxes drawn by hand are drawn in it.
// The page zooms and moves (decisions.md 2026-10-31, "Black out and marked copies on every paper"), so one line of
// small print on a statement or a contract can be covered on its own.
import type { Zona } from "./copie-sigura.ts";
import { deseneazaNegru } from "./innegrire.ts";
import { faraMiscare } from "./material.ts";
import { lasaInUrma } from "./trecere.ts";

/** Where an ID's code lines (<<<) are on a page of these proportions: a card's back, a passport's data page (ICAO 9303). */
export const zonaMrz = (w: number, h: number): Zona => (Math.max(w, h) / Math.min(w, h) > 1.5 ? { x: 0, y: 0.6, w: 1, h: 0.4 } : { x: 0, y: 0.72, w: 1, h: 0.28 });

/** The boxes to paint: the ones drawn, and the code lines' band when the switch is on. */
export const zoneDe = (img: { width: number; height: number }, manual: Zona[], mrz: boolean): Zona[] =>
  [...(mrz ? [zonaMrz(img.width, img.height)] : []), ...manual];

/** A box smaller than this many screen pixels on either side is a slip of the finger, not a box (a line of 7-point print zoomed in is far taller). */
const MIN_PX = 3;
/** How far the page zooms in past "whole page": enough for one line of small print on a phone. */
const ZOOM_MAX = 12;
/** One press of + or − zooms by this much. */
const PAS = 1.5;

/** The picture with its boxes painted in, as a JPEG at its own size. */
export async function jpegCuNegru(img: ImageBitmap, zone: Zona[], calitate = 0.88): Promise<{ date: Uint8Array; w: number; h: number; blob: Blob }> {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  deseneazaNegru(c.getContext("2d")!, img, c.width, c.height, zone);
  const blob = await new Promise<Blob>((ok, rau) => c.toBlob((x) => (x ? ok(x) : rau(new Error("JPEG"))), "image/jpeg", calitate));
  c.width = c.height = 0;
  return { date: new Uint8Array(await blob.arrayBuffer()), w: img.width, h: img.height, blob };
}

/** How to close each editor open now, as Cancel. */
const deschise = new Set<() => void>();

/**
 * Closes every box editor open, as Cancel (nothing kept): the desk calls it when it locks, so no page stays on the
 * screen over the lock (attack test 2026-10-31, N5).
 */
export function inchidEditoarele(): void {
  // Each one takes itself out of the set as it closes, which a Set allows while it is walked. Closed by the lock, it
  // leaves no fading copy of the page over the lock screen (attack test 2026-11-01, M2).
  faraUrma = true;
  try { for (const x of deschise) x(); } finally { faraUrma = false; }
}
let faraUrma = false;
/** Whether a box editor is open (the phone's back button closes it first). */
export const unEditorDeschis = (): boolean => deschise.size > 0;

/** The editor's words, in the page's language and register. An empty `mrz` leaves the code lines' switch out. */
export interface TexteEditor {
  titlu: string;
  text: string;
  mrz: string;
  anulez: string;
  gata: string;
  renunt: string;
  mareste: string;
  micsoreaza: string;
  potrivesc: string;
}

/** Where the page is on the screen: its scale against the picture's pixels and its top-left corner, in CSS pixels. */
interface Vedere { s: number; x: number; y: number }

/**
 * The view kept inside the space: a page smaller than the space is centred on that side, a larger one can't be moved
 * past its edges. Exported for the tests.
 */
export function incadrez(v: Vedere, img: { w: number; h: number }, loc: { w: number; h: number }): Vedere {
  const pe = (poz: number, marime: number, spatiu: number) => (marime <= spatiu ? (spatiu - marime) / 2 : Math.min(0, Math.max(spatiu - marime, poz)));
  return { s: v.s, x: pe(v.x, img.w * v.s, loc.w), y: pe(v.y, img.h * v.s, loc.h) };
}

/** The view zoomed to scale `s` (kept between "whole page" and ZOOM_MAX times that) with the point (px, py) of the space staying put. */
export function zoomez(v: Vedere, s: number, px: number, py: number, potrivit: number): Vedere {
  const s1 = Math.min(potrivit * ZOOM_MAX, Math.max(potrivit, s));
  return { s: s1, x: px - ((px - v.x) * s1) / v.s, y: py - ((py - v.y) * s1) / v.s };
}

/**
 * Opens the editor over the page for `img` with the boxes kept so far; resolves with the boxes and the switch when the
 * person is done, or undefined when they cancel (nothing changes then).
 *
 * One finger or the mouse draws a box; two fingers move and zoom the page; the wheel moves it, and Ctrl with the wheel
 * (or a pad's pinch) zooms it, as do + − and the "whole page" button; the middle button held moves it with the mouse. A tap on a box drawn takes it away.
 */
export function editezNegru(img: ImageBitmap, manual0: Zona[], mrz0: boolean, x: TexteEditor): Promise<{ manual: Zona[]; mrz: boolean } | undefined> {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const lupa = (semn: string) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/>${semn}</svg>`;
  let manual = [...manual0], mrz = mrz0;
  let trag: { x: number; y: number; z: Zona; misc: boolean } | undefined;
  let muta: { x: number; y: number; v: Vedere } | undefined;
  let ciupit: { d: number; mx: number; my: number; v: Vedere } | undefined;
  const degete = new Map<number, { x: number; y: number }>();
  const strat = document.createElement("div");
  strat.className = "editor-negru";
  strat.setAttribute("role", "dialog");
  strat.setAttribute("aria-modal", "true");
  strat.setAttribute("aria-label", x.titlu);
  strat.innerHTML = `<div class="editor-cap"><b>${esc(x.titlu)}</b><small>${esc(x.text)}</small></div>
    <div class="editor-loc"><canvas class="editor-panza"></canvas>
      <div class="editor-zoom"><button type="button" class="editor-minus" aria-label="${esc(x.micsoreaza)}" title="${esc(x.micsoreaza)}">${lupa('<path d="M7.5 10.5h6"/>')}</button>
        <button type="button" class="editor-tot" title="${esc(x.potrivesc)}">100%</button>
        <button type="button" class="editor-plus" aria-label="${esc(x.mareste)}" title="${esc(x.mareste)}">${lupa('<path d="M7.5 10.5h6M10.5 7.5v6"/>')}</button></div></div>
    <div class="editor-jos">${x.mrz ? `<label class="comutator"><input type="checkbox" role="switch" class="editor-mrz"${mrz ? " checked" : ""}><span class="editor-pilula"></span><span class="editor-eticheta"><b>${esc(x.mrz)}</b></span></label>` : ""}
      <div class="editor-butoane"><button type="button" class="buton mic text editor-anulez">${esc(x.anulez)}</button>
      <button type="button" class="buton contur editor-renunt">${esc(x.renunt)}</button><button type="button" class="buton plin editor-gata">${esc(x.gata)}</button></div></div>`;
  document.body.append(strat);
  // It comes up instead of appearing in one frame (motion audit 2026-11-01, A12).
  if (!faraMiscare()) strat.classList.add("intra");
  const panza = strat.querySelector<HTMLCanvasElement>(".editor-panza")!;
  const loc = strat.querySelector<HTMLElement>(".editor-loc")!;
  const tot = strat.querySelector<HTMLButtonElement>(".editor-tot")!;
  const pagina = { w: img.width, h: img.height };
  const spatiul = () => { const r = loc.getBoundingClientRect(); return { w: r.width || 320, h: r.height || 400 }; };
  const potrivit = () => { const l = spatiul(); return Math.min(l.w / pagina.w, l.h / pagina.h); };
  let v: Vedere = { s: potrivit(), x: 0, y: 0 };
  const pun = (n: Vedere) => { v = incadrez(n, pagina, spatiul()); deseneaza(); };

  // The canvas fills the space at the screen's own resolution; only what is in view is drawn, so zooming in never asks
  // for a canvas larger than the screen.
  // Drawn at most once a frame: every pointer move drew the whole page at once (motion audit 2026-11-01, A12).
  let cadruDesen = 0;
  const deseneaza = () => { if (!cadruDesen) cadruDesen = requestAnimationFrame(() => { cadruDesen = 0; deseneazaAcum(); }); };
  const deseneazaAcum = () => {
    const l = spatiul(), r = devicePixelRatio || 1;
    const w = Math.max(1, Math.round(l.w * r)), h = Math.max(1, Math.round(l.h * r));
    if (panza.width !== w || panza.height !== h) { panza.width = w; panza.height = h; }
    const g = panza.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.setTransform(r * v.s, 0, 0, r * v.s, r * v.x, r * v.y);
    g.imageSmoothingQuality = "high";
    deseneazaNegru(g, img, pagina.w, pagina.h, zoneDe(img, manual, mrz));
    if (trag) {
      // The box being drawn lets the words under it show, so its edges can be put exactly on a line.
      const z = trag.z;
      g.fillStyle = "rgb(0 0 0 / 0.45)";
      g.fillRect(z.x * pagina.w, z.y * pagina.h, z.w * pagina.w, z.h * pagina.h);
      g.lineWidth = 1.5 / v.s;
      g.strokeStyle = "#e0312b";
      g.strokeRect(z.x * pagina.w, z.y * pagina.h, z.w * pagina.w, z.h * pagina.h);
    }
    tot.textContent = `${Math.round((v.s / potrivit()) * 100)}%`;
  };
  // A point of the space (CSS pixels from its corner) and the same point on the page (0–1 of its sides).
  const inSpatiu = (e: { clientX: number; clientY: number }) => { const r = loc.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const pePagina = (p: { x: number; y: number }) => ({ x: Math.min(1, Math.max(0, (p.x - v.x) / (pagina.w * v.s))), y: Math.min(1, Math.max(0, (p.y - v.y) / (pagina.h * v.s))) });
  const zoomLa = (s: number, p = { x: spatiul().w / 2, y: spatiul().h / 2 }) => pun(zoomez(v, s, p.x, p.y, potrivit()));

  panza.addEventListener("pointerdown", (e) => {
    panza.setPointerCapture(e.pointerId);
    const p = inSpatiu(e);
    degete.set(e.pointerId, p);
    if (degete.size === 2) {
      // A second finger: the box begun is dropped, and the two fingers move and zoom the page.
      trag = undefined;
      muta = undefined;
      const [a, b] = [...degete.values()];
      ciupit = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, v };
      deseneaza();
      return;
    }
    if (degete.size > 2) return;
    if (e.button === 1) { e.preventDefault(); muta = { ...p, v }; panza.classList.add("muta"); return; }
    if (e.button !== 0) return;
    const q = pePagina(p);
    trag = { ...q, z: { x: q.x, y: q.y, w: 0, h: 0 }, misc: false };
  });
  panza.addEventListener("pointermove", (e) => {
    if (!degete.has(e.pointerId)) return;
    const p = inSpatiu(e);
    degete.set(e.pointerId, p);
    if (ciupit && degete.size >= 2) {
      const [a, b] = [...degete.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      // The page point first under the fingers' middle stays under it, at the new scale.
      const z = zoomez(ciupit.v, (ciupit.v.s * d) / ciupit.d, ciupit.mx, ciupit.my, potrivit());
      pun({ s: z.s, x: z.x + mx - ciupit.mx, y: z.y + my - ciupit.my });
      return;
    }
    if (muta) { pun({ s: muta.v.s, x: muta.v.x + p.x - muta.x, y: muta.v.y + p.y - muta.y }); return; }
    if (!trag) return;
    const q = pePagina(p);
    trag.z = { x: Math.min(trag.x, q.x), y: Math.min(trag.y, q.y), w: Math.abs(q.x - trag.x), h: Math.abs(q.y - trag.y) };
    trag.misc ||= trag.z.w * pagina.w * v.s > MIN_PX || trag.z.h * pagina.h * v.s > MIN_PX;
    deseneaza();
  });
  const ridic = (e: PointerEvent, anulat: boolean) => {
    if (!degete.delete(e.pointerId)) return;
    if (ciupit) { if (degete.size < 2) ciupit = undefined; return; }
    if (muta) { muta = undefined; panza.classList.remove("muta"); return; }
    if (!trag) return;
    const z = trag.z, misc = trag.misc;
    trag = undefined;
    if (!anulat) {
      if (z.w * pagina.w * v.s > MIN_PX && z.h * pagina.h * v.s > MIN_PX) manual.push(z);
      else if (!misc) {
        // A tap on a box drawn takes it away (the last one drawn over that point first).
        for (let i = manual.length - 1; i >= 0; i--) {
          const m = manual[i];
          if (z.x >= m.x && z.x <= m.x + m.w && z.y >= m.y && z.y <= m.y + m.h) { manual.splice(i, 1); break; }
        }
      }
    }
    deseneaza();
  };
  panza.addEventListener("pointerup", (e) => ridic(e, false));
  panza.addEventListener("pointercancel", (e) => ridic(e, true));
  // The wheel moves the page (Shift sideways); Ctrl with it, which is also how a pad's pinch arrives, zooms.
  loc.addEventListener("wheel", (e) => {
    e.preventDefault();
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? spatiul().h : 1;
    if (e.ctrlKey || e.metaKey) zoomLa(v.s * Math.exp(-e.deltaY * k * 0.0025), inSpatiu(e));
    else pun({ s: v.s, x: v.x - (e.shiftKey ? e.deltaY : e.deltaX) * k, y: v.y - (e.shiftKey ? 0 : e.deltaY) * k });
  }, { passive: false });
  // + and − glide to the new zoom over 200 ms instead of jumping; the wheel and the fingers follow the hand directly.
  let cadruZoom = 0;
  const zoomLin = (s: number) => {
    const p = { x: spatiul().w / 2, y: spatiul().h / 2 }, tinta = zoomez(v, s, p.x, p.y, potrivit());
    cancelAnimationFrame(cadruZoom);
    if (faraMiscare()) { pun(tinta); return; }
    const de = { ...v }, t0 = performance.now();
    const pas = (acum: number) => {
      const k = Math.min(1, (acum - t0) / 200), e = 1 - (1 - k) ** 3;
      pun({ s: de.s + (tinta.s - de.s) * e, x: de.x + (tinta.x - de.x) * e, y: de.y + (tinta.y - de.y) * e });
      if (k < 1) cadruZoom = requestAnimationFrame(pas);
    };
    cadruZoom = requestAnimationFrame(pas);
  };
  strat.querySelector(".editor-plus")!.addEventListener("click", () => zoomLin(v.s * PAS));
  strat.querySelector(".editor-minus")!.addEventListener("click", () => zoomLin(v.s / PAS));
  tot.addEventListener("click", () => pun({ s: potrivit(), x: 0, y: 0 }));
  strat.querySelector<HTMLInputElement>(".editor-mrz")?.addEventListener("change", (e) => { mrz = (e.target as HTMLInputElement).checked; deseneaza(); });
  strat.querySelector(".editor-anulez")!.addEventListener("click", () => { manual.pop(); deseneaza(); });
  // A new size keeps the zoom against "whole page" and the page's middle where it was.
  let potrivitInainte = potrivit();
  const laRedim = () => {
    const p0 = potrivitInainte, p1 = potrivit();
    potrivitInainte = p1;
    pun({ s: (v.s / p0) * p1, x: v.x * (p1 / p0), y: v.y * (p1 / p0) });
  };
  addEventListener("resize", laRedim);
  // The page behind takes neither scroll nor focus while the editor is open.
  const sus = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";
  const inapoi = document.activeElement as HTMLElement | null;
  // Nothing behind can be reached by Tab or a screen reader either (attack test 2026-10-30, N2).
  const blocate = [...document.body.children].filter((e): e is HTMLElement => e !== strat && e instanceof HTMLElement && !e.inert);
  for (const b of blocate) b.inert = true;
  requestAnimationFrame(() => { potrivitInainte = potrivit(); pun({ s: potrivit(), x: 0, y: 0 }); });
  pun(v);
  strat.querySelector<HTMLButtonElement>(".editor-gata")!.focus();
  return new Promise((ok) => {
    const inchid = (r: { manual: Zona[]; mrz: boolean } | undefined) => {
      deschise.delete(anulez);
      removeEventListener("resize", laRedim);
      document.documentElement.style.overflow = sus;
      for (const b of blocate) b.inert = false;
      // It fades as it closes, from a still copy, instead of vanishing in one frame (A12).
      if (!faraMiscare() && !faraUrma) lasaInUrma(strat, "editor-pleaca", 200);
      strat.remove();
      inapoi?.focus();
      ok(r);
    };
    const anulez = () => inchid(undefined);
    deschise.add(anulez);
    strat.querySelector(".editor-gata")!.addEventListener("click", () => inchid({ manual, mrz }));
    strat.querySelector(".editor-renunt")!.addEventListener("click", () => inchid(undefined));
    strat.addEventListener("keydown", (e) => {
      // Escape never throws away boxes drawn: with any, it is Done; with none, it cancels (attack test 2026-10-30, N4).
      if (e.key === "Escape") { e.stopPropagation(); inchid(manual.length || mrz ? { manual, mrz } : undefined); }
      else if ((e.target as HTMLElement).tagName === "INPUT") return;
      else if (e.key === "+" || e.key === "=") zoomLin(v.s * PAS);
      else if (e.key === "-") zoomLin(v.s / PAS);
      else if (e.key === "0") pun({ s: potrivit(), x: 0, y: 0 });
    });
  });
}
