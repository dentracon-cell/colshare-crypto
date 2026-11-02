// A send link's opening, signed (decisions.md 2026-11-02, "A link's receipt is made once it is opened"). When a link's
// last chunk is downloaded, and every chunk before it was, colshare.app signs the link, its package's digest
// (./link.ts rezumatPachet), the digest of the receipt's papers the sender committed when it made the link, when it was
// made and the moment, with its certificate key (colshare-web/api/_acte/core.js textDeschidereLink): the package, exactly
// as uploaded, was taken whole once. When the link was opened in a Colshare app, that app also signs the link, the
// digest and the digest of the papers it found inside with its own key (`semnezPrimirea`); the relay takes it only from
// who downloaded the last chunk (a one-time code) and near the opening, and signs that it took it. Neither says who: a
// key is a person only when the reader has it in People.
//
// The sender's app then makes the receipt (R2, ./dovada.ts): its annex, the signatures as base64url JSON, goes into the
// PDF's proof after the receipt's own signature, and the receipt's statement carries 128 bits of the annex's SHA-256,
// so an annex can't be moved to another receipt; the papers' digest and the day of the send tie it to the statement's
// (attack round 14, M6 and M7). A printed receipt keeps only the statement: the opening as the sender wrote it.
import { CHEI_CERTIFICAT } from "./firma.ts";
import { semnezText, sha256Hex, tineText, type CheieSemnare, type Declaratie } from "./dovada.ts";
import { b64url, dinB64url } from "./link.ts";
import { estePublica } from "../core/teren/lacat.ts";

const ID = /^[A-Za-z0-9_-]{22}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const HEX32 = /^[0-9a-f]{32}$/;
const LA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
const LA_MINUT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/;
const SIG = /^[A-Za-z0-9_-]{86}$/;
const CHEIE = /^[A-Za-z0-9_-]{87}$/;
/** How far the app's confirmation may be from the opening (as the relay's PRIMIT_MARJA). */
const MARJA = 15 * 60_000;

/**
 * What colshare.app signs when a link is opened (as the relay's textDeschidereLink): the link, its package's digest, the
 * digest of the receipt's papers the sender committed when it made the link (`r`), when it was made (`c`), the moment.
 */
export const textDeschidere = (lid: string, d: string, r: string, c: string, la: string) => `colshare-link-deschis-v2\n${lid}\n${d}\n${r}\n${c}\n${la}`;
/**
 * What the receiving app signs: the link, its package's digest, the digest of the papers it found inside (as a receipt
 * computes it from their bytes: what "signed for them" means), when (to the minute) and its own key.
 */
export const textPrimire = (lid: string, d: string, h: string, la: string, k: string) => `colshare-link-primit-v2\n${lid}\n${d}\n${h}\n${la}\n${k}`;
/** What colshare.app signs when it takes the app's confirmation from who downloaded the link (the relay's textPrimireLink). */
export const textPrimireLuata = (lid: string, k: string, la: string, s: string) => `colshare-link-primit-luat-v1\n${lid}\n${k}\n${la}\n${s}`;

/** The receiving app's confirmation: its public key (raw P-256, b64url), when, its signature; `l`, colshare.app's. */
export interface Primire {
  k: string;
  la: string;
  s: string;
  l?: string;
}

/**
 * A receipt's annex: the link, its digest, the papers' digest the sender committed (`r`), when the link was made (`c`),
 * colshare.app's opening (moment and signature), the app's confirmation.
 */
export interface Deschidere {
  i: string;
  d: string;
  r: string;
  c: string;
  la: string;
  s: string;
  p?: Primire;
}

/** The digest of papers as a receipt's statement carries it: 128 bits of the SHA-256 of their SHA-256s in order. */
export async function rezumatActe(fisiere: Uint8Array[]): Promise<string> {
  const sha: string[] = [];
  for (const f of fisiere) sha.push(await sha256Hex(f));
  return (await sha256Hex(new TextEncoder().encode(sha.join("")))).slice(0, 32);
}

/** The receiving app's confirmation of link `lid` (package digest `d`, papers' digest `h`), signed now with this phone's key. */
export async function semnezPrimirea(k: CheieSemnare, lid: string, d: string, h: string, acum = new Date()): Promise<Primire> {
  const la = `${acum.toISOString().slice(0, 16)}Z`;
  return { k: k.publica, la, s: b64url(await semnezText(k, textPrimire(lid, d, h, la, k.publica))) };
}

/** Whether colshare.app signed this opening (one of its certificate keys). */
export async function tineDeschiderea(x: Deschidere, chei: string[] = CHEI_CERTIFICAT): Promise<boolean> {
  for (const k of chei) if (await tineText(dinB64url(k), dinB64url(x.s), textDeschidere(x.i, x.d, x.r, x.c, x.la))) return true;
  return false;
}

/**
 * Whether the app's confirmation holds: its key signed this link, digest and papers (`h`), colshare.app signed that it
 * took it from who downloaded the link, and it was made near the opening (`la`).
 */
export async function tinePrimirea(lid: string, d: string, h: string, la: string, p: Primire, chei: string[] = CHEI_CERTIFICAT): Promise<boolean> {
  const k = dinB64url(p.k);
  if (!estePublica(k) || !p.l || Math.abs(Date.parse(`${p.la.slice(0, 16)}:00Z`) - Date.parse(la)) > MARJA) return false;
  if (!(await tineText(k, dinB64url(p.s), textPrimire(lid, d, h, p.la, p.k)))) return false;
  for (const c of chei) if (await tineText(dinB64url(c), dinB64url(p.l), textPrimireLuata(lid, p.k, p.la, p.s))) return true;
  return false;
}

/** The relay's answer read: an opening with its signature, and the app's confirmation when it has the right shape. */
export function deschidereDin(lid: string, x: { la?: unknown; d?: unknown; r?: unknown; c?: unknown; sem?: unknown; p?: unknown }): Deschidere | undefined {
  if (!ID.test(lid) || typeof x.la !== "string" || !LA.test(x.la) || typeof x.d !== "string" || !HEX64.test(x.d) || typeof x.sem !== "string" || !SIG.test(x.sem)) return undefined;
  if (typeof x.r !== "string" || (x.r !== "" && !HEX32.test(x.r)) || typeof x.c !== "string" || !LA.test(x.c)) return undefined;
  const p = x.p as Partial<Primire> | undefined;
  const bun = p && typeof p.k === "string" && CHEIE.test(p.k) && typeof p.la === "string" && LA_MINUT.test(p.la) && typeof p.s === "string" && SIG.test(p.s) && typeof p.l === "string" && SIG.test(p.l);
  return { i: lid, d: x.d, r: x.r, c: x.c, la: x.la, s: x.sem, ...(bun ? { p: { k: p.k!, la: p.la!, s: p.s!, l: p.l! } } : {}) };
}

export const anexa = (x: Deschidere) => b64url(new TextEncoder().encode(JSON.stringify(x)));

/** 128 bits of the annex's SHA-256: what the receipt's statement carries (`o`). */
export const legatura = async (a: string) => (await sha256Hex(new TextEncoder().encode(a))).slice(0, 32);

export function citesteAnexa(a: string): Deschidere | undefined {
  try {
    const x = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(dinB64url(a))) as Record<string, unknown>;
    return typeof x.i === "string" ? deschidereDin(x.i, { la: x.la, d: x.d, r: x.r, c: x.c, sem: x.s, p: x.p }) : undefined;
  } catch {
    return undefined;
  }
}

/** The opening as the receipt's statement writes it: the relay's moment, to the minute. */
export const minutul = (la: string) => `${la.slice(0, 16)}Z`;

/** What a receipt's annex proves, checked against its statement. */
export interface AnexaVerificata {
  /** colshare.app signed this opening, at the moment the statement says. */
  colshare: boolean;
  /** The receiving app's confirmation, when the annex has one: whether it holds, its key and when. */
  app?: { tine: boolean; publica: Uint8Array; la: string };
}

/**
 * A receipt's annex (the third part of its PDF proof) checked: it must be the one the statement names (`o`), for the
 * opening it states, the papers it lists (`h`, which the sender committed when it made the link) and a send no earlier
 * than the link was made and no later than it was opened; then colshare.app's signature and the app's. Undefined when
 * the annex is not this receipt's.
 */
export async function verificAnexa(d: Declaratie, a: string, chei: string[] = CHEI_CERTIFICAT): Promise<AnexaVerificata | undefined> {
  if (d.fel !== "chitanta" || !d.o || !d.deschis || await legatura(a) !== d.o) return undefined;
  const x = citesteAnexa(a);
  if (!x || minutul(x.la) !== d.deschis || !!x.p !== !!d.app || x.r !== d.h || d.data < minutul(x.c) || d.data > d.deschis) return undefined;
  const colshare = await tineDeschiderea(x, chei);
  return { colshare, ...(x.p ? { app: { tine: await tinePrimirea(x.i, x.d, x.r, x.la, x.p, chei), publica: dinB64url(x.p.k), la: x.p.la } } : {}) };
}
