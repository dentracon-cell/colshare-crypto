// What the drawn material (the ciphertext field, the engraving) takes from the page: its colours, which a light theme
// turns to night ink on paper (acte.css `--material`, `--material-ocru`), and whether to move at all, which the
// person can switch off in the app (Settings › Less motion, html.putina-miscare) besides the phone's reduced motion.

const OCRU = "226,165,43", OVAZ = "236,232,223";

/** The material's two colours as "r,g,b", read where it is drawn; the site's night when nothing is set. */
export function culoriMaterial(el: Element): { ovaz: string; ocru: string } {
  const s = getComputedStyle(el);
  return { ovaz: s.getPropertyValue("--material").trim() || OVAZ, ocru: s.getPropertyValue("--material-ocru").trim() || OCRU };
}

/** Whether to show each end at once: the phone's reduced motion, or the app's own switch. */
export const faraMiscare = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches || !!globalThis.document?.documentElement.classList.contains("putina-miscare");
