// A proof's statement (./dovada.ts) in words, the same in the app, on the check page (colshare-web/v/) and on a receipt.
import type { Declaratie } from "./dovada.ts";
import { data, t, limbaCurenta, LOCALE } from "./limba.ts";

/** A receipt's moment ("2026-10-19T14:32Z") as the reader writes it, with the time. */
export const dataOra = (iso: string) =>
  new Date(iso).toLocaleString(LOCALE[limbaCurenta()], { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Who papers went to, when the receipt names nobody. */
export const catreText = (d: Extract<Declaratie, { fel: "chitanta" }>) => d.catre || t(d.cum === "cerere" ? "chitanta.catre.cerere" : "chitanta.catre.link");

/** The statement's fields as label and value, the empty ones left out. */
export function campuriDeclaratie(d: Declaratie): [string, string][] {
  const c: [string, string][] = d.fel === "copie"
    ? [[t("dovada.camp.act"), t(`dovada.act.${d.act}`)], [t("dovada.camp.pentru"), d.pentru], [t("dovada.camp.scop"), d.scop], [t("dovada.camp.facuta"), data(d.data)]]
    : d.fel === "primire"
      ? [[t("chitanta.camp.cand"), dataOra(d.data)], [t("dovada.camp.de"), d.de], [t("dovada.camp.primit"), d.catre], [t("chitanta.camp.pentru"), d.pentru], [t("chitanta.camp.acte"), String(d.acte)]]
      : d.fel === "trimitere"
        ? [[t("chitanta.camp.cand"), dataOra(d.data)], [t("dovada.camp.de"), d.de], [t("chitanta.camp.catre"), d.catre], [t("chitanta.camp.pentru"), d.pentru],
          [t("chitanta.camp.cum"), t(d.cum === "firma" ? "chitanta.cum.firma" : "chitanta.cum.link")], [t("chitanta.camp.acte"), String(d.acte)]]
        : [[t("chitanta.camp.cand"), dataOra(d.data)], [t("chitanta.camp.catre"), catreText(d)], [t("chitanta.camp.pentru"), d.pentru],
      [t("chitanta.camp.cum"), t(`chitanta.cum.${d.cum}`)], [t("chitanta.camp.acte"), String(d.acte)]];
  return c.filter(([, v]) => v);
}
