// People (docs/aplicatia-acte.md, "People"; decisions.md 2026-10-19 "Colshare's People"): someone added once by their
// card (a QR code in person, or a contact link) receives papers, safe copies and asks straight into their app.
//
// Each phone has a P-256 key pair and a mailbox on the relay (/api/acte, ops casuta-*). A card carries the public key,
// the mailbox and a drop token made for that card alone; the relay keeps only the token's SHA-256, and a token can drop
// into the mailbox, never read it. Adding someone from their card drops a greeting back through the card's token with
// the adder's own card, so one scan adds both ways. Every envelope is sealed to the recipient's key with an ephemeral
// key (core/teren/lacat.ts, the label "papers-oameni-v1") and carries an HMAC under the two static keys' ECDH, so the
// recipient knows which person sent it. The MAC also covers the relay item the envelope was sent as and when, so the
// relay cannot hand in an old envelope again, nor an old greeting that would undo a newer one. Someone who greets
// through a card this phone gave waits until the person taps "Add" (a card link can be forwarded; security audit
// 2026-10-20). Everything here lives in the encrypted index (./seif.ts), backup included.
//
// Papers sent to a person come back confirmed (decisions.md 2026-10-23, "Papers sent to a person come back
// confirmed"): when the recipient's app opens them into its store, it sends the sender a confirmation through the same
// mailboxes, sealed like any envelope, carrying a statement signed with the recipient's key (ECDSA, the key that signs
// copies and receipts, ./dovada.ts): which relay item, when it was opened, the package's SHA-256, from whom, to whom.
// The relay learns nothing new; the sender's receipt gains who opened it and when, provably.
import { deschideCuLacat, estePublica, importaPrivata, LUNGIME_PUBLICA, perecheLacat, sigileazaPentruLacat } from "../core/teren/lacat.ts";
import { aleator, b64url, bucati, coboara, curat, dinB64url, EroareRelay, ID_TRUSA, MAX_BUCATI, urca, type Relay } from "./link.ts";

const enc = (s: string) => new TextEncoder().encode(s);
export const INFO_OAMENI = enc("papers-oameni-v1");
const INFO_MAC = enc("papers-oameni-mac-v1");
const INFO_COD = enc("colshare-cod-v1");
/** A card given and never used is taken off the relay after this long. */
export const ZILE_INVITATIE = 30;
/** The longest name a card or a greeting carries. */
export const MAX_NUME = 80;

const ID = /^[A-Za-z0-9_-]{22}$/;
const JETON = /^[A-Za-z0-9_-]{43}$/;

const lipeste = (...p: Uint8Array[]) => {
  const o = new Uint8Array(p.reduce((s, x) => s + x.length, 0));
  let i = 0;
  for (const x of p) { o.set(x, i); i += x.length; }
  return o;
};
const sha256 = async (b: Uint8Array) => new Uint8Array(await crypto.subtle.digest("SHA-256", b as BufferSource));
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
/** A drop token's hash, as the relay keeps it. */
export const hashJeton = async (t: string) => hex(await sha256(enc(t)));

/** This phone as a person: its key pair and its mailbox (the secret lets it read and delete there). */
export interface Eu {
  privata: string;
  publica: string;
  casuta: string;
  s: string;
  creat: string;
}

/** A person added. */
export interface Om {
  id: string;
  nume: string;
  publica: string;
  /** Their mailbox, and the token they gave this phone to drop into it. */
  casuta: string;
  jeton: string;
  /** The hashes of the tokens this phone gave them (a card they used, the greeting's): what they drop through. */
  dela: string[];
  creat: string;
  /** Came by a card this phone gave, and not yet added by its owner: what they send waits on the relay till then. */
  astept?: true;
  /** The last relay items taken from them: one handed in again is dropped. */
  vazute?: string[];
  /** When each of `vazute` was sent (the same order); none on items taken before this was kept. */
  vazuteLa?: string[];
  /**
   * The newest send time among items that left `vazute`: anything sent at or before it is dropped, so the relay can't
   * hand in an old envelope again once 300 newer ones have pushed it out (attack test 2026-10-29, L11).
   */
  podea?: string;
  /** When their newest greeting was sent: an older one changes nothing. */
  salutLa?: string;
}

/** Relay items remembered per person against replays. */
const MAX_VAZUTE = 300;

/** A card given (shown or shared) whose token nobody has used yet. */
export interface Invitatie {
  j: string;
  creat: string;
}

/** Someone blocked: a greeting from this key is dropped unread. */
export interface Blocat {
  publica: string;
  nume: string;
  la: string;
}

/** An ask this phone sent to a person; what they send for it goes into its folder. */
export interface CerereCatreOm {
  id: string;
  om: string;
  titlu: string;
  ce: string[];
  dosar: string;
  creat: string;
}

/** An ask from a person, on the home screen until it is answered or dismissed. */
export interface CerereDeLaOm {
  id: string;
  om: string;
  titlu: string;
  ce: string[];
  /** The ask kit it follows (./truse.ts). */
  k?: string;
  la: string;
}

/** What the encrypted index keeps for People (all optional: an index from before People has none). */
export interface StareOameni {
  eu?: Eu;
  oameni?: Om[];
  invitatii?: Invitatie[];
  blocati?: Blocat[];
  cereriCatre?: CerereCatreOm[];
  cereriDeLa?: CerereDeLaOm[];
  /** Confirmations of papers opened here, not yet taken by their sender's mailbox (no signal): tried again. */
  confirmari?: ConfirmareDeTrimis[];
}

/** A confirmation waiting to go: to whom, and what it says. */
export interface ConfirmareDeTrimis extends Deschidere {
  om: string;
  s: string;
}

/** The lists, made where missing. */
export function liste(s: StareOameni): Required<Omit<StareOameni, "eu">> & { eu?: Eu } {
  s.oameni ??= [];
  s.invitatii ??= [];
  s.blocati ??= [];
  s.cereriCatre ??= [];
  s.cereriDeLa ??= [];
  s.confirmari ??= [];
  return s as Required<Omit<StareOameni, "eu">> & { eu?: Eu };
}

// ------------------------------------------------------------------ the card

/** What a card says: who, their key, their mailbox and the token made for this card. */
export interface Carte {
  publica: Uint8Array;
  casuta: string;
  jeton: string;
  nume: string;
}

export const adresaCarte = (domeniu: string, c: Carte) =>
  `${domeniu}/o/#${b64url(c.publica)}.${c.casuta}.${c.jeton}.${b64url(enc(c.nume.slice(0, MAX_NUME)))}`;

/** A card link (or its fragment) read back; undefined for anything else. */
export function citesteCarte(adresa: string): Carte | undefined {
  const m = /(?:\/o\/?)?#([A-Za-z0-9_.-]+)\s*$/.exec(adresa.trim());
  const p = m?.[1].split(".");
  if (!p || p.length !== 4 || !ID.test(p[1]) || !JETON.test(p[2])) return undefined;
  try {
    const publica = dinB64url(p[0]);
    const nume = curat(new TextDecoder("utf-8", { fatal: true }).decode(dinB64url(p[3]))).trim().slice(0, MAX_NUME);
    return estePublica(publica) ? { publica, casuta: p[1], jeton: p[2], nume } : undefined;
  } catch {
    return undefined;
  }
}

/**
 * PBKDF2 rounds for each key's half of the safety code: every key an attacker tries costs that many too. 200,000 since
 * 2026-10-29 (was 4,096): a card's key lives long, so a match for one half could be sought in advance, and 15 digits
 * at 4,096 rounds left that at about 13 GPU-years (attack test 2026-10-29, L12). Both phones, and the desk, must count
 * the same, so an app built before shows another code.
 */
const RUNDE_COD = 200_000;

/** One key's half of the safety code: 15 digits from PBKDF2-SHA-256 of the key (one call, done by the browser). */
async function jumatateCod(k: Uint8Array): Promise<string> {
  const baza = await crypto.subtle.importKey("raw", k as BufferSource, "PBKDF2", false, ["deriveBits"]);
  const h = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: INFO_COD as BufferSource, iterations: RUNDE_COD }, baza, 64));
  return String(h.reduce((s, x) => s * 256n + BigInt(x), 0n) % 10n ** 15n).padStart(15, "0");
}

/**
 * The safety code of two keys, the same on both phones: read aloud or compared side by side, it shows nobody swapped a
 * card on the way. Each key makes its own half (in a fixed order), so whoever swaps both cards must find a key whose
 * half equals the real one, for each side, and each try costs RUNDE_COD rounds. One code over both keys (24 digits, the
 * 2026-10-20 audit's) let them pick both keys together and only make the two codes meet, about 2^40 tries (security
 * audit 2026-10-25, A6). 30 digits in groups of five.
 */
export async function codSiguranta(a: Uint8Array, b: Uint8Array): Promise<string> {
  const mic = hex(a) <= hex(b);
  const cod = (await jumatateCod(mic ? a : b)) + (await jumatateCod(mic ? b : a));
  return cod.replace(/(\d{5})(?=\d)/g, "$1 ");
}

// ------------------------------------------------------------------ the envelope

/** What an envelope says before its package. */
export type Antet =
  | { fel: "salut"; nume: string; casuta: string; jeton: string }
  | { fel: "acte"; raspunsLa?: string }
  | { fel: "cerere"; id: string; titlu: string; ce: string[]; k?: string }
  | ({ fel: "confirmare"; s: string } & Deschidere);

/**
 * Papers opened on the recipient's phone: the relay item they came as, when, and the package's SHA-256 (hex). Named
 * apart from the envelope's own item and time (Plic's u and la), which every envelope also carries.
 */
export interface Deschidere {
  item: string;
  cand: string;
  h: string;
}

const ETICHETA_CONFIRMARE = "colshare-deschis-v1\n";
const EC = { name: "ECDSA", namedCurve: "P-256" } as const;
const SHA = { name: "ECDSA", hash: "SHA-256" } as const;
const HEX64 = /^[0-9a-f]{64}$/;
/** What a confirmation signs: the opening, the sender's key and the recipient's (both base64url). */
const declaratieDeschidere = (d: Deschidere, expeditor: string, destinatar: string) =>
  enc(ETICHETA_CONFIRMARE + JSON.stringify({ item: d.item, cand: d.cand, h: d.h, de: expeditor, catre: destinatar }));

/** The recipient's signature over an opening of papers `expeditor` sent (base64url). */
export async function semnezDeschiderea(eu: Pick<Eu, "privata" | "publica">, d: Deschidere, expeditor: string): Promise<string> {
  const k = await crypto.subtle.importKey("pkcs8", dinB64url(eu.privata) as BufferSource, EC, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign(SHA, k, declaratieDeschidere(d, expeditor, eu.publica) as BufferSource)));
}

/** Whether `destinatar`'s key signed this opening of papers `expeditor` sent: checkable later, by anyone with both keys. */
export async function verificDeschiderea(d: Deschidere, s: string, expeditor: string, destinatar: string): Promise<boolean> {
  try {
    const k = await crypto.subtle.importKey("raw", dinB64url(destinatar) as BufferSource, EC, false, ["verify"]);
    return await crypto.subtle.verify(SHA, k, dinB64url(s) as BufferSource, declaratieDeschidere(d, expeditor, destinatar) as BufferSource);
  } catch {
    return false;
  }
}

/** This phone's keys, ready for sealing and opening. */
export interface Chei {
  privata: CryptoKey;
  publica: Uint8Array;
}

export const cheile = async (eu: Eu): Promise<Chei> => ({ privata: await importaPrivata(dinB64url(eu.privata)), publica: dinB64url(eu.publica) });

/** The MAC key two people share: HKDF over the ECDH of one's private key and the other's public key. */
async function cheieMac(privata: CryptoKey, aMea: Uint8Array, aLui: Uint8Array): Promise<CryptoKey> {
  const lui = await crypto.subtle.importKey("raw", aLui as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: lui }, privata, 256);
  const baza = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  const mic = hex(aMea) <= hex(aLui);
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: lipeste(mic ? aMea : aLui, mic ? aLui : aMea) as BufferSource, info: INFO_MAC as BufferSource },
    baza, { name: "HMAC", hash: "SHA-256", length: 256 }, false, ["sign", "verify"]);
}

/** What every envelope also says, under the MAC: the relay item it was sent as, and when. */
export interface Plic {
  u: string;
  la: string;
}

/** The header and the package as one body: the header's length (4 bytes), the header as JSON, the package. */
function corpDin(antet: Antet, pachet: Uint8Array, plic?: Plic): Uint8Array {
  const a = enc(JSON.stringify({ ...antet, ...plic }));
  const l = new Uint8Array(4);
  new DataView(l.buffer).setUint32(0, a.length);
  return lipeste(l, a, pachet);
}

function antetBun(x: unknown): Antet | undefined {
  const a = x as Record<string, unknown> | null;
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
  if (a?.fel === "salut" && typeof a.casuta === "string" && ID.test(a.casuta) && typeof a.jeton === "string" && JETON.test(a.jeton)) {
    return { fel: "salut", nume: text(a.nume, MAX_NUME) ?? "", casuta: a.casuta, jeton: a.jeton };
  }
  if (a?.fel === "confirmare" && typeof a.item === "string" && ID.test(a.item) && typeof a.cand === "string" && !Number.isNaN(Date.parse(a.cand))
    && typeof a.h === "string" && HEX64.test(a.h) && typeof a.s === "string" && /^[A-Za-z0-9_-]{40,200}$/.test(a.s)) {
    return { fel: "confirmare", item: a.item, cand: a.cand, h: a.h, s: a.s };
  }
  if (a?.fel === "acte") return { fel: "acte", ...(typeof a.raspunsLa === "string" && ID.test(a.raspunsLa) ? { raspunsLa: a.raspunsLa } : {}) };
  if (a?.fel === "cerere" && typeof a.id === "string" && ID.test(a.id) && typeof a.titlu === "string") {
    const ce = Array.isArray(a.ce) ? a.ce.filter((y): y is string => typeof y === "string").map((y) => y.slice(0, 200)).slice(0, 12) : [];
    return { fel: "cerere", id: a.id, titlu: a.titlu.slice(0, 200), ce, ...(typeof a.k === "string" && ID_TRUSA.test(a.k) ? { k: a.k } : {}) };
  }
  return undefined;
}

/** An envelope for the person with public key `lui`: sealed to them, its sender proven by the MAC. */
export async function sigilez(eu: Chei, lui: Uint8Array, antet: Antet, pachet: Uint8Array = new Uint8Array(), plic?: Plic): Promise<Uint8Array> {
  const corp = corpDin(antet, pachet, plic);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", await cheieMac(eu.privata, eu.publica, lui), lipeste(eu.publica, lui, corp) as BufferSource));
  return sigileazaPentruLacat(lui, lipeste(eu.publica, mac, corp), INFO_OAMENI);
}

/** An envelope opened: who sent it (their public key), its header and package; undefined when it does not open or prove. */
export async function deschid(eu: Chei, sigilat: Uint8Array): Promise<{ de: Uint8Array; antet: Antet; pachet: Uint8Array; plic?: Plic } | undefined> {
  const x = await deschideCuLacat(eu.privata, eu.publica, sigilat, INFO_OAMENI);
  if (!x || x.length < LUNGIME_PUBLICA + 32 + 4) return undefined;
  const de = x.slice(0, LUNGIME_PUBLICA), mac = x.subarray(LUNGIME_PUBLICA, LUNGIME_PUBLICA + 32), corp = x.subarray(LUNGIME_PUBLICA + 32);
  if (!estePublica(de)) return undefined;
  try {
    if (!(await crypto.subtle.verify("HMAC", await cheieMac(eu.privata, eu.publica, de), mac as BufferSource, lipeste(de, eu.publica, corp) as BufferSource))) return undefined;
    const n = new DataView(corp.buffer, corp.byteOffset).getUint32(0);
    if (4 + n > corp.length) return undefined;
    const j = JSON.parse(new TextDecoder().decode(corp.subarray(4, 4 + n)));
    const antet = antetBun(j);
    const plic = typeof j?.u === "string" && ID.test(j.u) && typeof j.la === "string" && !Number.isNaN(Date.parse(j.la)) ? { u: j.u as string, la: j.la as string } : undefined;
    return antet && { de, antet, pachet: corp.slice(4 + n), ...(plic ? { plic } : {}) };
  } catch {
    return undefined;
  }
}

// ------------------------------------------------------------------ the relay

/**
 * This phone's identity and mailbox, made the first time People is used; with the key the phone already signs copies
 * and receipts with (./dovada.ts), when it has one, so a phone has one key.
 */
export async function facEu(r: Relay, cheie?: { privata: string; publica: string }): Promise<Eu> {
  let k = cheie;
  if (!k) {
    const p = await perecheLacat();
    k = { privata: b64url(p.privata), publica: b64url(p.publica) };
  }
  const casuta = b64url(aleator(16)), s = b64url(aleator(32));
  await r("casuta-pune", { id: casuta, h: await hashJeton(s) });
  return { privata: k.privata, publica: k.publica, casuta, s, creat: new Date().toISOString() };
}

/** A new drop token on this phone's mailbox: the token (for a card or a greeting) and its hash. */
async function jetonNou(r: Relay, eu: Eu): Promise<{ t: string; j: string }> {
  const t = b64url(aleator(32)), j = await hashJeton(t);
  await r("casuta-jeton", { id: eu.casuta, s: eu.s, j });
  return { t, j };
}

/** This phone's card, with a token of its own (kept as an invitation until someone uses it). */
export async function carteNoua(r: Relay, stare: StareOameni, domeniu: string, nume: string): Promise<string> {
  const eu = stare.eu!;
  const { t, j } = await jetonNou(r, eu);
  liste(stare).invitatii.push({ j, creat: new Date().toISOString() });
  return adresaCarte(domeniu, { publica: dinB64url(eu.publica), casuta: eu.casuta, jeton: t, nume });
}

/** An envelope to a person's mailbox, through the token they gave: checked, sealed, sent up in chunks. Gives the relay item. */
export async function trimitLui(r: Relay, eu: Chei, om: Pick<Om, "casuta" | "jeton" | "publica">, antet: Antet, pachet?: Uint8Array, progres?: (f: number) => void): Promise<string> {
  await r("casuta-info", { id: om.casuta, t: om.jeton });
  const item = b64url(aleator(16));
  const sigilat = await sigilez(eu, dinB64url(om.publica), antet, pachet, { u: item, la: new Date().toISOString() });
  if (bucati(sigilat.length) > MAX_BUCATI) throw new EroareRelay(413, "prea-mare");
  await urca(r, "casuta-bucata", { id: om.casuta, t: om.jeton, item }, sigilat, progres);
  return item;
}

/**
 * Adds the person whose card this is: files them, makes a token for them and sends them this phone's card through
 * theirs (the greeting). A card already used by someone else, or taken back, fails with EroareRelay 403 "jeton", and
 * nothing is kept.
 */
export async function adaug(r: Relay, stare: StareOameni, carte: Carte, numeleMeu: string): Promise<Om> {
  const l = liste(stare), eu = stare.eu!;
  const publica = b64url(carte.publica);
  if (publica === eu.publica) throw new EroareRelay(400, "eu");
  const { t, j } = await jetonNou(r, eu);
  try {
    await trimitLui(r, await cheile(eu), { ...carte, publica }, { fel: "salut", nume: numeleMeu.slice(0, MAX_NUME), casuta: eu.casuta, jeton: t });
  } catch (e) {
    await r("casuta-scoate", { id: eu.casuta, s: eu.s, j }).catch(() => undefined);
    throw e;
  }
  l.blocati = l.blocati.filter((b) => b.publica !== publica);
  const fost = l.oameni.find((o) => o.publica === publica);
  if (fost) {
    Object.assign(fost, { casuta: carte.casuta, jeton: carte.jeton, nume: fost.nume || carte.nume, dela: [...fost.dela, j] });
    return fost;
  }
  const om: Om = { id: b64url(aleator(16)), nume: carte.nume, publica, casuta: carte.casuta, jeton: carte.jeton, dela: [j], creat: new Date().toISOString() };
  l.oameni.push(om);
  return om;
}

/**
 * Removes a person (and, with `blochez`, remembers their key so no card of this phone adds them again): every token
 * they hold is taken off the relay, with what waits from them; their asks go too.
 */
export async function scot(r: Relay, stare: StareOameni, id: string, blochez: boolean): Promise<void> {
  const l = liste(stare), eu = stare.eu;
  const om = l.oameni.find((o) => o.id === id);
  if (!om) return;
  if (eu) for (const j of om.dela) await r("casuta-scoate", { id: eu.casuta, s: eu.s, j });
  l.oameni = l.oameni.filter((o) => o.id !== id);
  l.cereriDeLa = l.cereriDeLa.filter((c) => c.om !== id);
  l.cereriCatre = l.cereriCatre.filter((c) => c.om !== id);
  if (blochez) l.blocati.push({ publica: om.publica, nume: om.nume, la: new Date().toISOString() });
}

/** A person who came by a card, added by this phone's owner: what they sent comes in at the next fetch. */
export function confirmOm(stare: StareOameni, id: string): void {
  const om = liste(stare).oameni.find((o) => o.id === id);
  if (om) delete om.astept;
}

/** Another person already filed under this name (a greeting can carry any name). */
export const altulCuNumele = (stare: StareOameni, om: Pick<Om, "id" | "nume">): Om | undefined =>
  liste(stare).oameni.find((o) => o.id !== om.id && o.nume.trim().toLocaleLowerCase() === om.nume.trim().toLocaleLowerCase());

/** Cards given more than 30 days ago and never used: taken off the relay. */
export async function invitatiiVechi(r: Relay, stare: StareOameni, acum = Date.now()): Promise<void> {
  const l = liste(stare), eu = stare.eu;
  if (!eu) return;
  for (const i of l.invitatii.filter((x) => acum - Date.parse(x.creat) > ZILE_INVITATIE * 86_400_000)) {
    await r("casuta-scoate", { id: eu.casuta, s: eu.s, j: i.j });
    l.invitatii = l.invitatii.filter((x) => x !== i);
  }
}

/**
 * The relay no longer has this phone's mailbox (it stayed in an old store, a report removed it, or it went unused for
 * 180 days): a new one with the same key, and a greeting to each person through their token carrying a token of the
 * new mailbox, which their app takes as it takes any newer greeting. Cards given and never used opened the old mailbox
 * only: they go. A person whose own mailbox refuses the greeting (they removed this phone, theirs went too, or it is
 * full) keeps no token until one of the two adds the other again. A passing failure (no signal, the relay busy) changes nothing and
 * throws: the next fetch starts over with another mailbox, and a greeting already sent is outdated by the newer one.
 * Returns how many people the greeting reached.
 */
export async function casutaNoua(r: Relay, stare: StareOameni, numeleMeu: string): Promise<number> {
  const l = liste(stare), vechi = stare.eu!;
  const eu = await facEu(r, { privata: vechi.privata, publica: vechi.publica });
  const chei = await cheile(eu);
  const dela = new Map<Om, string[]>();
  for (const om of l.oameni) {
    const { t, j } = await jetonNou(r, eu);
    try {
      await trimitLui(r, chei, om, { fel: "salut", nume: numeleMeu.slice(0, MAX_NUME), casuta: eu.casuta, jeton: t });
      dela.set(om, [j]);
    } catch (e) {
      if (!(e instanceof EroareRelay) || e.status === 0 || e.status === 429 || (e.status >= 500 && e.cod !== "plina")) throw e;
      await r("casuta-scoate", { id: eu.casuta, s: eu.s, j }).catch(() => undefined);
      dela.set(om, []);
    }
  }
  for (const [om, j] of dela) om.dela = j;
  stare.eu = eu;
  l.invitatii = [];
  return [...dela.values()].filter((j) => j.length).length;
}

/** One item waiting in the mailbox: its id, the token's hash it came through, its chunks. */
export interface Sosire {
  item: string;
  j: string;
  n: number;
}

/** Where arrivals come from: the relay itself, or (on Android) what the background job already took off it. */
export interface SursaCasuta {
  lista(): Promise<Sosire[]>;
  ia(s: Sosire): Promise<Uint8Array>;
  gata(s: Sosire): Promise<void>;
}

export function casutaRelay(r: Relay, eu: Eu): SursaCasuta {
  return {
    lista: async () => (await r<{ acte: Sosire[] }>("casuta-primite", { id: eu.casuta, s: eu.s })).acte,
    ia: (s) => coboara(r, "casuta-ia", { id: eu.casuta, s: eu.s, item: s.item }, s.n),
    gata: async (s) => { await r("casuta-confirma", { id: eu.casuta, s: eu.s, item: s.item }); },
  };
}

/** What an arrival brought, once filed against the people; "pastrez": not yet (its sender is not added yet). */
export type Primit =
  | { fel: "pastrez" }
  | { fel: "om-nou"; om: Om }
  | { fel: "acte"; om: Om; pachet: Uint8Array; raspunsLa?: string; item: string }
  | ({ fel: "confirmare"; om: Om; s: string } & Deschidere)
  | { fel: "cerere"; om: Om; cerere: CerereDeLaOm };

/**
 * One arrival opened and filed: a greeting adds (or updates) a person, papers and asks are said to come from the person
 * whose token they came through, and only if their key proves it. Undefined for anything dropped unread.
 */
export async function prelucrez(stare: StareOameni, eu: Chei, s: Pick<Sosire, "j" | "item">, sigilat: Uint8Array): Promise<Primit | undefined> {
  const l = liste(stare);
  const d = await deschid(eu, sigilat);
  // Sent as another relay item, or without saying which: handed in by someone other than its sender.
  if (!d?.plic || d.plic.u !== s.item) return undefined;
  const de = b64url(d.de);
  const om = l.oameni.find((o) => o.dela.includes(s.j));
  if (om) {
    if (om.publica !== de || om.vazute?.includes(s.item) || (om.podea && d.plic.la <= om.podea)) return undefined;
    if (om.astept && d.antet.fel !== "salut") return { fel: "pastrez" };
    const vazute = [...(om.vazute ?? []), s.item], la = [...(om.vazuteLa ?? (om.vazute ?? []).map(() => "")), d.plic.la];
    const iese = la.slice(0, Math.max(0, vazute.length - MAX_VAZUTE)).filter(Boolean).sort().at(-1);
    if (iese && (!om.podea || iese > om.podea)) om.podea = iese;
    om.vazute = vazute.slice(-MAX_VAZUTE);
    om.vazuteLa = la.slice(-MAX_VAZUTE);
    if (d.antet.fel === "salut") {
      if (!om.salutLa || d.plic.la > om.salutLa) Object.assign(om, { casuta: d.antet.casuta, jeton: d.antet.jeton, salutLa: d.plic.la });
      return undefined;
    }
    if (d.antet.fel === "acte") return { fel: "acte", om, pachet: d.pachet, item: s.item, ...(d.antet.raspunsLa ? { raspunsLa: d.antet.raspunsLa } : {}) };
    // A confirmation counts only if this person's key signed it, for papers this phone sent.
    if (d.antet.fel === "confirmare") {
      const { item, cand, h, s: sem } = d.antet;
      return (await verificDeschiderea({ item, cand, h }, sem, b64url(eu.publica), om.publica)) ? { fel: "confirmare", om, item, cand, h, s: sem } : undefined;
    }
    const c: CerereDeLaOm = { id: d.antet.id, om: om.id, titlu: d.antet.titlu, ce: d.antet.ce, ...(d.antet.k ? { k: d.antet.k } : {}), la: new Date().toISOString() };
    l.cereriDeLa = [c, ...l.cereriDeLa.filter((x) => x.id !== c.id)];
    return { fel: "cerere", om, cerere: c };
  }
  // A card's first use: only a greeting, only from someone not blocked.
  const inv = l.invitatii.find((i) => i.j === s.j);
  if (!inv || d.antet.fel !== "salut" || l.blocati.some((b) => b.publica === de)) return undefined;
  l.invitatii = l.invitatii.filter((i) => i !== inv);
  const fost = l.oameni.find((o) => o.publica === de);
  if (fost) {
    // Both scanned each other's card: one person, both tokens.
    Object.assign(fost, { casuta: d.antet.casuta, jeton: d.antet.jeton, dela: [...fost.dela, s.j], vazute: [...(fost.vazute ?? []), s.item].slice(-MAX_VAZUTE), salutLa: d.plic.la });
    return undefined;
  }
  // Whoever greets through a card waits for this phone's owner to add them: the name is theirs to choose, the card may
  // have been forwarded.
  const nou: Om = { id: b64url(aleator(16)), nume: d.antet.nume, publica: de, casuta: d.antet.casuta, jeton: d.antet.jeton, dela: [s.j], creat: new Date().toISOString(),
    astept: true, vazute: [s.item], salutLa: d.plic.la };
  l.oameni.push(nou);
  return { fel: "om-nou", om: nou };
}

/** Confirmations not sent after this long are dropped. */
const ZILE_CONFIRMARE = 30;

/**
 * Papers from a person opened into this phone's store: the confirmation, signed and queued; then every confirmation
 * still waiting is sent (one that fails waits for the next fetch). Call `salvez` after.
 */
export async function confirmDeschiderea(r: Relay, stare: StareOameni, eu: Eu, chei: Chei, p: { om: Om; item: string; pachet: Uint8Array }): Promise<void> {
  const d: Deschidere = { item: p.item, cand: new Date().toISOString(), h: hex(await sha256(p.pachet)) };
  liste(stare).confirmari.push({ ...d, om: p.om.id, s: await semnezDeschiderea(eu, d, p.om.publica) });
  await trimitConfirmarile(r, stare, chei);
}

/** The confirmations waiting, sent; those whose person is gone, or older than 30 days, dropped. */
export async function trimitConfirmarile(r: Relay, stare: StareOameni, chei: Chei, acum = Date.now()): Promise<void> {
  const l = liste(stare);
  const raman: ConfirmareDeTrimis[] = [];
  for (const c of l.confirmari) {
    const om = l.oameni.find((o) => o.id === c.om && !o.astept);
    if (!om || acum - Date.parse(c.cand) > ZILE_CONFIRMARE * 86_400_000) continue;
    try {
      await trimitLui(r, chei, om, { fel: "confirmare", item: c.item, cand: c.cand, h: c.h, s: c.s });
    } catch {
      raman.push(c);
    }
  }
  l.confirmari = raman;
}

/**
 * Everything waiting in `sursa`, each item opened, filed (`fa` keeps what it brought, `salvez` the people's lists) and
 * only then deleted from where it waited. An item that cannot be fetched stays for the next time; one that does not
 * open is deleted.
 */
export async function primesc(sursa: SursaCasuta, stare: StareOameni, eu: Chei, fa: (p: Primit) => Promise<void>, salvez: () => Promise<void>): Promise<number> {
  let n = 0;
  for (const s of await sursa.lista()) {
    let sigilat: Uint8Array;
    try {
      sigilat = await sursa.ia(s);
    } catch (e) {
      if (e instanceof EroareRelay && e.cod === "lipsa") { await sursa.gata(s); continue; }
      throw e;
    }
    const p = await prelucrez(stare, eu, s, sigilat);
    // From someone not added yet: it stays where it waits, and comes in once they are added (or goes with them).
    if (p?.fel === "pastrez") continue;
    if (p) { await fa(p); n++; }
    await salvez();
    await sursa.gata(s);
  }
  return n;
}
