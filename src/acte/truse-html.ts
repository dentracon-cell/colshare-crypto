// An ask kit (./truse.ts) as HTML, in the current language: on the site's page for the kit (scripts/acte-truse.mjs)
// and in the app, under an ask made from it.
import { data, limbaCurenta, t, type Limba } from "./limba.ts";
import { limbaTrusa, type FelVersiune, type LimbaTrusa, type PasVersiune, type SursaTrusa, type Trusa } from "./truse.ts";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
/** The language of the official texts a kit quotes: its country's ("de-cont" → de). */
const limbaSursei = (x: Trusa) => x.id.slice(0, 2) as Limba;

const LOCALE: Record<LimbaTrusa, string> = { en: "en-GB", ro: "ro-RO", de: "de-DE", fr: "fr-FR" };

/** A source's date in the page's language: "16 July 2026", "16. Juli 2026", "1er mai 2008"; a month alone, "Januar 2026". */
function zi(iso: string, l: LimbaTrusa): string {
  const [a, m, z] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1, z || 1));
  const s = d.toLocaleDateString(LOCALE[l], z ? { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" } : { month: "long", year: "numeric", timeZone: "UTC" });
  return l === "fr" && z === 1 ? s.replace(/^1 /, "1er ") : s;
}

/** Each kind of version line, per language; `luna` when the source gives only a month. */
const FELURI: Record<FelVersiune, (d: string, l: LimbaTrusa, luna: boolean) => string> = {
  modificat: (d, l) => ({ en: `last amended on ${d}`, ro: `ultima modificare: ${d}`, de: `zuletzt geändert am ${d}`, fr: `dernière modification le ${d}` })[l],
  vigoare: (d, l) => ({ en: `in force since ${d}`, ro: `în vigoare din ${d}`, de: `in Kraft seit ${d}`, fr: `en vigueur depuis le ${d}` })[l],
  verificat: (d, l) => ({ en: `page checked on ${d}`, ro: `pagină verificată la ${d}`, de: `Seite geprüft am ${d}`, fr: `vérifié le ${d}` })[l],
  publicat: (d, l, luna) => ({ en: `published ${luna ? "in " : "on "}${d}`, ro: `publicat ${luna ? "în" : "la"} ${d}`, de: `veröffentlicht ${luna ? "im" : "am"} ${d}`, fr: `publié ${luna ? "en" : "le"} ${d}` })[l],
  actualizat: (d, l, luna) => ({ en: `updated ${luna ? "in " : "on "}${d}`, ro: `actualizat ${luna ? "în" : "la"} ${d}`, de: `aktualisiert ${luna ? "im" : "am"} ${d}`, fr: `mis à jour ${luna ? "en" : "le"} ${d}` })[l],
  adoptat: (d, l) => ({ en: `adopted on ${d}`, ro: `adoptat la ${d}`, de: `beschlossen am ${d}`, fr: `adopté le ${d}` })[l],
  stand: (d, l) => ({ en: `as of ${d}`, ro: `versiunea din ${d}`, de: `Stand: ${d}`, fr: `à jour en ${d}` })[l],
  data: (d) => d,
  fara: (_d, l) => ({ en: "no date shown", ro: "fără dată", de: "ohne Datum", fr: "non daté" })[l],
  nemodificat: (_d, l) => ({ en: "never amended since", ro: "nemodificat de atunci", de: "seitdem nicht geändert", fr: "jamais modifié" })[l],
};

/** A source's version line in the page's language: "last amended on 29 June 2026 (BGBl. 2026 I Nr. 197)". */
export function textVersiune(v: PasVersiune[], l: LimbaTrusa): string {
  let out = "";
  for (const p of v) {
    if (typeof p === "string") { out += ` (${p})`; continue; }
    const s = Array.isArray(p) ? FELURI[p[0]](p[1] ? zi(p[1], l) : "", l, !!p[1] && p[1].length === 7) : p[l];
    out += out ? `, ${s}` : s;
  }
  return out;
}

/** A source's title, with what the cited part is about in the page's language: "Geldwäschegesetz, § 8 (Kopien …)". */
export const titluSursa = (s: SursaTrusa, l: LimbaTrusa) => s.despre ? `${s.titlu} (${s.despre[l]})` : s.titlu;

/** The whole kit: the rule, what may be asked (per stage or per person), what may not, the sources. */
export function htmlTrusa(x: Trusa, h = 2): string {
  const l = limbaTrusa(limbaCurenta());
  const ls = limbaSursei(x);
  const el = (e: Trusa["interzise"]["elemente"][number]) => `<li>${esc(e.t[l])}${e.o && ls !== l ? ` <q lang="${ls}">${esc(e.o)}</q>` : ""}</li>`;
  return `<p>${esc(x.regula[l])}</p><p class="banda">${esc(t("trusa.info"))}</p>
    ${x.permise.map((s) => `<h${h}>${esc(s.sectiune[l])}</h${h}>${s.grupuri.map((g) => `<h${h + 1}>${esc(g.titlu[l])}${g.cate ? ` <small>· ${esc(g.cate[l])}</small>` : ""}</h${h + 1}>
      <ul class="trusa">${g.elemente.map(el).join("")}</ul>`).join("")}`).join("")}
    <h${h}>${esc(x.interzise.titlu[l])}</h${h}><ul class="trusa nu">${x.interzise.elemente.map(el).join("")}</ul>
    <h${h}>${esc(t("trusa.surse"))}</h${h}><ul class="trusa surse">${x.surse.map((s) => `<li><a href="${esc(s.url)}" rel="noopener" target="_blank"${s.despre ? "" : ` lang="${ls}"`}>${esc(titluSursa(s, l))}</a> <small>· ${esc(textVersiune(s.versiune, l))}</small></li>`).join("")}</ul>
    <p class="mic">${esc(t("trusa.verificat", { data: data(x.verificat) }))}</p>`;
}
