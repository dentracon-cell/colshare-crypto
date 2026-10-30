// The three forms the consumer terms promise (docs/legal-acte/: terms 6.3, 7.2 and 10.1): withdrawing from the
// subscription, cancelling it, and reporting a link or an ask. There is no account to look anyone up in, so each asks
// for what identifies the purchase (the Google Play order number, optional: the law asks only that the person can
// identify the contract easily, and Play Console finds an order by the buyer's e-mail too) or the link (its
// identifier), and goes to our inbox through the contact path (colshare-web/api/_lib/contact.js), which sets Reply-To
// to the person's address and at once sends them an acknowledgement it writes itself from `confirmare` (CRD art.
// 11a(4), DSA art. 16(4)). Nothing is stored. The e-mail to the inbox is in Romanian for the owner, with the person's
// language named.

import { RAMBURSARE_INTEGRALA } from "./legal.ts";

export type FelFormular = "retragere" | "reziliere" | "semnalare";

/** A Google Play order number: GPA.1234-5678-9012-34567, a renewal adds ..N. */
const COMANDA = /^GPA\.\d{4}-\d{4}-\d{4}-\d{5}(?:\.\.\d{1,4})?$/;
const ID = /^[A-Za-z0-9_-]{22}$/;

/** The order number as typed or pasted (spaces, lower case, a dot-less "GPA 1234…"), or undefined when it is not one. */
export function comandaDin(text: string): string | undefined {
  const s = text.normalize("NFKC").replace(/\s+/g, "").toUpperCase().replace(/^GPA(?=\d)/, "GPA.").replace(/[‐-―−]/g, "-");
  return COMANDA.test(s) ? s : undefined;
}

/**
 * The identifier of a send link or an ask (the characters after # up to the first "."), from the whole link or the
 * identifier alone, and what kind it is when the link says. The key (after the first ".") is never part of the result,
 * so it cannot leave the page.
 */
export function idDinLink(text: string): { id: string; fel?: "link" | "cerere" } | undefined {
  const s = text.trim();
  const m = /(?:\/(p|a)\/?)?#([A-Za-z0-9_-]{22})(?:[.\s]|$)/.exec(s);
  if (m) return { id: m[2], ...(m[1] ? { fel: m[1] === "p" ? "link" as const : "cerere" as const } : {}) };
  const singur = s.split(".")[0];
  return ID.test(singur) ? { id: singur } : undefined;
}

export interface CampuriFormular {
  nume: string;
  email: string;
  /** retragere, reziliere */
  comanda?: string;
  /** reziliere: "ordinar" at the end of the paid period, "extra" at once for a serious reason (with `motiv`) */
  cand?: "ordinar" | "extra";
  /** reziliere "extra", semnalare: in the person's words */
  motiv?: string;
  /** semnalare: what idDinLink gave */
  link?: { id: string; fel?: "link" | "cerere" };
  /** semnalare: the statement of good faith (DSA art. 16(2)(d)) */
  bunaCredinta?: boolean;
  /** semnalare: an offence against children (Directive 2011/93/EU arts. 3-7), for which name and address may be left out */
  copii?: boolean;
}

/** The structured part of a form, which the contact path writes the person's acknowledgement from. */
export interface Confirmare { fel: FelFormular; limba: string; comanda?: string; cand?: "ordinar" | "extra"; id?: string }

const comandaRand = (comanda?: string) => comanda
  ? `Comanda Google Play: ${comanda}`
  : "Comanda Google Play: nescrisă; caut-o în Play Console (Gestionarea comenzilor) după adresa de e-mail de mai jos.";

const SUBIECT: Record<FelFormular, string> = {
  retragere: "RETRAGERE DIN CONTRACT",
  reziliere: "REZILIERE",
  semnalare: "SEMNALARE (DSA)",
};

/** The server sends the acknowledgement itself; a failed one reaches the inbox as a separate alert (contact.js). */
const CONFIRMARE_AUTOMATA = "Confirmarea de primire pleacă automat la persoană (dacă nu pleacă, vine o alertă separată).";

/**
 * The body for POST /api/contact: { nume, email, mesaj }, `confirmare` whenever there is an address to acknowledge to,
 * and `semnalare_copii` for a report of an offence against children sent without an address (the contact path accepts
 * no other message without one); `aplicatia` the app's name, `cand` when it was sent, `integrala` whether a withdrawal
 * refunds the whole price (legal.ts RAMBURSARE_INTEGRALA, the rule the page and the terms state).
 */
export function mesajFormular(fel: FelFormular, c: CampuriFormular, o: { aplicatia: string; limba: string; cand: Date; integrala?: boolean }): { nume: string; email: string; mesaj: string; confirmare?: Confirmare; semnalare_copii?: true } {
  const ora = o.cand.toISOString().replace("T", " ").slice(0, 16);
  const randuri = [`${SUBIECT[fel]} · aplicația de acte (${o.aplicatia})`, ""];
  if (fel === "retragere") {
    randuri.push(`Declarație: mă retrag din contractul pentru abonamentul ${o.aplicatia}.`, comandaRand(c.comanda),
      CONFIRMARE_AUTOMATA,
      `De făcut: ${(o.integrala ?? RAMBURSARE_INTEGRALA) ? "rambursarea întreagă a comenzii" : "rambursarea prețului fără zilele avute"} în Play Console (Gestionarea comenzilor), apoi răspuns la acest e-mail.`);
  } else if (fel === "reziliere") {
    randuri.push(comandaRand(c.comanda),
      c.cand === "extra" ? `Reziliere: imediat, pentru un motiv întemeiat. Motivul: ${c.motiv ?? ""}` : "Reziliere: la sfârșitul perioadei deja plătite.",
      CONFIRMARE_AUTOMATA,
      "De făcut: anularea abonamentului în Play Console, apoi răspuns la acest e-mail cu data la care se încheie abonamentul (BGB § 312k(4)).");
  } else {
    randuri.push(`Identificatorul: ${c.link?.id}${c.link?.fel ? ` (${c.link.fel === "link" ? "link de trimitere, /p/" : "cerere de acte, /a/"})` : ""}`,
      `Motivul: ${c.motiv ?? ""}`, `Declarație de bună-credință: ${c.bunaCredinta ? "da" : "nu"}`,
      ...(c.copii ? ["Infracțiune împotriva copiilor (DSA art. 16(2)): da. De tratat întâi; numele și adresa pot lipsi."] : []),
      `De făcut: node scripts/acte-admin.mjs scoate ${c.link?.id} dacă semnalarea e întemeiată, apoi răspuns cu decizia.`);
  }
  randuri.push("", `Trimis: ${ora} UTC · limba persoanei: ${o.limba}`);
  const email = c.email.trim();
  // What the server writes the acknowledgement from; it takes no free text from the page.
  const confirmare: Confirmare = { fel, limba: o.limba, ...(c.comanda ? { comanda: c.comanda } : {}), ...(c.cand ? { cand: c.cand } : {}), ...(c.link ? { id: c.link.id } : {}) };
  return {
    nume: c.nume.trim(), email, mesaj: randuri.join("\n"), ...(email ? { confirmare } : {}),
    ...(fel === "semnalare" && c.copii && !email ? { semnalare_copii: true as const } : {}),
  };
}
