// A box editor over one page picture (decisions.md 2026-10-30, "Black out on the ask page; marked copies from the
// desk"): the person drags boxes over what to hide, and an ID's code lines (<<<) can be hidden with one switch, then the
// black is painted into the picture's pixels before anything leaves the device (./innegrire.ts deseneazaNegru), so
// nothing under a box can be uncovered. Used by the ask page (./pagina-cerere.ts) and the desk (./birou/birou.ts).
import type { Zona } from "./copie-sigura.ts";
import { deseneazaNegru } from "./innegrire.ts";

/** Where an ID's code lines (<<<) are on a page of these proportions: a card's back, a passport's data page (ICAO 9303). */
export const zonaMrz = (w: number, h: number): Zona => (Math.max(w, h) / Math.min(w, h) > 1.5 ? { x: 0, y: 0.6, w: 1, h: 0.4 } : { x: 0, y: 0.72, w: 1, h: 0.28 });

/** The boxes to paint: the ones drawn, and the code lines' band when the switch is on. */
export const zoneDe = (img: { width: number; height: number }, manual: Zona[], mrz: boolean): Zona[] =>
  [...(mrz ? [zonaMrz(img.width, img.height)] : []), ...manual];

/** A box smaller than this share of the page on either side is a slip of the finger, not a box. */
const MIN = 0.01;

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

/** The editor's words, in the page's language and register. */
export interface TexteEditor {
  titlu: string;
  text: string;
  mrz: string;
  anulez: string;
  gata: string;
  renunt: string;
}

/**
 * Opens the editor over the page for `img` with the boxes kept so far; resolves with the boxes and the switch when the
 * person is done, or undefined when they cancel (nothing changes then).
 */
export function editezNegru(img: ImageBitmap, manual0: Zona[], mrz0: boolean, x: TexteEditor): Promise<{ manual: Zona[]; mrz: boolean } | undefined> {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  let manual = [...manual0], mrz = mrz0;
  let trag: { x: number; y: number; z: Zona } | undefined;
  const strat = document.createElement("div");
  strat.className = "editor-negru";
  strat.setAttribute("role", "dialog");
  strat.setAttribute("aria-modal", "true");
  strat.setAttribute("aria-label", x.titlu);
  strat.innerHTML = `<div class="editor-cap"><b>${esc(x.titlu)}</b><small>${esc(x.text)}</small></div>
    <div class="editor-loc"><canvas class="editor-panza"></canvas></div>
    <div class="editor-jos"><label class="comutator"><span><b>${esc(x.mrz)}</b></span><input type="checkbox" role="switch" class="editor-mrz"${mrz ? " checked" : ""}></label>
      <div class="editor-butoane"><button type="button" class="buton mic text editor-anulez">${esc(x.anulez)}</button>
      <button type="button" class="buton contur editor-renunt">${esc(x.renunt)}</button><button type="button" class="buton plin editor-gata">${esc(x.gata)}</button></div></div>`;
  document.body.append(strat);
  const panza = strat.querySelector<HTMLCanvasElement>(".editor-panza")!;
  const loc = strat.querySelector<HTMLElement>(".editor-loc")!;
  // The page fitted to the space left between the head and the buttons, redrawn at every change.
  const deseneaza = () => {
    const r = loc.getBoundingClientRect();
    const k = Math.min((r.width || 320) / img.width, (r.height || 400) / img.height, 1);
    panza.width = Math.max(1, Math.round(img.width * k));
    panza.height = Math.max(1, Math.round(img.height * k));
    deseneazaNegru(panza.getContext("2d")!, img, panza.width, panza.height, [...zoneDe(img, manual, mrz), ...(trag ? [trag.z] : [])]);
  };
  const punct = (e: PointerEvent) => {
    const r = panza.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  panza.addEventListener("pointerdown", (e) => {
    panza.setPointerCapture(e.pointerId);
    const p = punct(e);
    trag = { ...p, z: { x: p.x, y: p.y, w: 0, h: 0 } };
  });
  panza.addEventListener("pointermove", (e) => {
    if (!trag) return;
    const p = punct(e);
    trag.z = { x: Math.min(trag.x, p.x), y: Math.min(trag.y, p.y), w: Math.abs(p.x - trag.x), h: Math.abs(p.y - trag.y) };
    deseneaza();
  });
  const termin = () => {
    if (trag && trag.z.w > MIN && trag.z.h > MIN) manual.push(trag.z);
    trag = undefined;
    deseneaza();
  };
  panza.addEventListener("pointerup", termin);
  panza.addEventListener("pointercancel", () => { trag = undefined; deseneaza(); });
  strat.querySelector<HTMLInputElement>(".editor-mrz")!.addEventListener("change", (e) => { mrz = (e.target as HTMLInputElement).checked; deseneaza(); });
  strat.querySelector(".editor-anulez")!.addEventListener("click", () => { manual.pop(); deseneaza(); });
  const laRedim = () => deseneaza();
  addEventListener("resize", laRedim);
  // The page behind takes neither scroll nor focus while the editor is open.
  const sus = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";
  const inapoi = document.activeElement as HTMLElement | null;
  requestAnimationFrame(deseneaza);
  deseneaza();
  strat.querySelector<HTMLButtonElement>(".editor-gata")!.focus();
  return new Promise((ok) => {
    const inchid = (r: { manual: Zona[]; mrz: boolean } | undefined) => {
      removeEventListener("resize", laRedim);
      document.documentElement.style.overflow = sus;
      strat.remove();
      inapoi?.focus();
      ok(r);
    };
    strat.querySelector(".editor-gata")!.addEventListener("click", () => inchid({ manual, mrz }));
    strat.querySelector(".editor-renunt")!.addEventListener("click", () => inchid(undefined));
    strat.addEventListener("keydown", (e) => { if (e.key === "Escape") inchid(undefined); });
  });
}
