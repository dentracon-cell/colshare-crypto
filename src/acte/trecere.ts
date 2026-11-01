// A change of screen that moves instead of cutting (docs/colshare-motion-audit-2026-11-01.md, A1): the app and the
// desk redraw the whole screen at once, so the screen being left is copied, as it stands, into a still layer under the
// new one and fades there while the new one comes in. The real page changes in the same instant as before, so
// everything that reads it right after a redraw keeps working.

/**
 * Copies `el` (as it is on screen now) into a fixed layer under the page, where it plays `cls` (acte.css
 * `.strat-plecare.<cls>`) and is removed after `ms`. Its canvases are copied as pictures; ids and names are dropped and
 * nothing in it can be reached, so the copy never answers a query or a tap. `fond`: the layer's background, for a
 * change that also changes the page's colours (leaving the lock's night for a light theme).
 */
export function lasaInUrma(el: Element, cls: string, ms: number, fond?: string): HTMLElement | undefined {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return undefined;
  const copie = el.cloneNode(true) as HTMLElement;
  const vechi = el.querySelectorAll("canvas"), noi = copie.querySelectorAll("canvas");
  noi.forEach((c, i) => {
    try { if (c.width && c.height) c.getContext("2d")?.drawImage(vechi[i], 0, 0); } catch { /* a canvas that can't be read stays empty */ }
  });
  for (const x of [copie, ...copie.querySelectorAll("[id],[name]")]) { x.removeAttribute("id"); x.removeAttribute("name"); }
  // The copy leaves; the entrance it was playing must not start again on it.
  copie.classList.remove(...Array.from(copie.classList).filter((c) => c === "intra" || c === "schimb" || c.startsWith("trec-")));
  copie.style.cssText += `;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;margin:0`;
  const strat = document.createElement("div");
  strat.className = `strat-plecare ${cls}`;
  strat.setAttribute("aria-hidden", "true");
  strat.inert = true;
  strat.style.animationDuration = `${ms}ms`;
  if (fond) strat.style.background = fond;
  strat.append(copie);
  document.body.append(strat);
  setTimeout(() => strat.remove(), ms + 50);
  return strat;
}

/** The page's background colour as painted now (the body's, else the root's). */
export function fondPagina(): string {
  const b = getComputedStyle(document.body).backgroundColor;
  return b && b !== "rgba(0, 0, 0, 0)" && b !== "transparent" ? b : getComputedStyle(document.documentElement).backgroundColor;
}
