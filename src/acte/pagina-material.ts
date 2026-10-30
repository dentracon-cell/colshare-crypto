// The link pages' Colshare material (2026-10-24, "the pages users get with the links … don't have any personality";
// "make it shine"): a night band over the paper with the wordmark and the engraving (./gravura.ts, the seal in ochre,
// oat lines at -27°), the app's entrance lock (./seif-lacat.ts) waiting over the received papers and turning as papers are
// sealed and sent, and the seal pressed on what was sent. Every moment shows its end at once with reduced motion (./material.ts).
import aplicatie from "./aplicatie.json";
import { cifruFond } from "./cifru-fond.ts";
import { gravura } from "./gravura.ts";
import { faraMiscare } from "./material.ts";
import type { ScenaLacat } from "./seif-lacat.ts";
import { geometrie, marcaSvg, R_INEL, sigiliuSvg } from "./sigiliu.ts";

/**
 * The band above the page, across the window: the wordmark over the ciphertext field (the desk's lock and the app have
 * it; decisions.md 2026-10-25, "The link pages' band is the cipher"), and the engraving's seal at the right, without its
 * hatch. `lata`: the
 * page beneath is laid out wide on a computer (the ask page's two columns). `faraSigiliu`: the band keeps no seal,
 * because the page lays it behind its own content (the card page, sigiliuInFundal below).
 */
export function montezBanda(lata = false, faraSigiliu = false): void {
  const main = document.querySelector<HTMLElement>(".pagina-link");
  if (!main) return;
  document.getElementById("marca")?.remove();
  if (lata) main.classList.add("lata");
  const b = document.createElement("header");
  b.className = "banda-link";
  b.innerHTML = `<canvas class="banda-cifru" aria-hidden="true"></canvas>${faraSigiliu ? "" : `<canvas aria-hidden="true"></canvas>`}<span class="marca">${marcaSvg(38, aplicatie.nume)}</span>`;
  document.body.prepend(b);
  const [cc, c] = b.querySelectorAll("canvas");
  const optiuni = { x: 0.86, y: 0.56, r: 0.42, fond: 0 };
  let opresteC = cifruFond(cc, { umple: !faraMiscare(), alfa: 0.16 });
  let opreste = c ? gravura(c, { ...optiuni, deseneaza: !faraMiscare() }) : () => {};
  // Redrawn whole when the window's width changes enough to matter (a phone turned, a window resized).
  let latime = innerWidth;
  addEventListener("resize", () => {
    if (Math.abs(innerWidth - latime) < 40) return;
    latime = innerWidth;
    opreste(); opresteC();
    opresteC = cifruFond(cc, { alfa: 0.16 });
    if (c) opreste = gravura(c, { ...optiuni, deseneaza: false });
  });
}

/**
 * The seal large and faint behind the whole page, centred on `tinta` (the card page's QR code, 2026-10-30: "make it the
 * background", "center the QR inside the seal"), its ring just clear of the target's corners. Without a target (a phone
 * shows no QR code), low under the words. The canvas covers the document, not the window, so the seal scrolls with
 * what it frames.
 */
export function sigiliuInFundal(tinta: Element | null): void {
  const c = document.createElement("canvas");
  c.className = "fundal-sigiliu";
  c.setAttribute("aria-hidden", "true");
  document.body.prepend(c);
  const optiuni = () => {
    c.style.height = "0";
    const W = document.documentElement.clientWidth, H = document.documentElement.scrollHeight;
    c.style.height = `${H}px`;
    const m = Math.min(W, H);
    const t = tinta?.getBoundingClientRect();
    if (!t?.width) return { x: 0.62, y: Math.min(0.72, (0.72 * innerHeight) / H), r: (0.62 * Math.min(W, innerHeight)) / m, fond: 0 };
    // The target inside the seal's opening (the face within the ring): its corners 14 px inside the face's edge.
    const fata = (Math.SQRT1_2 * Math.max(t.width, t.height) + 14) / (geometrie("fin").fata / R_INEL);
    return { x: (t.left + t.width / 2 + scrollX) / W, y: (t.top + t.height / 2 + scrollY) / H, r: fata / m, fond: 0 };
  };
  // Where the seal was last drawn, in document pixels; it is drawn again whenever the target or the page moves it (the
  // web fonts arriving after the first draw reflow the words and move the QR code, which left it out of the seal).
  const loc = () => {
    const t = tinta?.getBoundingClientRect(), d = document.documentElement;
    return t?.width ? `${Math.round(t.left + t.width / 2 + scrollX)},${Math.round(t.top + t.height / 2 + scrollY)},${Math.round(t.width)},${d.clientWidth},${d.scrollHeight}` : `${d.clientWidth},${d.scrollHeight}`;
  };
  let acolo = loc();
  let opreste = gravura(c, { ...optiuni(), deseneaza: !faraMiscare() });
  let cadru = 0;
  const verific = () => {
    cancelAnimationFrame(cadru);
    cadru = requestAnimationFrame(() => {
      const aici = loc();
      if (aici === acolo) return;
      acolo = aici;
      opreste();
      opreste = gravura(c, { ...optiuni(), deseneaza: false });
      acolo = loc();
    });
  };
  addEventListener("resize", verific);
  document.fonts?.ready.then(verific);
  // The page and each box between it and the target: a column growing moves the target without moving the page.
  if (typeof ResizeObserver === "function") {
    const ro = new ResizeObserver(verific);
    for (let e = tinta; e && e !== document.body; e = e.parentElement) {
      ro.observe(e);
      for (const frate of e.parentElement?.children ?? []) if (frate !== e) ro.observe(frate);
    }
  }
}

/**
 * The received papers' scene (/p/): night across the window, the engraving and, while the papers come down, the
 * ciphertext field running over it; `continut` holds the seal and the words of each moment. `restrang` folds it to a
 * band once the papers are out.
 */
/** The field's strength at rest: it lies under the page's words too, so fainter than in the scene alone. */
const ALFA = 0.075;

export function montezScena(): { continut: HTMLElement; cifru: (activ: boolean) => void; restrang: () => void } {
  const main = document.querySelector<HTMLElement>(".pagina-link");
  document.getElementById("marca")?.remove();
  const s = document.createElement("header");
  s.className = "scena-link";
  s.innerHTML = `<canvas class="scena-gravura" aria-hidden="true"></canvas><canvas class="scena-cifru" aria-hidden="true"></canvas>
    <span class="marca">${marcaSvg(38, aplicatie.nume)}</span><div class="scena-continut" aria-live="polite"></div>`;
  document.body.prepend(s);
  main?.classList.add("sub-scena");
  const g = s.querySelector<HTMLCanvasElement>(".scena-gravura")!, c = s.querySelector<HTMLCanvasElement>(".scena-cifru")!;
  // While the lock holds the middle, the engraving's seal stands off the right edge (only its hatch shows); the folded band
  // brings it in. The canvases cover the window (acte.css), so the folded seal's place is set in the band's terms.
  let optiuni = { x: 1.2, y: 0.12, r: 0.22, fond: 0 }, pliat = false;
  const inBanda = () => {
    const W = g.clientWidth || innerWidth, H = g.clientHeight || innerHeight, banda = 330;
    return { x: 0.9, y: (0.3 * banda) / H, r: (0.36 * Math.min(W, banda)) / Math.min(W, H), fond: 0 };
  };
  let opresteG = gravura(g, { ...optiuni, deseneaza: !faraMiscare() });
  let opresteC = cifruFond(c, { umple: !faraMiscare(), alfa: ALFA });
  let latime = innerWidth;
  addEventListener("resize", () => {
    if (Math.abs(innerWidth - latime) < 40) return;
    latime = innerWidth;
    opresteG();
    if (pliat) optiuni = inBanda();
    opresteG = gravura(g, { ...optiuni, deseneaza: false });
    if (!s.classList.contains("cifreaza")) { opresteC(); opresteC = cifruFond(c, { alfa: ALFA }); }
  });
  return {
    continut: s.querySelector<HTMLElement>(".scena-continut")!,
    cifru: (activ) => {
      opresteC();
      s.classList.toggle("cifreaza", activ);
      opresteC = cifruFond(c, activ ? { activ: true, umple: true, alfa: 0.2 } : { alfa: ALFA });
    },
    restrang: () => {
      // The scene's height now and folded (its new words already in), run from one to the other; the seal comes in
      // from the right edge to its place in the band at the same pace, drawn again each frame.
      const de = s.offsetHeight;
      s.classList.add("restransa");
      const la = s.offsetHeight;
      const din = optiuni, spre = inBanda();
      pliat = true;
      opresteG();
      if (faraMiscare()) { optiuni = spre; opresteG = gravura(g, { ...optiuni, deseneaza: false }); return; }
      s.animate([{ height: `${de}px` }, { height: `${la}px` }], { duration: 600, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
      const t0 = performance.now();
      let cadru = 0;
      const pas = (acum: number) => {
        const p = Math.min(1, (acum - t0) / 650), e = 1 - (1 - p) ** 3;
        optiuni = { x: din.x + (spre.x - din.x) * e, y: din.y + (spre.y - din.y) * e, r: din.r + (spre.r - din.r) * e, fond: 0 };
        gravura(g, { ...optiuni, deseneaza: false });
        cadru = p < 1 ? requestAnimationFrame(pas) : 0;
      };
      cadru = requestAnimationFrame(pas);
      opresteG = () => cancelAnimationFrame(cadru);
    },
  };
}

/** The seal pressed on what was sent: it comes down whole, a ring goes out from it, a light passes. */
export const sigiliuApasat = (px: number) =>
  `<span class="sigiliu-apasat" style="--px:${px}px">${sigiliuSvg("intreg", { px })}<span class="unda" aria-hidden="true"></span><span class="luciu" aria-hidden="true"></span></span>`;

/**
 * The app's entrance lock put where `loc` holds a `.loc-lacat` (the same element each time, so it keeps its dial and its
 * tape running while the words round it change). Returns the lock, or nothing when there is no place for it.
 */
export function punLacat(loc: ParentNode, lacat: ScenaLacat): ScenaLacat | null {
  const l = loc.querySelector(".loc-lacat");
  if (!l) return null;
  l.replaceWith(lacat.el);
  lacat.potriveste();
  return lacat;
}
