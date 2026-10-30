// Colshare Business on the client (decisions.md 2026-10-21, "Colshare Business, phase A"): the firm certificate's check
// (the /a/ page and the app show a firm's ask as checked), the seat's signed calls to /api/firme, and the firm's key
// ring (one P-256 pair per generation) that every seat holds, sealed to each seat's own key when it travels. The same
// file runs in the desk (./birou/), the ask page, the app and the tests. WebCrypto only.
//
// A certificate: "<b64url JSON { v, f (registered name), c (tax ID), t (country), k (the firm's public key), g, p
// (paid until, YYYY-MM-DD) }>.<b64url ECDSA P-256 signature over 'colshare-firma-v1\n' + the first part>", signed by
// colshare.app's server key (colshare-web/api/_firme/core.js), checked against the keys below.
import { deschideCuLacat, estePublica, importaPrivata, perecheLacat, sigileazaPentruLacat } from "../core/teren/lacat.ts";
import { aleator, b64url, citesteAdresa, coboara, curat, curatNota, deschideDinCerere, dinB64url, EroareRelay, facLink, ID_TRUSA, sigileazaPentruCerere, urca, type Adresa, type Relay } from "./link.ts";
import { despacheteaza, impacheteaza, type Pachet } from "./pachet.ts";

const enc = (s: string) => new TextEncoder().encode(s);
const EC = { name: "ECDSA", namedCurve: "P-256" } as const;
const SHA = { name: "ECDSA", hash: "SHA-256" } as const;

/**
 * colshare.app's certificate keys (raw P-256, b64url): the one the server signs with, then a spare kept offline
 * (scripts/colshare-chei.mjs), so the server can move to it without a new app.
 */
declare const __CHEI_CERTIFICAT_PROBA__: string[] | undefined;
export const CHEI_CERTIFICAT: string[] = typeof __CHEI_CERTIFICAT_PROBA__ !== "undefined" ? __CHEI_CERTIFICAT_PROBA__ : [
  "BOTRmUh8deHesjL7583KLXQ3MeqqRe5P0SkEFWuyb-jnCbRo2cCKxTVS0512jrmZO-LXxfZB9TVnD0t0B5i24LE",
  "BNlRy20Pmqk9dn58GMni-G7_JpK_jaipSIHv-kXFHuNbZ141BY3BpnmveiXfUX4EB8CBMVUZfFMy6SZYNvYJmXQ",
];

/** The labels of what is sealed to the firm's key and to a seat's key: never opened as anything else. */
export const INFO_INEL = enc("colshare-inel-v1");
export const INFO_META = enc("colshare-meta-v1");
/** A person's key sealed to one of their devices, and an ask's own key sealed to its person and to the recovery key. */
export const INFO_PERSOANA = enc("colshare-persoana-v1");
export const INFO_CHEIE_CERERE = enc("colshare-cheie-cerere-v1");
/** A person's journal entry, sealed to the person's key. */
export const INFO_JURNAL = enc("colshare-jurnal-v1");

/** A firm certificate, checked. */
export interface Certificat {
  firma: string;
  cui: string;
  tara: string;
  cheie: Uint8Array;
  g: number;
  /** Paid until (YYYY-MM-DD). */
  pana: string;
}

const CERT = /^[A-Za-z0-9_-]{20,1200}\.[A-Za-z0-9_-]{86}$/;

/**
 * A certificate checked: the signature by one of `chei`, the day not past, and (when given) the ask's public key the
 * firm's. Undefined for anything else, so a page shows the ask as an unchecked one.
 */
export async function verificCertificat(s: string | undefined, publica?: Uint8Array, chei: string[] = CHEI_CERTIFICAT, azi = new Date()): Promise<Certificat | undefined> {
  if (!s || !CERT.test(s)) return undefined;
  const [j, sig] = s.split(".");
  let ok = false;
  for (const k of chei) {
    try {
      const pub = await crypto.subtle.importKey("raw", dinB64url(k) as BufferSource, EC, false, ["verify"]);
      if (await crypto.subtle.verify(SHA, pub, dinB64url(sig) as BufferSource, enc(`colshare-firma-v1\n${j}`) as BufferSource)) { ok = true; break; }
    } catch { /* a key that does not import: the next */ }
  }
  if (!ok) return undefined;
  try {
    const x = JSON.parse(new TextDecoder().decode(dinB64url(j))) as Record<string, unknown>;
    if (x.v !== 1 || typeof x.f !== "string" || typeof x.c !== "string" || typeof x.t !== "string" || typeof x.k !== "string" || typeof x.p !== "string" || !Number.isInteger(x.g)) return undefined;
    const cheie = dinB64url(x.k);
    if (!estePublica(cheie) || !/^\d{4}-\d{2}-\d{2}$/.test(x.p) || x.p < azi.toISOString().slice(0, 10)) return undefined;
    if (publica && (publica.length !== cheie.length || publica.some((b, i) => b !== cheie[i]))) return undefined;
    return { firma: curat(x.f).slice(0, 120), cui: curat(x.c).slice(0, 20), tara: x.t.slice(0, 2), cheie, g: x.g as number, pana: x.p };
  } catch {
    return undefined;
  }
}

// ------------------------------------------------------------------ the seat and its signed calls

/** This browser as one of the firm's seats: its key pair (b64url PKCS#8 and raw public key) and id. */
export interface Loc {
  id: string;
  privata: string;
  publica: string;
}

/** One generation of the firm's key: what answers to asks opened under it are sealed to. */
export interface CheieFirma {
  g: number;
  privata: string;
  publica: string;
  /**
   * This generation's public key signed by the generation before it (textGeneratie): a device takes a new generation
   * only when it chains to one it holds, so whoever can write the server's store can't hand it a ring of their own
   * (attack test 2026-10-29, C1). None on the first generation, and on those made before the chain.
   */
  lant?: string;
}

/** The firm's key ring: every generation still useful, the newest last. */
export interface Inel {
  chei: CheieFirma[];
}

const sha256 = async (b: Uint8Array) => new Uint8Array(await crypto.subtle.digest("SHA-256", b as BufferSource));
/** A seat's id: the first 16 bytes of its public key's SHA-256 (colshare-web/api/_firme/core.js idLoc). */
export const idLoc = async (publica: Uint8Array) => b64url(await sha256(publica)).slice(0, 22);

async function semnez(privata: string, text: string): Promise<string> {
  const k = await crypto.subtle.importKey("pkcs8", dinB64url(privata) as BufferSource, EC, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign(SHA, k, enc(text) as BufferSource)));
}

/** A new seat key (not yet known to the server). */
export async function locNou(): Promise<Loc> {
  const p = await perecheLacat();
  return { id: await idLoc(p.publica), privata: b64url(p.privata), publica: b64url(p.publica) };
}

/** What a generation's predecessor signs: its number and public key. */
export const textGeneratie = (g: number, publica: string) => `colshare-generatie-v1\n${g}\n${publica}`;

/** A new generation of the firm's key; after `inainte`, chained to it (C1). */
export async function cheieFirmaNoua(g: number, inainte?: CheieFirma): Promise<CheieFirma> {
  const p = await perecheLacat();
  const publica = b64url(p.publica);
  return { g, privata: b64url(p.privata), publica, ...(inainte ? { lant: await semnez(inainte.privata, textGeneratie(g, publica)) } : {}) };
}

/** An answer from /api/firme with an error: its status and code (the desk says it in its language). */
export class EroareFirma extends EroareRelay {}

/**
 * The calls to /api/firme (`cale`: /api/plata for the checkout and the subscription page). With `loc`, the call is signed by the seat (colshare-web/api/_firme/core.js textApel): the
 * JSON as sent, the time, a nonce.
 */
export function apelFirma(server: string, trimite: typeof fetch = (...a) => fetch(...a), ceas = () => Date.now(), cale = "firme") {
  return async <T = Record<string, unknown>>(op: string, corp: object, loc?: Loc): Promise<T> => {
    let body: object = corp;
    if (loc) {
      const c = JSON.stringify(corp), t = ceas(), n = b64url(aleator(16));
      body = { loc: loc.id, t, n, c, sig: await semnez(loc.privata, `colshare-loc-v1\n${op}\n${loc.id}\n${t}\n${n}\n${c}`) };
    }
    let r: Response;
    try {
      r = await trimite(`${server}/api/${cale}/${op}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } catch {
      throw new EroareFirma(0);
    }
    const j = await r.json().catch(() => ({})) as T & { cod?: string };
    if (!r.ok) throw new EroareFirma(r.status, j.cod);
    return j;
  };
}
export type ApelFirma = ReturnType<typeof apelFirma>;

/** A seat's calls as a Relay (./link.ts), for coboara. */
const caRelay = (apel: ApelFirma, loc: Loc): Relay => (op, corp) => apel(op, corp, loc);

/** What the server says of the firm to a seat (core.js despre). */
export interface StareFirma {
  /** The firm's owner, as alCui gives it (none from a server before owners). */
  proprietar?: string;
  firma: string;
  cui: string;
  tara: string;
  plan: string;
  locuri: number;
  pana: string;
  platita: boolean;
  /** False for a firm bought online that we have not checked yet: no certificate, shown as unchecked. */
  verificata?: boolean;
  g: number;
  cheie: string;
  rotire?: true;
  /** Bought online: the subscription page opens Stripe's portal, and Settings › Devices sells one more. */
  online?: true;
  /** A licence bought online: its subscription's period (the price of a device more). */
  perioada?: "lunar" | "anual";
  /** `ultim`: the seat's last call, to the hour; `p`: the person it belongs to (none on a seat made before people). */
  scaune: { id: string; cheie: string; nume: string; creat: string; p?: string; ultim?: string; eu?: true; semn?: Semn }[];
  /** The firm's people (decisions.md 2026-10-24, "A Business seat is a person"). */
  persoane?: { id: string; cheie: string; nume: string; creat: string; predare?: { catre: string; la: string; de?: string | null; acceptat?: string }; vechi?: string[]; rotire?: true; semn?: Semn }[];
  /** The firm's recovery public key, once one was set. */
  recuperare?: string;
  /** The recovery key vouched for by a device of the firm (verificDirector). */
  recuperareSemn?: Semn;
  /** The recovery key replaced without the old file in the last 30 days: by which device and person, when (B3). */
  recuperareInlocuita?: { loc: string; p?: string; la: string };
  /** This device's person key, sealed to it, when it joined a person by invitation. */
  pinel?: { d: string };
  /** The licence e-mail, and the address clients' replies go to when the firm confirmed another. */
  email?: string;
  raspuns?: string;
  /** Days every device of the firm keeps papers, once a device brought its own or a person chose in Settings. */
  pastrare?: number;
  certificat?: string | null;
  /** `s`: the approving device's signature over what it sealed to this one (deschidInelNou). */
  inel?: { g: number; d: string; s?: string };
}

// ------------------------------------------------------------------ the key ring between seats

export async function sigilezInel(inel: Inel, catre: string): Promise<string> {
  return b64url(await sigileazaPentruLacat(dinB64url(catre), enc(JSON.stringify(inel)), INFO_INEL));
}

export async function deschidInel(loc: Loc, d: string): Promise<Inel | undefined> {
  const b = await deschideCuLacat(await importaPrivata(dinB64url(loc.privata)), dinB64url(loc.publica), dinB64url(d), INFO_INEL);
  if (!b) return undefined;
  try {
    const x = JSON.parse(new TextDecoder().decode(b)) as Inel;
    return Array.isArray(x.chei) && x.chei.every((k) => Number.isInteger(k.g) && typeof k.privata === "string" && typeof k.publica === "string") ? x : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A new device's first ring, opened only when the device that approved it signed what it sealed (textInelNou) with
 * `de`, its key, the one the safety code was made from (attack test 2026-10-29, C1); `pinel`, the person key sealed
 * with it. Undefined for a ring the server sealed on its own.
 */
export async function deschidInelNou(loc: Loc, de: string, x: { d: string; s?: string }, pinel?: string): Promise<Inel | undefined> {
  if (typeof x.s !== "string" || !(await verificSemnatura(dinB64url(de), textInelNou(loc.id, x.d, pinel), x.s))) return undefined;
  return deschidInel(loc, x.d);
}

// ------------------------------------------------------------------ people and the recovery key

/**
 * One person of the firm (decisions.md 2026-10-24, "A Business seat is a person"): the key their phone and computer
 * share. Their asks' own keys are sealed to it, so only their devices open what clients send them.
 */
export interface Persoana {
  id: string;
  privata: string;
  publica: string;
  /**
   * The person's keys before this one, newest first (decisions.md 2026-10-25, "A removed device's person key moves
   * on"): a device removed took the key it held, so the person has a new one; these open what came before it.
   */
  vechi?: { privata: string; publica: string }[];
}

/** Every key of a person, the current one first: what was sealed to any of them opens. */
export const cheiPersoana = (p: Persoana): { privata: string; publica: string }[] => [{ privata: p.privata, publica: p.publica }, ...(p.vechi ?? [])];

/** How many of a person's earlier keys a device keeps. */
const CHEI_VECHI = 20;

/**
 * The person's new key, when one of their devices was removed (StareFirma.persoane[].rotire): made on a device of theirs
 * that is left, sealed to every device of theirs (this one too), the key before kept to open what came before it.
 * Refused (409 "persoana-cheie") when another of their devices made one first: it comes sealed to this one.
 */
export async function rotescPersoana(apel: ApelFirma, loc: Loc, eu: Persoana, dispozitive: { id: string; cheie: string }[], inel?: Inel): Promise<Persoana> {
  const p = await perecheLacat();
  const nou: Persoana = { id: eu.id, privata: b64url(p.privata), publica: b64url(p.publica), vechi: cheiPersoana(eu).slice(0, CHEI_VECHI) };
  const pinel: Record<string, string> = {};
  for (const d of dispozitive) pinel[d.id] = await sigilezPersoana(nou, d.cheie);
  await apel("persoana-cheie", { cheie: nou.publica, vechi: eu.publica, pinel, ...(inel ? { semn: await semnezPersoana(inel, { id: nou.id, cheie: nou.publica }) } : {}) }, loc);
  return nou;
}

/** A new person's key, made on their first device. */
export async function persoanaNoua(): Promise<Persoana> {
  const p = await perecheLacat();
  return { id: await idLoc(p.publica), privata: b64url(p.privata), publica: b64url(p.publica) };
}

/** The firm's recovery key: its private half lives only in the recovery file, its public half in the licence. */
export interface CheieRecuperare {
  privata: string;
  publica: string;
}

export async function cheieRecuperareNoua(): Promise<CheieRecuperare> {
  const p = await perecheLacat();
  return { privata: b64url(p.privata), publica: b64url(p.publica) };
}

/** A person's key sealed to one of their devices (its seat key). */
export async function sigilezPersoana(p: Persoana, catre: string): Promise<string> {
  return b64url(await sigileazaPentruLacat(dinB64url(catre), enc(JSON.stringify(p)), INFO_PERSOANA));
}

/** A person's key, opened by the device it was sealed to; undefined when it does not open or does not hold. */
export async function deschidPersoana(loc: Loc, d: string): Promise<Persoana | undefined> {
  const b = await deschideCuLacat(await importaPrivata(dinB64url(loc.privata)), dinB64url(loc.publica), dinB64url(d), INFO_PERSOANA);
  if (!b) return undefined;
  try {
    const x = JSON.parse(new TextDecoder().decode(b)) as Persoana;
    const cheie = (k: unknown): k is { privata: string; publica: string } => !!k && typeof (k as Persoana).privata === "string" && typeof (k as Persoana).publica === "string";
    if (!cheie(x) || (x.vechi !== undefined && !(Array.isArray(x.vechi) && x.vechi.length <= CHEI_VECHI && x.vechi.every(cheie)))) return undefined;
    // The person's id is their first key's (the oldest kept).
    const prima = x.vechi?.length ? x.vechi[x.vechi.length - 1].publica : x.publica;
    if (x.id !== await idLoc(dinB64url(prima))) return undefined;
    return { id: x.id, privata: x.privata, publica: x.publica, ...(x.vechi?.length ? { vechi: x.vechi.map((k) => ({ privata: k.privata, publica: k.publica })) } : {}) };
  } catch {
    return undefined;
  }
}

/** A seat made before seats were people becomes one, under a person key made here. */
export const devinPersoana = (apel: ApelFirma, loc: Loc, p: Persoana, nume: string) =>
  apel("persoana-devin", { persoana: { cheie: p.publica, nume } }, loc);

/**
 * What a device keeps beside a person's paper so the recovery file also names whose it was: the client and the title,
 * sealed to the firm's recovery key on the device itself.
 */
export async function sigilezPentruRecuperare(recuperare: string, meta: { client: string; titlu: string }): Promise<string> {
  return b64url(await sigileazaPentruLacat(dinB64url(recuperare), enc(JSON.stringify({ client: meta.client.slice(0, 120), titlu: meta.titlu.slice(0, 200) })), INFO_META));
}

export async function deschidPentruRecuperare(r: CheieRecuperare, m: string): Promise<{ client: string; titlu: string } | undefined> {
  const b = await deschideCuLacat(await importaPrivata(dinB64url(r.privata)), dinB64url(r.publica), dinB64url(m), INFO_META);
  if (!b) return undefined;
  try {
    const x = JSON.parse(new TextDecoder().decode(b)) as { client?: unknown; titlu?: unknown };
    return typeof x.client === "string" && typeof x.titlu === "string" ? { client: x.client, titlu: x.titlu } : undefined;
  } catch {
    return undefined;
  }
}

/** The firm's recovery public key set on the licence; `inlocuiesc` to replace one set before. */
export const punRecuperarea = async (apel: ApelFirma, loc: Loc, inel: Inel, publica: string, inlocuiesc = false) =>
  apel("recuperare-pune", { cheie: publica, semn: await semnezRecuperarea(inel, publica), ...(inlocuiesc ? { inlocuiesc: true } : {}) }, loc);

/**
 * The firm's owner (colshare-web/api/_firme/core.js proprietarDin, decisions.md 2026-10-30 "A firm has an owner"): a
 * person id, or "loc:<seat id>" for a seat that is not a person yet. What the seat `s` is, in the same terms.
 */
export const alCui = (s: { id: string; p?: string }) => s.p ?? `loc:${s.id}`;

/** The owner as the server names it, or, from a server before owners, the person of the oldest device (as core.js does). */
export function proprietarFirmei(f: Pick<StareFirma, "proprietar" | "scaune">): string | undefined {
  if (f.proprietar && f.scaune.some((s) => alCui(s) === f.proprietar)) return f.proprietar;
  const primul = [...f.scaune].sort((a, b) => a.creat.localeCompare(b.creat))[0];
  return primul ? alCui(primul) : undefined;
}

/** The owner hands the firm over to another of its people (`persoana`, as alCui gives it). */
export const predauFirma = (apel: ApelFirma, loc: Loc, persoana: string) => apel("proprietar-preda", { persoana }, loc);

/** This device's person takes the firm over with its recovery file, signed over a fresh nonce and the moment. */
export async function iauFirmaCuRecuperarea(apel: ApelFirma, loc: Loc, rec: CheieRecuperare, ceas = () => Date.now()): Promise<void> {
  const r = b64url(aleator(16)), la = ceas();
  await apel("proprietar-recuperare", { r, la, sigRecuperare: await semnez(rec.privata, `colshare-proprietar-recuperare-v1\n${loc.id}\n${r}\n${la}`) }, loc);
}

/** Two rings as one: every generation once, in order. For rings this device made or the firm's recovery file holds. */
export const unescInele = (a: Inel, b: Inel): Inel => ({ chei: [...new Map([...a.chei, ...b.chei].map((k) => [k.g, k])).values()].sort((x, y) => x.g - y.g) });

/**
 * A ring the server handed this device, taken into the one it holds (attack test 2026-10-29, C1). A generation it holds
 * is never replaced, and a newer one is taken only when it chains to the one before it (`lant`, signed with that
 * generation's key, which only the firm's devices hold). Anything else the server put in is left out.
 */
export async function primescInel(eu: Inel, venit: Inel): Promise<Inel> {
  const are = new Map(eu.chei.map((k) => [k.g, k]));
  for (const k of [...venit.chei].sort((x, y) => x.g - y.g)) {
    if (are.has(k.g)) continue;
    const inainte = are.get(k.g - 1);
    if (!inainte || typeof k.lant !== "string" || !(await verificSemnatura(dinB64url(inainte.publica), textGeneratie(k.g, k.publica), k.lant))) continue;
    are.set(k.g, k);
  }
  return { chei: [...are.values()].sort((x, y) => x.g - y.g) };
}

/**
 * What the device that approves a new one signs over what it seals to it (the ring, and the person's key for their own
 * second device): the new device checks it with the key the safety code confirmed, so a ring the server sealed on its
 * own isn't taken (C1).
 */
export const textInelNou = (loc: string, d: string, pinel = "") => `colshare-inel-nou-v1\n${loc}\n${d}\n${pinel}`;
/** What a device answering an invitation signs: the invitation, its seat, and the person key it brings (P1). */
export const textIntrare = (inv: string, loc: string, persoana = "") => (persoana ? `colshare-intra-v1\n${inv}\n${loc}\n${persoana}` : `colshare-intra-v1\n${inv}\n${loc}`);
export const cheiaCurenta = (i: Inel) => i.chei[i.chei.length - 1];

// ------------------------------------------------------------------ activation, seats, generations

const textActivare = (cheie: string, loc: string, firma: string) => `colshare-activare-v1\n${cheie}\n${loc}\n${firma}`;
/** What the recovery file's own key signs to add a seat to an active licence (attack test 2026-10-29, H3). */
const textActivareRecuperare = (cheie: string, loc: string) => `colshare-activare-recuperare-v1\n${cheie}\n${loc}`;
/** What the recovery file's own key signs to take a person back (security audit 2026-10-25, second round, S1). */
const textReia = (cheie: string, loc: string, persoana: string) => `colshare-reia-v1\n${cheie}\n${loc}\n${persoana}`;

/**
 * The first seat activates a licence key: a seat key and the firm's first key made here. With `inel` (from a recovery
 * file), the licence active already: this seat joins with the firm's current key. Returns the seat, the ring, the firm.
 * `o.persoana`: the person this device starts (their key made here, and their name); `o.recuperare`: the firm's
 * recovery public key, on the first activation.
 */
export async function activez(apel: ApelFirma, cheie: string, nume: string, inel?: Inel, o: { persoana?: { cheie: Persoana; nume: string }; recuperare?: string; reia?: { id: string; recuperare: CheieRecuperare }; fisier?: CheieRecuperare } = {}): Promise<{ loc: Loc; inel: Inel; stare: StareFirma }> {
  const loc = await locNou();
  const firma = inel ? cheiaCurenta(inel) : await cheieFirmaNoua(1);
  const k = cheie.trim().toUpperCase();
  const text = textActivare(k, loc.id, firma.publica);
  const stare = await apel<StareFirma & { loc: string }>("activeaza", {
    cheie: k, loc: { cheie: loc.publica, nume }, firma: firma.publica, termeni: "da",
    sig: await semnez(loc.privata, text), ...(inel ? { sigFirma: await semnez(firma.privata, text) } : {}),
    ...(o.persoana ? { persoana: { cheie: o.persoana.cheie.publica, nume: o.persoana.nume } } : {}), ...(o.recuperare ? { recuperare: o.recuperare } : {}),
    // Taking a person back needs the recovery file itself: its key signs, and no seat's ring holds it.
    ...(inel && o.reia ? { reia: o.reia.id, sigRecuperare: await semnez(o.reia.recuperare.privata, textReia(k, loc.id, o.reia.id)) } : {}),
    // A seat added to an active licence from the file: its recovery key signs too (H3).
    ...(inel && !o.reia && o.fisier ? { sigRecuperare: await semnez(o.fisier.privata, textActivareRecuperare(k, loc.id)) } : {}),
    // This seat and its person vouched for by the firm's key, as every device checks them (verificDirector).
    semnLoc: await semnezLoc({ chei: [firma] }, { id: loc.id, cheie: loc.publica, p: o.persoana?.cheie.id }),
    ...(o.persoana ? { semnPersoana: await semnezPersoana({ chei: [firma] }, { id: o.persoana.cheie.id, cheie: o.persoana.cheie.publica }) } : {}),
    ...(o.recuperare ? { semnRecuperare: await semnezRecuperarea({ chei: [firma] }, o.recuperare) } : {}),
  });
  return { loc, inel: inel ?? { chei: [firma] }, stare };
}

/**
 * What one of a person's devices did that their other device does too (decisions.md 2026-10-25, "A person's two
 * devices stay in step"). A paper is named by `ref`, the same on both devices: the arrival it came in and its place
 * in it.
 */
export type IntrareJurnal =
  | { fel: "nume"; ref: string; nume: string }
  | { fel: "rol"; refs: string[]; rol: "adaug" | "inlocuieste" }
  | { fel: "sterg"; cereri: string[] }
  /** Papers deleted one by one (the firm's own papers: ./birou/stare.ts ACTE_FIRMA), by their name on both devices. */
  | { fel: "sterg-acte"; refs: string[] };

const textJurnal = (j: string) => `colshare-jurnal-v1
${j}`;
/** Entries written since 2026-10-29 also sign the device that wrote them (attack test 2026-10-29, L10). */
const textJurnal2 = (loc: string, j: string) => `colshare-jurnal-v2\n${loc}\n${j}`;

/**
 * An entry written to the person's journal, signed with their key and sealed to it (the server keeps it for their
 * other device). Sealing alone needs only the public key, which the server lists: the signature is what says one of
 * their devices wrote it (security audit 2026-10-25, B7).
 */
export async function scriuInJurnal(apel: ApelFirma, loc: Loc, eu: Persoana, x: IntrareJurnal): Promise<string> {
  const j = JSON.stringify(x);
  const e = b64url(await sigileazaPentruLacat(dinB64url(eu.publica), enc(JSON.stringify({ v: 2, j, s: await semnez(eu.privata, textJurnal2(loc.id, j)) })), INFO_JURNAL));
  return (await apel<{ id: string }>("jurnal-pune", { e }, loc)).id;
}

/**
 * The journal's entries after `dupa` written by the person's other devices, opened; the last id seen, and every id the
 * server gave. When `dupa` is gone from the server (older than its days, or past its count) it gives every entry it
 * keeps: those in `vazute` (done here before) are skipped, so nothing is done twice.
 */
export async function citescJurnalul(apel: ApelFirma, loc: Loc, eu: Persoana, dupa?: string, vazute: readonly string[] = []): Promise<{ intrari: IntrareJurnal[]; ultim?: string; ids: string[] }> {
  const { intrari } = await apel<{ intrari: { id: string; e: string; loc: string }[] }>("jurnal", dupa ? { dupa } : {}, loc);
  const out: IntrareJurnal[] = [];
  const facute = new Set(vazute);
  for (const y of intrari) {
    if (y.loc === loc.id || facute.has(y.id)) continue;
    let b: Uint8Array | undefined, cu: string | undefined;
    for (const k of cheiPersoana(eu)) if ((b = await deschideCuLacat(await importaPrivata(dinB64url(k.privata)), dinB64url(k.publica), dinB64url(y.e), INFO_JURNAL))) { cu = k.publica; break; }
    if (!b || !cu) continue;
    try {
      // Signed by the key it was sealed to: an entry anyone could seal, unsigned, is not done.
      const w = JSON.parse(new TextDecoder().decode(b)) as { v?: unknown; j?: unknown; s?: unknown };
      // A new entry names the device that wrote it, as the server says it posted it; an older one is read as it was.
      if (typeof w.j !== "string" || typeof w.s !== "string" || !(await verificSemnatura(dinB64url(cu), w.v === 2 ? textJurnal2(y.loc, w.j) : textJurnal(w.j), w.s))) continue;
      const x = JSON.parse(w.j) as IntrareJurnal;
      // What deletes is done only when signed with the person's current key: an old key, which a device removed since
      // may still hold, can't delete what is kept now (L10).
      if ((x?.fel === "sterg" || x?.fel === "sterg-acte") && cu !== eu.publica) continue;
      if (x && (x.fel === "nume" || x.fel === "rol" || x.fel === "sterg" || x.fel === "sterg-acte")) out.push(x);
    } catch { /* not ours to read */ }
  }
  return { intrari: out, ids: intrari.map((y) => y.id), ...(intrari.length ? { ultim: intrari[intrari.length - 1].id } : dupa ? { ultim: dupa } : {}) };
}

/** One of the firm's people as a device starting again from the recovery file sees them: to say which one it is. */
export interface PersoanaDinRecuperare { id: string; nume: string; dispozitive: { nume: string; ultim: string }[] }

const textPersoaneRecuperare = (cheie: string, t: number) => `colshare-persoane-recuperare-v1\n${cheie}\n${t}`;

/** The firm's people, asked with the firm's current key from the recovery file (no seat yet). */
export async function persoaneDinRecuperare(apel: ApelFirma, cheie: string, inel: Inel, ceas = () => Date.now()): Promise<PersoanaDinRecuperare[]> {
  const k = cheie.trim().toUpperCase(), t = ceas();
  const { persoane } = await apel<{ persoane: PersoanaDinRecuperare[] }>("persoane-din-recuperare", { cheie: k, t, sig: await semnez(cheiaCurenta(inel).privata, textPersoaneRecuperare(k, t)) });
  return persoane;
}

/**
 * A person taken back from the recovery file (activez `reia`): their open asks, moved to this device's new person,
 * sealed again to it. The ask's key opens with the recovery key; its details too for asks made from 2026-10-25, else
 * `faraDetalii` names the ask (by its date), whose papers still come. Returns how many were taken back.
 */
export async function reiauCererile(apel: ApelFirma, loc: Loc, inel: Inel, eu: Persoana, rec: CheieRecuperare, faraDetalii: (creat: string) => MetaCerere): Promise<number> {
  const cereri = [];
  for (const c of await cereriFirma(apel, loc, inel, eu)) {
    if (c.casuta || c.persoana !== eu.id || c.cheie || !c.kr || !c.k) continue;
    const cheie = await deschidCheiaCererii(rec, c.kr, c.k);
    if (!cheie) continue;
    const meta = (c.mr ? await deschidMetaCu(rec, c.mr) : undefined) ?? faraDetalii(c.creat);
    cereri.push({
      id: c.id,
      m: b64url(await sigileazaPentruLacat(dinB64url(eu.publica), enc(JSON.stringify(meta)), INFO_META)),
      kp: b64url(await sigileazaPentruLacat(dinB64url(eu.publica), dinB64url(cheie.privata), INFO_CHEIE_CERERE)),
    });
  }
  if (!cereri.length) return 0;
  return (await apel<{ mutate: number }>("reiau-cereri", { cereri }, loc)).mutate;
}

/**
 * An invitation for a new device: a short link, <domain>/birou/#inv=<id> for a colleague's, who takes a seat, or
 * <domain>/birou/#eu=<id> with `aceeasi`, this person's own second device (their phone or computer), which takes none
 * and asks no name.
 */
export async function invit(apel: ApelFirma, loc: Loc, domeniu: string, aceeasi = false): Promise<{ inv: string; adresa: string }> {
  const { inv } = await apel<{ inv: string }>("invita", aceeasi ? { aceeasi: true } : {}, loc);
  return { inv, adresa: `${domeniu}/birou/#${aceeasi ? "eu" : "inv"}=${inv}` };
}

/** An invitation link read back: `aceeasi` for one to a person's own second device. */
export function citescInvitatia(adresa: string): { inv: string; aceeasi?: true } | undefined {
  const m = /#(inv|eu)=([A-Za-z0-9_-]{22})\s*$/.exec(adresa.trim());
  return m ? { inv: m[2], ...(m[1] === "eu" ? { aceeasi: true as const } : {}) } : undefined;
}

/**
 * The new device answers the invitation with its own seat key; `de` is the inviting seat's key, from the server, for
 * the safety code both screens show (a key swapped on the way shows a different code on each). `persoana`: the person
 * this device would start as a colleague; `aceeasi` in the answer: it joins the inviting person instead, whose key
 * comes sealed with the approval (StareFirma.pinel).
 */
export async function intru(apel: ApelFirma, inv: string, nume: string, persoana?: { cheie: Persoana; nume: string }): Promise<{ loc: Loc; de: string; aceeasi?: true }> {
  const loc = await locNou();
  const r = await apel<{ de: string; aceeasi?: boolean }>("intra", {
    // The person key it brings is signed too: the device that approves checks it against the key the code confirmed (P1).
    inv, cheie: loc.publica, nume, sig: await semnez(loc.privata, textIntrare(inv, loc.id, persoana?.cheie.publica)),
    ...(persoana ? { persoana: { cheie: persoana.cheie.publica, nume: persoana.nume } } : {}),
  });
  if (typeof r.de !== "string" || !estePublica(dinB64url(r.de))) throw new EroareFirma(502);
  return { loc, de: r.de, ...(r.aceeasi === true ? { aceeasi: true as const } : {}) };
}

/**
 * The inviting seat approves the device that answered: the ring sealed to it, and with `aceeasi` (this person's own
 * second device) the person's key too.
 */
export async function aprob(apel: ApelFirma, loc: Loc, inv: string, cheieNoua: string, inel: Inel, aceeasi?: Persoana, persoanaNoua?: string): Promise<string> {
  const idNou = await idLoc(dinB64url(cheieNoua));
  // What the device answered, checked against the key the safety code confirmed: the person key it brings is the one it
  // signed, not one the server put there (P1).
  const { cerut } = await apel<{ cerut?: { cheie?: string; sig?: string; persoana?: { cheie?: string } } }>("invitatie", { inv }, loc);
  const adusa = typeof cerut?.persoana?.cheie === "string" ? cerut.persoana.cheie : undefined;
  if (!cerut || cerut.cheie !== cheieNoua || typeof cerut.sig !== "string" || !(await verificSemnatura(dinB64url(cheieNoua), textIntrare(inv, idNou, adusa), cerut.sig))) throw new EroareFirma(403, "semnatura");
  if (!aceeasi && persoanaNoua !== undefined && persoanaNoua !== adusa) throw new EroareFirma(403, "semnatura");
  if (!aceeasi) persoanaNoua = adusa;
  const p = aceeasi?.id ?? (persoanaNoua ? await idLoc(dinB64url(persoanaNoua)) : undefined);
  // What is sealed to the new device, signed by this one: the new device checks it with this device's key (C1).
  const d = await sigilezInel(inel, cheieNoua);
  const pinel = aceeasi ? await sigilezPersoana(aceeasi, cheieNoua) : undefined;
  const { loc: id } = await apel<{ loc: string }>("aproba", {
    inv, inel: { g: cheiaCurenta(inel).g, d, s: await semnez(loc.privata, textInelNou(idNou, d, pinel)) }, ...(pinel ? { pinel } : {}),
    // The device approved here, and the person it starts, vouched for with the firm's key (verificDirector).
    semn: await semnezLoc(inel, { id: idNou, cheie: cheieNoua, p }),
    ...(persoanaNoua && p && !aceeasi ? { semnPersoana: await semnezPersoana(inel, { id: p, cheie: persoanaNoua }) } : {}),
  }, loc);
  return id;
}

/**
 * The firm's next key generation, after a seat was removed: a new pair added to the ring, the ring sealed to every
 * seat left. Returns the new ring and the new certificate.
 */
export async function generatieNoua(apel: ApelFirma, loc: Loc, inel: Inel, stare: StareFirma, dir?: Director): Promise<{ inel: Inel; certificat?: string }> {
  // The ring goes only to devices this one can vouch for: one the server added on its own never gets it.
  if (dir && stare.scaune.some((x) => !dir.scaune.has(x.id))) throw new EroareFirma(409, "director");
  // Chained to this device's current generation, which must be the server's (C1).
  const inainte = cheiaCurenta(inel);
  if (inainte.g !== stare.g) throw new EroareFirma(409, "director");
  const noua = await cheieFirmaNoua(stare.g + 1, inainte);
  const dupa: Inel = { chei: [...inel.chei, noua] };
  const inele: Record<string, string> = {};
  for (const s of stare.scaune) inele[s.id] = await sigilezInel(dupa, s.cheie);
  const r = await apel<{ certificat: string | null }>("generatie", { g: noua.g, cheie: noua.publica, inele }, loc);
  return { inel: dupa, ...(r.certificat ? { certificat: r.certificat } : {}) };
}

// ------------------------------------------------------------------ what the server lists, checked on the device

/**
 * A statement signed with the firm's key of generation `g` (security audit 2026-10-25, B1): the server keeps it and
 * cannot make one, since only the firm's devices hold the ring.
 */
export interface Semn { g: number; sig: string }

const textLoc = (id: string, cheie: string, p?: string) => `colshare-loc-v1\n${id}\n${cheie}\n${p ?? ""}`;
const textPersoanaSemn = (id: string, cheie: string) => `colshare-persoana-v1\n${id}\n${cheie}`;
const textRecuperare = (cheie: string) => `colshare-recuperare-v1\n${cheie}`;

async function semnCu(inel: Inel, text: string): Promise<Semn> {
  const k = cheiaCurenta(inel);
  return { g: k.g, sig: await semnez(k.privata, text) };
}
export const semnezLoc = (inel: Inel, x: { id: string; cheie: string; p?: string }) => semnCu(inel, textLoc(x.id, x.cheie, x.p));
export const semnezPersoana = (inel: Inel, x: { id: string; cheie: string }) => semnCu(inel, textPersoanaSemn(x.id, x.cheie));
export const semnezRecuperarea = (inel: Inel, cheie: string) => semnCu(inel, textRecuperare(cheie));

/** What this device has seen of the firm and trusts: each device's key, each person's key, the recovery key. */
export interface Increderi {
  scaune: Record<string, string>;
  persoane: Record<string, string>;
  recuperare?: string;
}

/**
 * What a desk started from the recovery file trusts at its first sync (security audit 2026-10-25, second round, D1):
 * its own seat and person, made by this start, and the recovery key the file holds. Never an undefined `increderi`,
 * which would trust the server's lists once and then sign them for the whole firm.
 */
export function increderiDinRecuperare(rec: { recuperare?: { publica: string } }, loc: Loc, persoana: Persoana): Increderi {
  return { scaune: { [loc.id]: loc.publica }, persoane: { [persoana.id]: persoana.publica }, ...(rec.recuperare ? { recuperare: rec.recuperare.publica } : {}) };
}

/** The firm's lists as this device trusts them, and what the server changed that no device of the firm vouched for. */
export interface Director {
  scaune: Set<string>;
  persoane: Map<string, string>;
  /** The recovery key every person's request is also sealed to; none when the server's is not vouched for. */
  recuperare?: string;
  alarme: ("cheie" | "loc" | "persoana" | "recuperare")[];
  increderi: Increderi;
  /** What this device trusts and the server holds with no statement under the current generation: it signs those. */
  lipsa: { scaune: Record<string, string>; persoane: Record<string, string>; recuperare?: string };
}

/**
 * The server's lists checked against what this device holds (security audit 2026-10-25, B1). The server, or whoever
 * can write its store, could otherwise add a device that gets the ring, or change a person's key or the recovery key,
 * and read clients' papers. Trusted: what this device saw before with the same key, or what carries a statement signed
 * with the firm's current key, which only the firm's devices hold. `increderi` undefined: a device from before these
 * checks, which trusts what it sees this once. A firm key on the server other than this device's current one is an
 * alarm. While this device's ring is behind the server's, nothing new is trusted and nothing is alarmed.
 */
export async function verificDirector(st: StareFirma, inel: Inel, increderi?: Increderi): Promise<Director> {
  const cur = inel.chei.length ? cheiaCurenta(inel) : undefined;
  const prima = !increderi;
  const inc: Increderi = { scaune: { ...increderi?.scaune }, persoane: { ...increderi?.persoane }, ...(increderi?.recuperare ? { recuperare: increderi.recuperare } : {}) };
  const laZi = !!cur && st.g === cur.g;
  const alarme = new Set<Director["alarme"][number]>();
  const lipsa: Director["lipsa"] = { scaune: {}, persoane: {} };
  if (laZi && st.cheie !== cur!.publica) alarme.add("cheie");
  const bun = async (x: Semn | undefined, text: string) => laZi && !!x && x.g === cur!.g && typeof x.sig === "string" && await verificSemnatura(dinB64url(cur!.publica), text, x.sig);
  // A firm whose server holds no statement yet (its devices from before the checks have not synced) is not alarmed:
  // what this device cannot vouch for is only left out.
  let semnate = false;
  const rele: { fel: "loc" | "persoana"; schimbat: boolean }[] = [];
  async function verific<T extends { id: string; cheie: string; semn?: Semn }>(lista: T[], stiute: Record<string, string>, text: (x: T) => string, fel: "loc" | "persoana", lipsesc: Record<string, string>) {
    const ok = new Map<string, string>();
    for (const x of lista) {
      const semnat = await bun(x.semn, text(x));
      if (semnat) semnate = true;
      const stiut = stiute[x.id];
      if (stiut === x.cheie || semnat || (prima && stiut === undefined)) {
        ok.set(x.id, x.cheie);
        stiute[x.id] = x.cheie;
        if (!semnat && laZi) lipsesc[x.id] = x.cheie;
      } else if (laZi) rele.push({ fel, schimbat: stiut !== undefined });
    }
    return ok;
  }
  const scaune = await verific(st.scaune, inc.scaune, (x) => textLoc(x.id, x.cheie, x.p), "loc", lipsa.scaune);
  const persoane = await verific(st.persoane ?? [], inc.persoane, (x) => textPersoanaSemn(x.id, x.cheie), "persoana", lipsa.persoane);
  let recuperare: string | undefined;
  if (st.recuperare) {
    const semnat = await bun(st.recuperareSemn, textRecuperare(st.recuperare));
    if (semnat) semnate = true;
    if (inc.recuperare === st.recuperare || semnat || (prima && !inc.recuperare)) {
      recuperare = inc.recuperare = st.recuperare;
      if (!semnat && laZi) lipsa.recuperare = st.recuperare;
    } else if (laZi && inc.recuperare) alarme.add("recuperare");
  }
  // A key changed from the one this device saw is always said; one never seen, once the firm signs its lists.
  for (const r of rele) if (r.schimbat || semnate) alarme.add(r.fel);
  return { scaune: new Set(scaune.keys()), persoane, ...(recuperare ? { recuperare } : {}), alarme: [...alarme], increderi: inc, lipsa };
}

/** The statements `dir.lipsa` lists, signed here with the firm's current key and handed to the server. */
export async function punSemnele(apel: ApelFirma, loc: Loc, inel: Inel, st: StareFirma, dir: Director): Promise<boolean> {
  const l = dir.lipsa;
  if (!Object.keys(l.scaune).length && !Object.keys(l.persoane).length && !l.recuperare) return false;
  const scaune: Record<string, Semn> = {}, persoane: Record<string, Semn> = {};
  for (const [id, cheie] of Object.entries(l.scaune)) scaune[id] = await semnezLoc(inel, { id, cheie, p: st.scaune.find((x) => x.id === id)?.p });
  for (const [id, cheie] of Object.entries(l.persoane)) persoane[id] = await semnezPersoana(inel, { id, cheie });
  await apel("semne-pune", { scaune, persoane, ...(l.recuperare ? { recuperare: { cheie: l.recuperare, semn: await semnezRecuperarea(inel, l.recuperare) } } : {}) }, loc);
  return true;
}

// ------------------------------------------------------------------ asks

/** What a firm's ask says, sealed to the firm's key on the relay so every seat lists it. */
export interface MetaCerere {
  titlu: string;
  client: string;
  ce: string[];
  k?: string;
  /** The short link's key (b64url), so every seat can give the same link again. */
  kl?: string;
  /** The client's language, chosen by the firm: the link names it (/a/ro/#…) and its page opens in it. */
  l?: string;
  /** The address the link was e-mailed to, when it was (every seat shows it). */
  email?: string;
  /**
   * The client's file this request belongs to (the desk's id for that client), so two clients with the same name stay
   * two files. Requests made before it have none and go by the client's name.
   */
  cl?: string;
  /** The firm's note to the client, shown on the ask's page under what it is for (./link.ts curatNota). */
  nota?: string;
}

/** A link's path with the recipient's language, when one was chosen ("/a/ro/" or "/a/"). */
const cuLimba = (p: "a" | "p", l?: string) => (l && /^[a-z]{2}$/.test(l) ? `/${p}/${l}/` : `/${p}/`);

/** A firm's ask as a seat keeps it. */
export interface CerereFirma extends MetaCerere {
  id: string;
  g: number;
  creat: string;
  adresa: string;
  /**
   * A desk row that is not an ask: another firm (what it sent here, what was sent to it; `firma` names it), or papers
   * sent by link to someone with no ask of their own.
   */
  fel?: "firma" | "trimis";
  firma?: { firma: string; cui: string; tara: string };
  /** An ask closed here or no longer on the relay (closed by another seat, or past its days): its link is gone. */
  inchisa?: true;
  /** A client a colleague sent over: their name (the row has no link of its own here). */
  dela?: string;
  /** That colleague's person id: only their later packages, or this person's own devices, file into the row. */
  delaP?: string;
  /** Sent from a departed colleague's returned device with the firm's recovery file (`dela` names whose it was). */
  recuperat?: true;
}

/**
 * A firm's ask has a short link, <domain>/a/#<id>.<16-byte key> (about 70 characters, a small QR code): what it asks,
 * the firm's public key and its certificate wait on the relay (cerere-info), AES-GCM under that key, with the ask's id
 * as associated data so the relay cannot move them to another ask. The server never reads them; the page checks the
 * certificate as for any firm's ask.
 */
const AAD_SCURT = (id: string) => enc(`colshare-cerere-firma-v1\n${id}`);

async function aesScurt(cheie: Uint8Array, uz: KeyUsage) {
  return crypto.subtle.importKey("raw", cheie as BufferSource, "AES-GCM", false, [uz]);
}

/**
 * Opens a firm's ask for a client: the short link's contents put on the relay with it. `certificat` undefined for a
 * firm we have not checked yet: the page then names it as an unchecked asker. The relay refuses an ask sealed to a
 * generation that is not the firm's current one (EroareFirma 409 "generatie": sync the ring, then make it again).
 *
 * With `persoana` (decisions.md 2026-10-24, "A Business seat is a person"), a person's ask: it gets a key pair of its
 * own, which the client's answers are sealed to. Its private half goes to the relay sealed twice, to the person's key
 * (their phone and computer open it) and to the firm's recovery key (only the recovery file opens it); the title and
 * client are sealed to the person's key. The relay signs the firm's certificate for the ask's key, so the client's
 * page and app check it as any firm's ask, and it lists the ask only to that person's devices.
 */
export async function facCerereFirma(apel: ApelFirma, loc: Loc, inel: Inel, certificat: string | undefined, domeniu: string, meta: MetaCerere, firma: string,
  persoana?: { cheie: Persoana; recuperare: string }): Promise<CerereFirma> {
  const k = cheiaCurenta(inel);
  const a = persoana ? await perecheLacat() : undefined;
  const publicaCererii = a ? b64url(a.publica) : k.publica;
  const id = b64url(aleator(16));
  const kl = aleator(16);
  const text = { t: meta.titlu.slice(0, 200), c: meta.ce.map((x) => x.slice(0, 200)).filter(Boolean).slice(0, 12), n: firma.slice(0, 80), ...(meta.k ? { k: meta.k } : {}),
    ...(meta.nota && curatNota(meta.nota) ? { o: curatNota(meta.nota) } : {}) };
  const iv = aleator(12);
  // A person's ask carries no certificate of its own: the one in hand names the firm's key, the relay signs one for the ask's.
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource, additionalData: AAD_SCURT(id) as BufferSource }, await aesScurt(kl, "encrypt"),
    enc(JSON.stringify({ ...text, p: publicaCererii, ...(certificat && !a ? { cert: certificat } : {}) })) as BufferSource));
  const p = new Uint8Array(12 + ct.length);
  p.set(iv);
  p.set(ct, 12);
  const cu: MetaCerere = { ...meta, kl: b64url(kl) };
  const m = b64url(await sigileazaPentruLacat(dinB64url(persoana ? persoana.cheie.publica : k.publica), enc(JSON.stringify(cu)), INFO_META));
  const aPersoanei = a && persoana ? {
    k: publicaCererii,
    kp: b64url(await sigileazaPentruLacat(dinB64url(persoana.cheie.publica), a.privata, INFO_CHEIE_CERERE)),
    kr: b64url(await sigileazaPentruLacat(dinB64url(persoana.recuperare), a.privata, INFO_CHEIE_CERERE)),
    // The details too, so the person started again from the recovery file gets the client, the list and the link back.
    mr: b64url(await sigileazaPentruLacat(dinB64url(persoana.recuperare), enc(JSON.stringify(cu)), INFO_META)),
  } : {};
  await apel("cerere-pune", { id, m, p: b64url(p), g: k.g, ...aPersoanei }, loc);
  return { ...cu, id, g: k.g, creat: new Date().toISOString(), adresa: adresaCerereFirmaDin(domeniu, { id, ...cu })! };
}

/** The short link of a firm's ask (any seat: the key is in its sealed details). */
export function adresaCerereFirmaDin(domeniu: string, c: { id: string; kl?: string; l?: string }): string | undefined {
  return c.kl ? `${domeniu}${cuLimba("a", c.l)}#${c.id}.${c.kl}` : undefined;
}

/**
 * A short link opened: its contents fetched from the relay and decrypted, as a full ask (./link.ts Adresa) with the
 * certificate still to check: the one the relay signs now for the ask's key when it gives one (`c`; null: the firm is
 * not checked or no longer paid, so none), else the one frozen into the ask. Undefined when they do not open (another
 * key, changed); EroareRelay when the ask is gone.
 */
export async function deschidCerereFirma(r: Relay, id: string, cheie: Uint8Array): Promise<Extract<Adresa, { fel: "cerere" }> | undefined> {
  const raspuns = await r<{ p?: string; c?: string | null }>("cerere-info", { id });
  const { p } = raspuns;
  if (!p) return undefined;
  try {
    const b = dinB64url(p);
    const x = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b.subarray(0, 12) as BufferSource, additionalData: AAD_SCURT(id) as BufferSource }, await aesScurt(cheie, "decrypt"), b.subarray(12) as BufferSource))) as Record<string, unknown>;
    const publica = typeof x.p === "string" ? dinB64url(x.p) : new Uint8Array();
    if (!estePublica(publica) || typeof x.t !== "string") return undefined;
    const ce = Array.isArray(x.c) ? x.c.filter((y): y is string => typeof y === "string").map(curat).slice(0, 12) : [];
    const cert = "c" in raspuns ? (typeof raspuns.c === "string" ? raspuns.c : undefined) : typeof x.cert === "string" ? x.cert : undefined;
    return {
      fel: "cerere", id, publica, ...(cert ? { certificat: cert } : {}),
      text: { titlu: curat(x.t).slice(0, 200), ce, ...(typeof x.n === "string" && curat(x.n).trim() ? { de: curat(x.n).slice(0, 80) } : {}), ...(typeof x.k === "string" && ID_TRUSA.test(x.k) ? { k: x.k } : {}),
        ...(typeof x.o === "string" && curatNota(x.o) ? { nota: curatNota(x.o) } : {}) },
    };
  } catch {
    return undefined;
  }
}

async function deschidMeta(inel: Inel, g: number, m: string): Promise<MetaCerere | undefined> {
  const k = inel.chei.find((x) => x.g === g);
  return k ? deschidMetaCu(k, m) : undefined;
}

async function deschidMetaCu(k: { privata: string; publica: string }, m: string): Promise<MetaCerere | undefined> {
  const b = await deschideCuLacat(await importaPrivata(dinB64url(k.privata)), dinB64url(k.publica), dinB64url(m), INFO_META);
  if (!b) return undefined;
  try {
    const x = JSON.parse(new TextDecoder().decode(b)) as MetaCerere;
    return typeof x.titlu === "string" && typeof x.client === "string" && Array.isArray(x.ce)
      ? { titlu: x.titlu.slice(0, 200), client: x.client.slice(0, 120), ce: x.ce.filter((y) => typeof y === "string").slice(0, 12), ...(typeof x.k === "string" ? { k: x.k } : {}), ...(typeof x.kl === "string" && /^[A-Za-z0-9_-]{22}$/.test(x.kl) ? { kl: x.kl } : {}), ...(typeof x.l === "string" && /^[a-z]{2}$/.test(x.l) ? { l: x.l } : {}), ...(typeof x.email === "string" && x.email.length <= 120 ? { email: x.email } : {}), ...(typeof x.cl === "string" && /^[A-Za-z0-9_-]{8,32}$/.test(x.cl) ? { cl: x.cl } : {}), ...(typeof x.nota === "string" && curatNota(x.nota) ? { nota: curatNota(x.nota) } : {}) }
      : undefined;
  } catch {
    return undefined;
  }
}

/** A person's ask's own key, opened from what the relay keeps of it (sealed to the person's key, or the recovery key). */
async function deschidCheiaCererii(k: { privata: string; publica: string }, sigilat: string, publica: string): Promise<CheieFirma | undefined> {
  const b = await deschideCuLacat(await importaPrivata(dinB64url(k.privata)), dinB64url(k.publica), dinB64url(sigilat), INFO_CHEIE_CERERE);
  return b ? { g: 0, privata: b64url(b), publica } : undefined;
}

/** One of the firm's asks as the relay lists it to this seat, opened as far as this seat can. */
export interface CerereListata {
  id: string;
  g: number;
  creat: string;
  casuta?: true;
  meta?: MetaCerere;
  /** `de`: on the firm's inbox, the firm that announced the item, as its certificate names it (second round, S2). */
  acte: { item: string; n: number; octeti: number; la: string; de?: Anuntator }[];
  /** A person's ask: whose, its own key opened, and that key sealed to the firm's recovery key (the recovery copy). */
  persoana?: string;
  cheie?: CheieFirma;
  kr?: string;
  /** The ask's public key, and its details sealed to the recovery key (asks made from 2026-10-25). */
  k?: string;
  mr?: string;
  /** Closed (on any device): its link is gone; listed so every device shows it. */
  inchisa?: true;
}

/**
 * The firm's asks, opened: what the relay lists, with the title and client each seat can read. `persoana`: this
 * device's person key, which opens that person's asks (the relay lists no one else's).
 */
export async function cereriFirma(apel: ApelFirma, loc: Loc, inel: Inel, persoana?: Persoana): Promise<CerereListata[]> {
  const { cereri } = await apel<{ cereri: { id: string; m: string; g: number; creat: string; casuta?: true; persoana?: string; k?: string; kp?: string; kr?: string; mr?: string; inchisa?: string; acte: CerereListata["acte"] }[] }>("cereri", {}, loc);
  const out: CerereListata[] = [];
  for (const c of cereri) {
    // A person's own inbox: what colleagues and their other device sent, sealed to the person's key itself.
    if (c.casuta && c.persoana) {
      out.push({ id: c.id, g: c.g, creat: c.creat, casuta: true as const, acte: c.acte, persoana: c.persoana,
        ...(persoana?.id === c.persoana ? { cheie: { g: 0, privata: persoana.privata, publica: persoana.publica } } : {}) });
      continue;
    }
    if (c.casuta) { out.push({ id: c.id, g: c.g, creat: c.creat, casuta: true as const, acte: c.acte }); continue; }
    if (c.persoana) {
      const a: CerereListata = { id: c.id, g: c.g, creat: c.creat, acte: c.acte, persoana: c.persoana, ...(c.kr ? { kr: c.kr } : {}), ...(c.k ? { k: c.k } : {}), ...(c.mr ? { mr: c.mr } : {}), ...(c.inchisa ? { inchisa: true as const } : {}) };
      if (persoana?.id === c.persoana && c.k && c.kp) {
        for (const k of cheiPersoana(persoana)) {
          const cheie = await deschidCheiaCererii(k, c.kp, c.k);
          if (!cheie) continue;
          const meta = await deschidMetaCu(k, c.m);
          Object.assign(a, meta ? { meta } : {}, { cheie });
          break;
        }
      }
      out.push(a);
      continue;
    }
    out.push({ id: c.id, g: c.g, creat: c.creat, acte: c.acte, ...(c.inchisa ? { inchisa: true as const } : {}), ...(await deschidMeta(inel, c.g, c.m).then((meta) => (meta ? { meta } : {}))) });
  }
  return out;
}

/**
 * What a device keeps of a person's paper so the firm's recovery file can open it later (decisions.md 2026-10-24: the
 * recovery copy stays on the person's own computer and phone): the paper as it came, sealed, and the ask's key sealed
 * to the recovery key.
 */
export interface CopieRecuperare {
  k: string;
  kr: string;
  sigilat: Uint8Array;
}

/** A recovery copy opened with the firm's recovery key (from the recovery file); undefined when it does not open. */
export async function deschidCopiaDeRecuperare(r: CheieRecuperare, c: CopieRecuperare): Promise<Uint8Array | undefined> {
  const k = await deschidCheiaCererii(r, c.kr, c.k);
  return k ? deschideDinCerere(await importaPrivata(dinB64url(k.privata)), dinB64url(k.publica), c.sigilat) : undefined;
}

/**
 * Where a package came from: one of the firm's asks, or another firm, checked (its inbox, ./firma.ts trimitFirmei). A
 * person's ask also hands over its recovery copy.
 */
export type Sursa = { cerere: string; meta?: MetaCerere; recuperare?: CopieRecuperare } | { firma: Certificat } | { coleg: DeLaColeg };

/** How a seat takes what waits: items to leave alone, and what to do when one fails. */
export interface CumIau {
  /**
   * Items already tried with this ring (`<ask>/<item>/<the ring's generations>`): one that did not open, or failed to be
   * kept, is not fetched again until the ring changes (another seat may bring the key). Filled in here.
   */
  sari?: Set<string>;
  /**
   * An item that failed (`pastreaza` threw, or it could not be fetched): left unconfirmed, the others taken. Returns
   * false to stop there and throw (the desk locked, say). Without it, the first failure throws.
   */
  eroare?: (e: unknown) => boolean;
  /**
   * Whether this seat already kept an item (`<ask>/<item>`): kept, but its confirmation never reached the relay (the
   * page closed or reloaded in between). It is confirmed again and not fetched, so its papers are never kept twice.
   */
  luat?: (cheie: string) => boolean;
  /** This device's person key: it opens the person's own asks and their inbox. */
  persoana?: Persoana;
  /** The firm's people (StareFirma.persoane): a colleague's package is checked against their key (or one before it). */
  persoane?: { id: string; cheie: string; vechi?: string[] }[];
  /** The firm's recovery public key: a departed person's papers sent from a returned device are checked against it. */
  recuperare?: string;
}

/**
 * A person leaving hands their open asks to the colleague who takes over (`catre`, their person key): the title and
 * client and the ask's own key sealed again to the colleague, so new papers from those clients reach the colleague.
 */
export async function predauCererile(apel: ApelFirma, loc: Loc, inel: Inel, eu: Persoana, catre: string): Promise<number> {
  const cereri = [];
  for (const c of await cereriFirma(apel, loc, inel, eu)) {
    if (c.casuta || c.persoana !== eu.id || !c.meta || !c.cheie) continue;
    cereri.push({
      id: c.id,
      m: b64url(await sigileazaPentruLacat(dinB64url(catre), enc(JSON.stringify(c.meta)), INFO_META)),
      kp: b64url(await sigileazaPentruLacat(dinB64url(catre), dinB64url(c.cheie.privata), INFO_CHEIE_CERERE)),
    });
  }
  if (!cereri.length) return 0;
  return (await apel<{ mutate: number }>("predau-cereri", { cereri }, loc)).mutate;
}

/**
 * What waits for this seat in the firm's asks and in its inbox, opened: each package handed to `pastreaza`, then
 * confirmed (the relay deletes it once every seat has it). Every key of the ring is tried (the ask's generation first).
 * An item that opens with none is never confirmed: another seat, or this one with a newer ring, may open it, and the
 * relay deletes it after its seven days. A package in the inbox whose sender's certificate or signature does not hold is
 * dropped (`respins`: the sender's list then says it could not be received). One item that fails never stops the rest.
 */
export async function iauDinFirma(apel: ApelFirma, loc: Loc, inel: Inel, pastreaza: (sursa: Sursa, pachet: Uint8Array, cheie: string, la: string) => Promise<void>, chei?: string[], cum: CumIau = {}): Promise<number> {
  const r = caRelay(apel, loc);
  const semn = inel.chei.map((k) => k.g).join(",");
  let luate = 0;
  for (const c of await cereriFirma(apel, loc, inel, cum.persoana)) {
    // An ask's answers are sealed to the generation it was opened under; another firm seals to the key it was shown; a
    // person's ask, to its own key (none here when this device cannot open it: left for another sync).
    if (c.persoana && !c.cheie) continue;
    const candidate = c.casuta && c.persoana && cum.persoana?.id === c.persoana ? cheiPersoana(cum.persoana).map((k) => ({ g: 0, ...k }))
      : c.cheie ? [c.cheie] : c.casuta ? [...inel.chei].reverse() : [...inel.chei.filter((x) => x.g === c.g), ...[...inel.chei].reverse().filter((x) => x.g !== c.g)];
    for (const a of c.acte) {
      const k0 = `${c.id}/${a.item}/${semn}`, cheie = `${c.id}/${a.item}`;
      if (cum.sari?.has(k0)) continue;
      try {
        if (cum.luat?.(cheie)) { await apel("confirma", { id: c.id, item: a.item }, loc); continue; }
        const sigilat = await coboara(r, "ia", { id: c.id, item: a.item }, a.n);
        let pachet: Uint8Array | undefined;
        for (const k of candidate) if ((pachet = await deschideDinCerere(await importaPrivata(dinB64url(k.privata)), dinB64url(k.publica), sigilat))) break;
        if (!pachet) { cum.sari?.add(k0); continue; }
        if (c.casuta && c.persoana) {
          const de = await verificColeg(pachet, c.id, a.item, cum.persoane ?? [], cum.recuperare);
          if (!de) { await apel("confirma", { id: c.id, item: a.item, respins: true }, loc); continue; }
          await pastreaza({ coleg: de }, pachet, cheie, a.la);
        } else if (c.casuta) {
          const de = await verificExpeditor(pachet, c.id, a.item, chei, new Date(a.la), a.de);
          if (!de) { await apel("confirma", { id: c.id, item: a.item, respins: true }, loc); continue; }
          await pastreaza({ firma: de }, pachet, cheie, a.la);
        } else await pastreaza({ cerere: c.id, ...(c.meta ? { meta: c.meta } : {}), ...(c.cheie && c.kr ? { recuperare: { k: c.cheie.publica, kr: c.kr, sigilat } } : {}) }, pachet, cheie, a.la);
        luate++;
        await apel("confirma", { id: c.id, item: a.item }, loc);
      } catch (e) {
        // The seat itself refused (removed, signature, too many calls) or no connection: stop, the next sync tries again.
        if (e instanceof EroareRelay && (e.status === 0 || e.status === 403 || e.status === 429)) throw e;
        if (!cum.eroare || !cum.eroare(e)) throw e;
        cum.sari?.add(k0);
      }
    }
  }
  return luate;
}

/** Closes a firm's ask: it and what waits in it are deleted. */
/** An ask closed: its link stops, and it stays on the firm's list marked closed; `uita` (the client deleted) takes it off. */
export const inchidCererea = (apel: ApelFirma, loc: Loc, id: string, uita = false) => apel("cerere-sterge", { id, ...(uita ? { uita: true } : {}) }, loc);

// ------------------------------------------------------------------ sends (decisions.md 2026-10-21, "A firm sends papers")

export const INFO_TRIMIS = enc("colshare-trimis-v1");

async function verificSemnatura(publica: Uint8Array, text: string, sig: string): Promise<boolean> {
  try {
    const k = await crypto.subtle.importKey("raw", publica as BufferSource, EC, false, ["verify"]);
    return await crypto.subtle.verify(SHA, k, dinB64url(sig) as BufferSource, enc(text) as BufferSource);
  } catch {
    return false;
  }
}

/** What a firm's send says, sealed to the firm's key on the server so every seat lists it. */
export interface MetaTrimis {
  /** To whom: the name typed for a link, the firm's registered name for a firm. */
  catre: string;
  /** Sent straight to another firm: its checked name and tax ID. */
  firma?: { firma: string; cui: string; tara: string };
  /** What was sent ("Contract de vânzare"). */
  titlu: string;
  /** The desk's row it is kept under (a client's ask, a firm), and that row's name for a seat that does not know it. */
  rand: string;
  client: string;
  fisiere: string[];
  /** A link's address (any seat can copy it again until it is opened). */
  adresa?: string;
  /** The recipient's language, chosen by the firm (the link's page opens in it). */
  l?: string;
  /** The address the link was e-mailed to, when it was. */
  email?: string;
}

/** A send as the desk lists it. */
export interface TrimisFirma extends MetaTrimis {
  id: string;
  creat: string;
  /** When the link was opened, or when the other firm took the papers. */
  deschis?: string;
  primit?: string;
  /** The other firm's desk dropped the papers: this firm's certificate or signature did not hold there. */
  respins?: string;
}

/**
 * A send's details sealed for the list: to the person who sent it when they are one, so only their devices read whom
 * and what it went to, and its link (security audit 2026-10-25, B5); else to the firm's key, as before people.
 */
const sigilezMeta = async (inel: Inel, m: MetaTrimis, persoana?: Persoana) => b64url(await sigileazaPentruLacat(dinB64url(persoana ? persoana.publica : cheiaCurenta(inel).publica), enc(JSON.stringify(m)), INFO_TRIMIS));

/**
 * A send link's front: who sends (the firm's certificate), to whom and the note, signed with the firm's key over the
 * link's id, AES-GCM under the link's own key on the relay (link-info). The /p/ page shows the firm checked before
 * anything is fetched; the server never reads it, and cannot move it to another link.
 */
const AAD_FATA = (id: string) => enc(`colshare-fata-firma-v1\n${id}`);
const textFata = (id: string, j: string) => `colshare-fata-v1\n${id}\n${j}`;

/**
 * Sends papers by link from the firm's desk: the package up as any send link (one opening, seven days), then recorded
 * in the firm's list with its front. Returns the send; the address is <domain>/p/#<id>.<key>.
 */
export async function trimitLinkFirma(r: Relay, apel: ApelFirma, loc: Loc, inel: Inel, certificat: string | undefined, domeniu: string, pachet: Uint8Array,
  meta: Omit<MetaTrimis, "adresa" | "firma">, nota = "", progres?: (f: number) => void, persoana?: Persoana): Promise<TrimisFirma> {
  const l = await facLink(r, domeniu, pachet, progres);
  const a = citesteAdresa(l.adresa);
  if (a?.fel !== "link") throw new Error("link");
  const k = cheiaCurenta(inel);
  const j = JSON.stringify({ cert: certificat, c: meta.catre.slice(0, 80), ...(nota.trim() ? { n: nota.trim().slice(0, 160) } : {}) });
  const fata = enc(JSON.stringify({ j, s: await semnez(k.privata, textFata(l.id, j)) }));
  const iv = aleator(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource, additionalData: AAD_FATA(l.id) as BufferSource },
    await crypto.subtle.importKey("raw", a.cheie as BufferSource, "AES-GCM", false, ["encrypt"]), fata as BufferSource));
  const p = new Uint8Array(12 + ct.length);
  p.set(iv);
  p.set(ct, 12);
  const m: MetaTrimis = { ...meta, adresa: l.adresa.replace("/p/#", cuLimba("p", meta.l) + "#") };
  await apel("trimis-pune", { id: l.id, s: l.s, m: await sigilezMeta(inel, m, persoana), p: b64url(p) }, loc);
  return { ...m, id: l.id, creat: new Date().toISOString() };
}

/** What a firm's send link says before it is opened: the firm checked, to whom, the note. */
export interface FataFirma {
  firma: Certificat;
  catre?: string;
  nota?: string;
}

/**
 * The front of a firm's send link, checked: decrypted with the link's key, the certificate by colshare.app, the
 * signature by the key in it. Undefined for a link that has none, or one that does not hold (the page then shows it
 * as any send link). `acum`: the certificate the relay signs now (link-info's `c`; null when the firm is not checked
 * or no longer paid), used instead of the one frozen into the front when the relay gives it.
 */
export async function deschidFataFirma(p: string | undefined, id: string, cheie: Uint8Array, chei: string[] = CHEI_CERTIFICAT, azi = new Date(), acum?: string | null): Promise<FataFirma | undefined> {
  if (!p) return undefined;
  try {
    const b = dinB64url(p);
    const x = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b.subarray(0, 12) as BufferSource, additionalData: AAD_FATA(id) as BufferSource },
      await crypto.subtle.importKey("raw", cheie as BufferSource, "AES-GCM", false, ["decrypt"]), b.subarray(12) as BufferSource))) as { j?: unknown; s?: unknown };
    if (typeof x.j !== "string" || typeof x.s !== "string") return undefined;
    const j = JSON.parse(x.j) as { cert?: unknown; c?: unknown; n?: unknown };
    const cert = acum !== undefined ? acum ?? undefined : typeof j.cert === "string" ? j.cert : undefined;
    const firma = await verificCertificat(cert, undefined, chei, azi);
    if (!firma || !(await verificSemnatura(firma.cheie, textFata(id, x.j), x.s))) return undefined;
    // Without control or direction characters, as every other name shown (attack test 2026-10-29, L3).
    return { firma, ...(typeof j.c === "string" && curat(j.c).trim() ? { catre: curat(j.c).slice(0, 80) } : {}), ...(typeof j.n === "string" && curat(j.n).trim() ? { nota: curat(j.n).slice(0, 160) } : {}) };
  } catch {
    return undefined;
  }
}

/** Another firm found by its tax ID: its certificate checked, its inbox. Undefined when it has no Colshare Business. */
export async function gasescFirma(apel: ApelFirma, loc: Loc, tara: string, cui: string, chei: string[] = CHEI_CERTIFICAT, azi = new Date()): Promise<{ firma: Certificat; certificat: string; casuta: string } | undefined> {
  let r: { certificat: string; casuta: string };
  try {
    r = await apel<{ certificat: string; casuta: string }>("gaseste", { tara, cui }, loc);
  } catch (e) {
    if (e instanceof EroareFirma && e.cod === "nu-are") return undefined;
    throw e;
  }
  const firma = await verificCertificat(r.certificat, undefined, chei, azi);
  if (!firma || !/^[A-Za-z0-9_-]{22}$/.test(r.casuta)) throw new EroareFirma(502);
  return { firma, certificat: r.certificat, casuta: r.casuta };
}

/** What a firm signs on a package it sends another firm: that inbox, that item, and the package's contents. */
async function rezumatPachet(p: Pachet): Promise<string> {
  const fisiere = await Promise.all(p.fisiere.map(async (f) => [f.nume, f.tip, b64url(await sha256(f.date))]));
  return b64url(await sha256(enc(JSON.stringify({ t: p.titlu ?? "", d: p.de ?? "", f: fisiere }))));
}
const textPachet = (casuta: string, item: string, h: string) => `colshare-pachet-firma-v1\n${casuta}\n${item}\n${h}`;

/**
 * Sends papers straight to another firm's desk: the package signed with this firm's key (with its certificate inside),
 * sealed to the other firm's key, into its inbox; recorded in this firm's list, which then says when it was taken.
 */
export async function trimitFirmei(r: Relay, apel: ApelFirma, loc: Loc, inel: Inel, certificat: string, catre: { firma: Certificat; casuta: string },
  pachet: Pachet, meta: Omit<MetaTrimis, "adresa" | "firma" | "catre">, progres?: (f: number) => void, persoana?: Persoana): Promise<TrimisFirma> {
  const item = b64url(aleator(16));
  // The names as the package will carry them, so the receiving desk computes the same summary.
  const curat = despacheteaza(impacheteaza({ ...pachet, firma: undefined }));
  const s = await semnez(cheiaCurenta(inel).privata, textPachet(catre.casuta, item, await rezumatPachet(curat)));
  const sigilat = await sigileazaPentruCerere(catre.firma.cheie, impacheteaza({ ...curat, firma: { c: certificat, s } }));
  await apel("trimit-firmei", { casuta: catre.casuta, item }, loc);
  await urca(r, "cerere-bucata", { id: catre.casuta, item }, sigilat, progres);
  const m: MetaTrimis = { ...meta, catre: catre.firma.firma, firma: { firma: catre.firma.firma, cui: catre.firma.cui, tara: catre.firma.tara } };
  await apel("trimis-pune", { casuta: catre.casuta, item, m: await sigilezMeta(inel, m, persoana) }, loc);
  return { ...m, id: item, creat: new Date().toISOString() };
}

// ------------------------------------------------------------------ between colleagues (decisions.md 2026-10-24, "A Business seat is a person")

/** Who sent a package into a person's inbox, and where it is filed on the sender's desk. */
export interface DeLaColeg {
  p: string;
  client: string;
  titlu: string;
  rand: string;
}

const textPachetColeg = (casuta: string, item: string, h: string, c: DeLaColeg) =>
  `colshare-pachet-coleg-v1\n${casuta}\n${item}\n${h}\n${c.p}\n${c.client}\n${c.titlu}\n${c.rand}`;

/**
 * Sends papers to a person of the firm: a colleague, or (`catre` this person's own id) their other device. The package
 * is signed with the sender's person key, sealed to the receiver's person key and put into their inbox, where only
 * their devices take it; the relay deletes it once they all have it. `inainte` hears the inbox and the item before the
 * first chunk goes, so a device that sends to its own person marks the item as kept already and never takes it back.
 */
export async function trimitPersoanei(r: Relay, apel: ApelFirma, loc: Loc, eu: Persoana, catre: string, pachet: Pachet,
  meta: Omit<DeLaColeg, "p">, progres?: (f: number) => void, inainte?: (casuta: string, item: string) => void | Promise<void>, cheieStiuta?: string): Promise<{ casuta: string; item: string }> {
  const { casuta, cheie } = await apel<{ casuta: string; cheie: string }>("casuta-persoana", { persoana: catre }, loc);
  // The colleague's key as this device trusts it (verificDirector): another one from the server is refused.
  if (cheieStiuta !== undefined && cheie !== cheieStiuta) throw new EroareFirma(409, "director");
  return inCasuta(r, { casuta, cheie }, { id: eu.id, privata: eu.privata }, pachet, meta, progres, async (c, item) => {
    await apel("trimit-persoanei", { casuta: c, item }, loc);
    await inainte?.(c, item);
  });
}

/** A package signed by `semnatar` (a person, or the firm's recovery key as "r:<whose>"), sealed and put into an inbox. */
async function inCasuta(r: Relay, la: { casuta: string; cheie: string }, semnatar: { id: string; privata: string }, pachet: Pachet,
  meta: Omit<DeLaColeg, "p">, progres?: (f: number) => void, inainte?: (casuta: string, item: string) => void | Promise<void>): Promise<{ casuta: string; item: string }> {
  const { casuta, cheie } = la;
  if (!/^[A-Za-z0-9_-]{22}$/.test(casuta) || !estePublica(dinB64url(cheie))) throw new EroareFirma(502);
  const item = b64url(aleator(16));
  await inainte?.(casuta, item);
  // The names as the package will carry them, so the receiving desk computes the same summary.
  const curat = despacheteaza(impacheteaza({ ...pachet, firma: undefined, coleg: undefined }));
  const c: DeLaColeg = { p: semnatar.id, client: meta.client.slice(0, 120), titlu: meta.titlu.slice(0, 200), rand: meta.rand };
  const s = await semnez(semnatar.privata, textPachetColeg(casuta, item, await rezumatPachet(curat), c));
  await urca(r, "cerere-bucata", { id: casuta, item }, await sigileazaPentruCerere(dinB64url(cheie), impacheteaza({ ...curat, coleg: { ...c, s } })), progres);
  return { casuta, item };
}

/**
 * A departed person's paper, opened on a returned device with the firm's recovery file, sent to the colleague who
 * takes over (`la`, from the link they made: preluareInfo). Signed with the recovery key, as "r:<whose it was>", so the
 * colleague's desk knows the firm's recovery file sent it.
 */
export const trimitRecuperat = (r: Relay, la: { casuta: string; cheie: string }, rec: CheieRecuperare, aCui: string, pachet: Pachet, meta: Omit<DeLaColeg, "p">, apel?: ApelFirma, token?: string) =>
  inCasuta(r, la, { id: `r:${aCui}`, privata: rec.privata }, pachet, meta, undefined, apel && token ? async (_c, item) => { await apel("preluare-item", { token, item }); } : undefined);

/** What a returned device learns from the link a colleague made to take a departed person's papers (no seat needed). */
export interface Preluare {
  firma: string;
  nume: string;
  casuta: string;
  cheie: string;
  recuperare: string;
}
export const preluareInfo = (apel: ApelFirma, token: string) => apel<Preluare>("preluare-info", { token });

/**
 * The colleague who sent a package found in this person's inbox, checked against the firm's people; a paper the firm's
 * recovery file sent ("r:<whose it was>") against the firm's recovery key. Undefined when it does not hold.
 */
export async function verificColeg(pachet: Uint8Array, casuta: string, item: string, persoane: { id: string; cheie: string; vechi?: string[] }[], recuperare?: string): Promise<DeLaColeg | undefined> {
  try {
    const p = despacheteaza(pachet);
    if (!p.coleg) return undefined;
    const { s, ...c } = p.coleg;
    // A package signed before the sender's key moved on holds with the key it was signed with.
    const om = persoane.find((x) => x.id === c.p);
    const chei = c.p.startsWith("r:") ? (recuperare ? [recuperare] : []) : om ? [om.cheie, ...(om.vechi ?? [])] : [];
    const text = textPachetColeg(casuta, item, await rezumatPachet({ ...p, firma: undefined, coleg: undefined }), c);
    for (const k of chei) if (await verificSemnatura(dinB64url(k), text, s)) return c;
    return undefined;
  } catch {
    return undefined;
  }
}

/** The firm that announced an item into this firm's inbox, as the server recorded it: its tax ID, country, key, generation. */
export interface Anuntator { c: string; t: string; k: string; g: number }

/**
 * The sending firm of a package found in this firm's inbox, checked; undefined when anything does not hold. With `de`,
 * the certificate inside must name the firm that announced it, under its current key: someone who left a firm with its
 * old ring and sends from a seat elsewhere is not taken as that firm (security audit 2026-10-25, second round, S2).
 */
export async function verificExpeditor(pachet: Uint8Array, casuta: string, item: string, chei: string[] = CHEI_CERTIFICAT, la = new Date(), de?: Anuntator): Promise<Certificat | undefined> {
  try {
    const p = despacheteaza(pachet);
    if (!p.firma) return undefined;
    // A certificate valid on the day it was sent: the sender's period may have ended since.
    const firma = await verificCertificat(p.firma.c, undefined, chei, la);
    if (!firma) return undefined;
    if (de && (firma.cui !== de.c || firma.tara !== de.t || firma.g !== de.g || b64url(firma.cheie) !== de.k)) return undefined;
    return (await verificSemnatura(firma.cheie, textPachet(casuta, item, await rezumatPachet({ ...p, firma: undefined })), p.firma.s)) ? firma : undefined;
  } catch {
    return undefined;
  }
}

/** The firm's sends of the last 30 days, opened, with when each was opened or taken. */
export async function trimiseFirma(apel: ApelFirma, loc: Loc, inel: Inel, persoana?: Persoana): Promise<TrimisFirma[]> {
  const { trimise } = await apel<{ trimise: { id: string; m: string; g: number; creat: string; deschis?: string; primit?: string; respins?: string }[] }>("trimise", {}, loc);
  const out: TrimisFirma[] = [];
  for (const x of trimise) {
    // The firm's key of its generation (a send from before people), else this person's keys: a colleague's is not read.
    let b: Uint8Array | undefined;
    for (const k of [...inel.chei.filter((y) => y.g === x.g), ...(persoana ? cheiPersoana(persoana) : [])]) {
      b = await deschideCuLacat(await importaPrivata(dinB64url(k.privata)), dinB64url(k.publica), dinB64url(x.m), INFO_TRIMIS);
      if (b) break;
    }
    if (!b) continue;
    try {
      const m = JSON.parse(new TextDecoder().decode(b)) as MetaTrimis;
      if (typeof m.catre !== "string" || typeof m.rand !== "string" || typeof m.client !== "string" || !Array.isArray(m.fisiere)) continue;
      out.push({ ...m, titlu: String(m.titlu ?? ""), id: x.id, creat: x.creat, ...(x.deschis ? { deschis: x.deschis } : {}), ...(x.primit ? { primit: x.primit } : {}), ...(x.respins ? { respins: x.respins } : {}) });
    } catch { /* one that does not read: left out */ }
  }
  return out;
}

/** Takes a send back: a link not yet opened is deleted; off the firm's list either way. */
export const stergTrimis = (apel: ApelFirma, loc: Loc, id: string) => apel("trimis-sterge", { id }, loc);

/** The desk's row for another firm: the same id on every seat of this firm, from that firm's country and tax ID. */
export const idRandFirma = async (tara: string, cui: string) => b64url(await sha256(enc(`colshare-rand-firma-v1\n${tara}\n${cui}`))).slice(0, 22);
