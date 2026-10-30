// The papers app's free tier and its subscription (docs/aplicatia-acte.md, decisions.md 2026-10-19 "The papers app").
// Proposals, kept here so the owner changes them in one place once the first month's numbers are in. The limits only
// stop adding: nothing kept is ever locked, and asking for papers and receiving them are never limited.

/** What the free tier allows. */
export const GRATUIT = {
  /** Papers kept on the phone: a rental application alone is five (UX research, docs/aplicatia-acte-ux.md). */
  acte: 10,
  /** Folders per use. */
  dosare: 1,
  /** Send links made in one calendar month. */
  linkuriPeLuna: 3,
  /** ID card or passport readings asked for ("Read the fields"), ever; the reading a safe copy makes is free. */
  citiri: 1,
} as const;

/** Google Play: one subscription, two base plans; the prices are set in Play Console and shown as Play gives them. */
export const ABONAMENT = {
  produs: "abonament",
  planuri: ["anual", "lunar"] as const,
  /** Shown only in a browser trying the paid screens (?plata=proba); the app shows Play's price or none (A5). */
  preturiPropuse: { lunar: "€3.99", anual: "€24.99" },
} as const;

export type Plan = (typeof ABONAMENT.planuri)[number];

/** What a limit stops. */
export type Limita = "acte" | "dosare" | "linkuri" | "citiri";

export interface Folosire {
  acte: number;
  dosare: number;
  /** "2026-10": the month `linkuri` counts. */
  luna: string;
  linkuri: number;
  citiri: number;
}

/** The month a link counts in, on the phone's own clock: the free links come back on the 1st where the person is, not in UTC. */
export const lunaDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** The limit adding one more would cross on the free tier; undefined when it may go on (always, when paid). */
export function limitaAtinsa(ce: Limita, f: Folosire, platit: boolean, azi = new Date()): Limita | undefined {
  if (platit) return undefined;
  const linkuri = f.luna === lunaDe(azi) ? f.linkuri : 0;
  const n = ce === "acte" ? f.acte : ce === "dosare" ? f.dosare : ce === "linkuri" ? linkuri : f.citiri;
  const max = ce === "acte" ? GRATUIT.acte : ce === "dosare" ? GRATUIT.dosare : ce === "linkuri" ? GRATUIT.linkuriPeLuna : GRATUIT.citiri;
  return n >= max ? ce : undefined;
}
