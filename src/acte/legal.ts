// What Colshare's consumer terms and privacy notice (source in docs/legal-acte/, published on colshare.app since
// 2026-10-20) say the app and its pages show: where the two documents and the three forms live, and the owner's choices
// the texts depend on. The lawyer's and the accountant's review is still open (docs/legal-acte/README.md); the forms'
// pages are noindex and linked only from the app and the link pages.
import aplicatie from "./aplicatie.json";
import { limbaCurenta, LIMBI_VERIFICATE, t, type Cheie } from "./limba.ts";
import type { Plan } from "./planuri.ts";

/** The terms' version accepted at the first start (the drafts' VERSION), kept on the phone. */
export const VERSIUNE_TERMENI_ACTE = "0.11";

/**
 * The published version of the terms and the privacy notice (colshare-web/acte/versiune-termeni.json, made by
 * scripts/acte-legal.mjs): terms 12.1 "we show the new version in the app at least 30 days before it takes effect and
 * say what changes", 12.2 a change to the person's disadvantage applies only once accepted in the app, privacy 5.6/15.
 * `aviz` carries a notice of a change to the app (terms 8.4) or of its end (13.2).
 */
export interface VersiuneTermeni {
  versiune: string;
  /** YYYY-MM-DD, the day it applies from. */
  inVigoare: string;
  acord: boolean;
  rezumat?: Partial<Record<string, string>>;
  aviz?: { id: string; data?: string; text: Partial<Record<string, string>> } | null;
}

/** Where the app reads it, on LINK_DOMAIN. */
export const CALE_VERSIUNE = "/acte/versiune-termeni.json";

/** "0.10" after "0.9": dotted numbers compared part by part. */
export function maiNoua(a: string, b: string): boolean {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d > 0;
  }
  return false;
}

const text = (x: unknown) => typeof x === "string" && x.length > 0 && x.length <= 600;
const texte = (x: unknown) => !!x && typeof x === "object" && Object.values(x).every(text);

/** The file's shape, checked: anything else is no notice. */
export function citescVersiunea(x: unknown): VersiuneTermeni | undefined {
  if (!x || typeof x !== "object") return undefined;
  const v = x as Record<string, unknown>;
  if (typeof v.versiune !== "string" || !/^\d+(\.\d+)*$/.test(v.versiune) || typeof v.inVigoare !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.inVigoare)) return undefined;
  if (v.rezumat !== undefined && !texte(v.rezumat)) return undefined;
  const a = v.aviz as Record<string, unknown> | null | undefined;
  const aviz = a && typeof a === "object" && typeof a.id === "string" && /^[\w.-]{1,40}$/.test(a.id) && texte(a.text) && (a.data === undefined || (typeof a.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.data)))
    ? { id: a.id, text: a.text as Record<string, string>, ...(typeof a.data === "string" ? { data: a.data } : {}) } : null;
  return { versiune: v.versiune, inVigoare: v.inVigoare, acord: v.acord === true, ...(v.rezumat ? { rezumat: v.rezumat as Record<string, string> } : {}), aviz };
}

/**
 * The published version, read at start (privacy 5.6): a plain GET of a public file, no cookie, no referrer, nothing
 * about the person in it; offline or on any failure, undefined (nothing is shown, nothing is kept).
 */
export async function iauVersiuneaTermenilor(domeniu = aplicatie.domeniu, f: typeof fetch = globalThis.fetch): Promise<VersiuneTermeni | undefined> {
  if (globalThis.navigator?.onLine === false) return undefined;
  try {
    const r = await f(`${domeniu}${CALE_VERSIUNE}`, { method: "GET", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
    return r.ok ? citescVersiunea(await r.json()) : undefined;
  } catch {
    return undefined;
  }
}

/** What the phone keeps: the version accepted (and when), the version whose notice was dismissed, the notices dismissed. */
export interface StareTermeni { acceptata?: string; vazuta?: string; avize?: string[] }

/**
 * What the app shows, once: "termeni" when the published version is newer than the one accepted and than the one
 * whose notice was dismissed (one that asks for acceptance comes back each start until accepted: terms 12.2); "aviz"
 * for a notice not dismissed yet. Nothing when the version is the one accepted.
 */
export function avizDeAratat(p: VersiuneTermeni | undefined, s: StareTermeni): { fel: "termeni" | "aviz"; v: VersiuneTermeni } | undefined {
  if (!p) return undefined;
  const fata = s.acceptata ?? VERSIUNE_TERMENI_ACTE;
  if (maiNoua(p.versiune, fata) && (p.acord || !s.vazuta || maiNoua(p.versiune, s.vazuta))) return { fel: "termeni", v: p };
  if (p.aviz && !(s.avize ?? []).includes(p.aviz.id)) return { fel: "aviz", v: p };
  return undefined;
}

/** A text from the file in the reader's language: the documents' four, else English. */
export const textInLimba = (x: Partial<Record<string, string>> | undefined) =>
  x?.[LIMBI_VERIFICATE.includes(limbaCurenta()) ? limbaCurenta() : "en"] ?? x?.en;

/**
 * Terms 7.3 (Q2): true, the whole price comes back on withdrawal within 14 days even after use (the owner's choice in
 * the drafts); false, the price less the days already had.
 */
export const RAMBURSARE_INTEGRALA: boolean = true;

/**
 * Terms 6.7 (Q3), a yearly plan for someone living in Germany (§309 Nr. 9 BGB): "preaviz", after the first year it ends
 * at any time with a month's notice and the rest is refunded (the drafts); "lunar", only the monthly plan is sold there
 * (set the yearly base plan's regions in Play Console too); "fara-reinnoire", the yearly plan runs one year and stops.
 */
export type AnualGermania = "preaviz" | "lunar" | "fara-reinnoire";
export const ANUAL_GERMANIA: AnualGermania = "preaviz";

/** SUPPORT_EMAIL: the address the forms name when they cannot send. */
export const EMAIL_SUPORT = "service@colshare.app";

/** The pages, under LINK_DOMAIN (aplicatie.json `domeniu`); the forms' pages are in colshare-web/acte/. */
export const PAGINI = {
  termeni: "/acte/termeni/",
  confidentialitate: "/acte/confidentialitate/",
  retragere: "/acte/retragere/",
  reziliere: "/acte/reziliere/",
  semnalare: "/acte/semnalare/",
} as const;
export type PaginaLegala = keyof typeof PAGINI;

/** A page's address in the reader's language: `domeniu` "" on the site's own pages (relative), the app's otherwise. */
/** The legal pages exist in the four reviewed languages; the others read them in English. */
export const adresaLegala = (p: PaginaLegala, domeniu = aplicatie.domeniu) => `${domeniu}${PAGINI[p]}?l=${LIMBI_VERIFICATE.includes(limbaCurenta()) ? limbaCurenta() : "en"}`;

/**
 * Whether the person lives in Germany, for terms 6.7: the country of their Play account when Play says it
 * (`tara`, AbonamentPlugin.tara), else the phone's language settings (de-DE, en-DE).
 */
export function inGermania(tara?: string, limbi: readonly string[] = globalThis.navigator?.languages ?? [globalThis.navigator?.language ?? ""]): boolean {
  if (tara) return tara.toUpperCase() === "DE";
  return limbi.some((l) => /^[a-z]{2,3}-DE\b/i.test(l));
}

/** The plans offered: in Germany only the monthly one when the owner chose so (ANUAL_GERMANIA "lunar"). */
export function planuriOferite(germania: boolean, regula: AnualGermania = ANUAL_GERMANIA): Plan[] {
  return regula === "lunar" && germania ? ["lunar"] : ["anual", "lunar"];
}

/**
 * What the paywall says before a purchase (terms 6 and 7; Google Play shows the price): how the plan renews, the
 * German rule for a yearly plan, how to cancel, the right of withdrawal, and that nothing kept is locked.
 */
export function conditiiPlata(p: Plan, germania: boolean, o: { regula?: AnualGermania; integrala?: boolean } = {}): Cheie[] {
  const regula = o.regula ?? ANUAL_GERMANIA;
  return [
    p === "lunar" ? "plan.reinnoire.lunar" : germania && regula === "fara-reinnoire" ? "plan.reinnoire.anual.fara" : "plan.reinnoire.anual",
    ...(p === "anual" && regula === "preaviz" ? ["plan.germania" as const] : []),
    "plan.anulare",
    (o.integrala ?? RAMBURSARE_INTEGRALA) ? "plan.retragere" : "plan.retragere.partial",
    "plan.nota",
  ];
}

const escHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const ancora = (href: string, text: string) => `<a href="${escHtml(href)}" target="_blank" rel="noopener">${escHtml(text)}</a>`;

/** "By continuing you accept the terms of use…" with both documents linked, as HTML. */
export function acceptHtml(domeniu = aplicatie.domeniu): string {
  return escHtml(t("legal.accept"))
    .replace("{termeni}", () => ancora(adresaLegala("termeni", domeniu), t("legal.termeni.in")))
    .replace("{confidentialitate}", () => ancora(adresaLegala("confidentialitate", domeniu), t("legal.confidentialitate.in")));
}

/** The link pages' footer: the two documents and, where a link or an ask is open, how to report one. */
export function piciorHtml(semnalare: boolean): string {
  const l: [PaginaLegala, Cheie][] = [["termeni", "legal.termeni"], ["confidentialitate", "legal.confidentialitate"]];
  if (semnalare) l.push(["semnalare", "legal.semnalez"]);
  return `<nav class="picior">${l.map(([p, k]) => ancora(adresaLegala(p, ""), t(k))).join("")}</nav>`;
}
