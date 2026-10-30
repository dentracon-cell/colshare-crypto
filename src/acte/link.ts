// Send by link and ask by link (docs/aplicatia-acte.md), the same code in the app and on the link pages.
//
// A send: the package (./pachet.ts) encrypted with AES-256-GCM under a fresh 32-byte key, cut in 512 KiB chunks and
// sent to /api/acte; the link is <domain>/p/#<id>.<key>. Browsers never send the fragment to a server, so the relay
// holds only bytes it cannot open. The sender keeps a secret that lets it delete the link before it is opened.
//
// An ask: the asker's phone makes a P-256 key pair and opens the ask on the relay with a hash of its secret; the link is
// <domain>/a/#<id>.<public key>.<what is asked, base64url JSON>. The sender's browser seals each package to that
// public key (core/teren/lacat.ts, its own context label), so nobody else who sees the ask link reads what others sent.
import { sigileazaPentruLacat, deschideCuLacat, estePublica } from "../core/teren/lacat.ts";
import { b64url, BUCATA, dinB64url, MAX_BUCATI } from "../core/teren/plic.ts";

export { b64url, dinB64url, BUCATA, MAX_BUCATI };

const AAD_LINK = new TextEncoder().encode("papers-link-v1");
/** The sealing's context label for asks: an ask's item never opens as a topograpp lock's note, nor the reverse. */
export const INFO_CERERE = new TextEncoder().encode("papers-cerere-v1");
/** The longest text an ask carries in its link. */
export const MAX_TEXT_CERERE = 600;

export const aleator = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const lipeste = (a: Uint8Array, b: Uint8Array) => { const o = new Uint8Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; };

/** A package encrypted for a send link: nonce (12) ‖ AES-256-GCM. */
export async function cripteazaLink(cheie: Uint8Array, pachet: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", cheie as BufferSource, "AES-GCM", false, ["encrypt"]);
  const nonce = aleator(12);
  return lipeste(nonce, new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, additionalData: AAD_LINK }, k, pachet as BufferSource)));
}

/** The package back, or undefined (another key, a byte changed). */
export async function decripteazaLink(cheie: Uint8Array, sigilat: Uint8Array): Promise<Uint8Array | undefined> {
  try {
    const k = await crypto.subtle.importKey("raw", cheie as BufferSource, "AES-GCM", false, ["decrypt"]);
    return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: sigilat.subarray(0, 12) as BufferSource, additionalData: AAD_LINK }, k, sigilat.subarray(12) as BufferSource));
  } catch {
    return undefined;
  }
}

export const sigileazaPentruCerere = (publica: Uint8Array, pachet: Uint8Array) => sigileazaPentruLacat(publica, pachet, INFO_CERERE);
export const deschideDinCerere = (privata: CryptoKey, publica: Uint8Array, sigilat: Uint8Array) => deschideCuLacat(privata, publica, sigilat, INFO_CERERE);

/** What an ask asks: a title, a few lines, and the asker's name as the sender sees it. */
export interface TextCerere {
  titlu: string;
  ce: string[];
  de?: string;
  /** The ask kit it follows (./truse.ts), when it was made from one: what the law allows for that use. */
  k?: string;
  /** A firm's note to the client, shown on the ask's page (./firma.ts; decisions.md 2026-10-28 "Notes on an ask"). */
  nota?: string;
}

/** A kit's id as links carry it ("fr-chirie"); the pages show only the kits they know. */
export const ID_TRUSA = /^[a-z]{2}-[a-z]{2,12}$/;

/**
 * What a send link shows before it is opened: who sends and the note for the recipient. In the fragment with the key,
 * so the server never sees them; the recipient's page names the sender before the "Open" button.
 */
export interface FataLink {
  de?: string;
  nota?: string;
}

const fata = (f?: FataLink) => {
  const j = JSON.stringify({ ...(f?.de ? { d: f.de.slice(0, 80) } : {}), ...(f?.nota ? { n: f.nota.slice(0, 160) } : {}) });
  return j === "{}" ? "" : `.${b64url(new TextEncoder().encode(j))}`;
};

/**
 * Text from outside (a name or note typed into a link, an ask's words, a firm's name) without control characters or
 * the marks that turn the direction of the text after them (security audit 2026-10-25, L2): a name could otherwise
 * draw "names are not checked" backwards, or fake where it ends. Zero-width and invisible characters go too (attack test
 * 2026-10-30, V2).
 */
// eslint-disable-next-line no-control-regex
export const curat = (s: string) => s.replace(/[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u180e\u200b\u200e\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, "");

/**
 * A note on an ask (the firm's to the client, the client's back): as `curat`, but its line breaks stay, at most one
 * empty line between paragraphs, 500 characters at most.
 */
export const curatNota = (s: string) => s.replace(/\r\n?/g, "\n").split("\n").map((x) => curat(x).trimEnd()).join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 500);

export const adresaLink = (domeniu: string, id: string, cheie: Uint8Array, f?: FataLink) => `${domeniu}/p/#${id}.${b64url(cheie)}${fata(f)}`;
export function adresaCerere(domeniu: string, id: string, publica: Uint8Array, text: TextCerere): string {
  const t = { t: text.titlu.slice(0, 200), c: text.ce.map((x) => x.slice(0, 200)).filter(Boolean).slice(0, 12), ...(text.de ? { n: text.de.slice(0, 80) } : {}), ...(text.k && ID_TRUSA.test(text.k) ? { k: text.k } : {}) };
  let j = JSON.stringify(t);
  while (j.length > MAX_TEXT_CERERE && t.c.length) { t.c.pop(); j = JSON.stringify(t); }
  return `${domeniu}/a/#${id}.${b64url(publica)}.${b64url(new TextEncoder().encode(j))}`;
}

export type Adresa =
  | { fel: "link"; id: string; cheie: Uint8Array; fata: FataLink }
  | { fel: "cerere"; id: string; publica: Uint8Array; text: TextCerere; certificat?: string }
  /** A firm's ask by its short link (./firma.ts): what it asks waits on the relay, encrypted under `cheie`. */
  | { fel: "cerere-firma"; id: string; cheie: Uint8Array };

const ID = /^[A-Za-z0-9_-]{22}$/;

/** A send or ask link (or its fragment alone) read back; undefined for anything else. */
export function citesteAdresa(adresa: string): Adresa | undefined {
  // The path may name the recipient's language (/a/ro/#…): the fragment is the same.
  const m = /(?:\/(p|a)(?:\/[a-z]{2})?\/?)?#([A-Za-z0-9_.-]+)\s*$/.exec(adresa.trim());
  if (!m) return undefined;
  const parti = m[2].split(".");
  try {
    if ((m[1] ?? "p") === "p" && (parti.length === 2 || parti.length === 3) && ID.test(parti[0]) && parti[1].length === 43) {
      const cheie = dinB64url(parti[1]);
      let f: FataLink = {};
      if (parti[2]) {
        const j = JSON.parse(new TextDecoder().decode(dinB64url(parti[2]))) as { d?: unknown; n?: unknown };
        f = { ...(typeof j.d === "string" && curat(j.d).trim() ? { de: curat(j.d).slice(0, 80) } : {}), ...(typeof j.n === "string" && curat(j.n).trim() ? { nota: curat(j.n).slice(0, 160) } : {}) };
      }
      return cheie.length === 32 ? { fel: "link", id: parti[0], cheie, fata: f } : undefined;
    }
    if ((m[1] ?? "a") === "a" && parti.length === 2 && ID.test(parti[0]) && parti[1].length === 22) {
      const cheie = dinB64url(parti[1]);
      return cheie.length === 16 ? { fel: "cerere-firma", id: parti[0], cheie } : undefined;
    }
    // A person's ask (./link.ts). A long link from a firm of before also carried a certificate as its fourth and fifth
    // parts: it is left out, since the ask's text is not the firm's and anyone holding the certificate could have put
    // their own words under the firm's name (security audit 2026-10-25, L1). Firms name themselves through short links.
    if ((m[1] ?? "a") === "a" && (parti.length === 3 || parti.length === 5) && ID.test(parti[0])) {
      const publica = dinB64url(parti[1]);
      const j = JSON.parse(new TextDecoder().decode(dinB64url(parti[2]))) as { t?: unknown; c?: unknown; n?: unknown; k?: unknown };
      if (!estePublica(publica) || typeof j.t !== "string") return undefined;
      const ce = Array.isArray(j.c) ? j.c.filter((x): x is string => typeof x === "string").map(curat).slice(0, 12) : [];
      return { fel: "cerere", id: parti[0], publica, text: { titlu: curat(j.t).slice(0, 200), ce, ...(typeof j.n === "string" && curat(j.n).trim() ? { de: curat(j.n).slice(0, 80) } : {}), ...(typeof j.k === "string" && ID_TRUSA.test(j.k) ? { k: j.k } : {}) } };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** An answer the relay gave with an error: its status, its code (the pages say it in the reader's language). */
export class EroareRelay extends Error {
  constructor(public status: number, public cod?: string) {
    super(`relay ${status}${cod ? ` ${cod}` : ""}`);
  }
}

/** The relay's calls: JSON in, JSON out; a network failure is status 0. */
export function relay(server: string, trimite: typeof fetch = (...a) => fetch(...a)) {
  return async <T = Record<string, unknown>>(op: string, corp: object): Promise<T> => {
    let r: Response;
    try {
      r = await trimite(`${server}/api/acte/${op}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corp) });
    } catch {
      throw new EroareRelay(0);
    }
    const j = await r.json().catch(() => ({})) as T & { cod?: string };
    if (!r.ok) throw new EroareRelay(r.status, j.cod);
    return j;
  };
}
export type Relay = ReturnType<typeof relay>;

const base64 = (b: Uint8Array) => {
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
// A plain loop: Uint8Array.from with a callback took a third of a second for a scan on a phone (2026-10-25).
const dinBase64 = (s: string) => {
  const b = atob(s), u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
};

/** Chunks a sealed item would take. */
export const bucati = (octeti: number) => Math.max(1, Math.ceil(octeti / BUCATA));

/**
 * Sends sealed bytes in chunks through `op` ("link-bucata" or "cerere-bucata"), each chunk tried three times; the
 * relay takes a chunk sent twice once. Resolves when the relay holds them all. `progres` also gets the start of the
 * chunk being sent, as sent (base64 ciphertext), before and after it goes: the app shows what leaves the phone.
 */
export async function urca(r: Relay, op: string, baza: object, sigilat: Uint8Array, progres?: (f: number, cifru?: string) => void): Promise<void> {
  const n = bucati(sigilat.length);
  if (n > MAX_BUCATI) throw new EroareRelay(413, "prea-mare");
  for (let i = 0; i < n; i++) {
    let incercari = 0;
    const d = base64(sigilat.subarray(i * BUCATA, (i + 1) * BUCATA));
    progres?.(i / n, d.slice(0, 600));
    for (;;) {
      try {
        const j = await r<{ primit?: number }>(op, { ...baza, i, n, d });
        if (i === n - 1 && j.primit !== n) throw new EroareRelay(409);
        break;
      } catch (e) {
        if (!(e instanceof EroareRelay) || (e.status !== 0 && e.status !== 409 && e.status < 500) || ++incercari >= 3) throw e;
        await new Promise((ok) => setTimeout(ok, 800 * incercari));
      }
    }
    progres?.((i + 1) / n, d.slice(0, 600));
  }
}

/** Fetches `n` chunks through `op` and puts them together. */
export async function coboara(r: Relay, op: string, baza: object, n: number, progres?: (f: number) => void): Promise<Uint8Array> {
  const parti: Uint8Array[] = [];
  for (let i = 0; i < n; i++) {
    let incercari = 0;
    for (;;) {
      try {
        parti.push(dinBase64((await r<{ d: string }>(op, { ...baza, i })).d));
        break;
      } catch (e) {
        if (!(e instanceof EroareRelay) || (e.status !== 0 && e.status < 500) || ++incercari >= 3) throw e;
        await new Promise((ok) => setTimeout(ok, 800 * incercari));
      }
    }
    progres?.((i + 1) / n);
  }
  const out = new Uint8Array(parti.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parti) { out.set(p, o); o += p.length; }
  return out;
}

/** A send link made: what the sender keeps to share it again or delete it. */
export interface LinkFacut {
  id: string;
  /** The deletion secret. */
  s: string;
  adresa: string;
}

/**
 * What the relay asks for before it serves a link's chunks: the SHA-256 of a label and the link's key. The key never
 * leaves the browser and the relay keeps only this token's hash, so a link's id alone (in a log, say) can't use the
 * link up (attack test 2026-10-29, K4). The token tells nothing of the key.
 */
export async function tokenLink(cheie: Uint8Array): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", lipeste(new TextEncoder().encode("colshare-link-ia-v1\n"), cheie) as BufferSource)));
}

/** Encrypts the package, sends it up and gives the link. */
export async function facLink(r: Relay, domeniu: string, pachet: Uint8Array, progres?: (f: number, cifru?: string) => void, f?: FataLink): Promise<LinkFacut> {
  const id = b64url(aleator(16)), s = b64url(aleator(32)), cheie = aleator(32);
  const sigilat = await cripteazaLink(cheie, pachet);
  await urca(r, "link-bucata", { id, s, t: await tokenLink(cheie) }, sigilat, progres);
  return { id, s, adresa: adresaLink(domeniu, id, cheie, f) };
}

/** Opens a send link: fetches it, decrypts it, tells the relay to delete it. Throws EroareRelay (410 opened, 404 gone). */
export async function deschidLink(r: Relay, id: string, cheie: Uint8Array, progres?: (f: number) => void): Promise<Uint8Array> {
  const { n } = await r<{ n: number }>("link-info", { id });
  let sigilat: Uint8Array;
  try {
    sigilat = await coboara(r, "link-ia", { id, t: await tokenLink(cheie) }, n, progres);
  } catch (e) {
    // The relay refuses a key that isn't the link's, as the decryption would: the link stays for the right one.
    if (e instanceof EroareRelay && e.status === 403) throw new EroareRelay(422, "cheie");
    throw e;
  }
  const pachet = await decripteazaLink(cheie, sigilat);
  if (!pachet) throw new EroareRelay(422, "cheie");
  // Deleted now; if this call fails, the relay deletes it fifteen minutes after the last chunk anyway.
  await r("link-deschis", { id }).catch(() => undefined);
  return pachet;
}

/** An ask opened: what the asker keeps (its private key stays in the phone's encrypted store). */
export interface CerereFacuta {
  id: string;
  s: string;
  adresa: string;
  privata: Uint8Array;
  publica: Uint8Array;
}

const sha256hex = async (s: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((x) => x.toString(16).padStart(2, "0")).join("");

export async function facCerere(r: Relay, domeniu: string, text: TextCerere): Promise<CerereFacuta> {
  const k = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const privata = new Uint8Array(await crypto.subtle.exportKey("pkcs8", k.privateKey));
  const publica = new Uint8Array(await crypto.subtle.exportKey("raw", k.publicKey));
  const id = b64url(aleator(16)), s = b64url(aleator(32));
  await r("cerere-pune", { id, h: await sha256hex(s) });
  return { id, s, adresa: adresaCerere(domeniu, id, publica, text), privata, publica };
}

/** The sender's side of an ask: seals the package to the asker and sends it up. */
export async function trimitInCerere(r: Relay, id: string, publica: Uint8Array, pachet: Uint8Array, progres?: (f: number) => void): Promise<void> {
  await r("cerere-info", { id });
  const sigilat = await sigileazaPentruCerere(publica, pachet);
  await urca(r, "cerere-bucata", { id, item: b64url(aleator(16)) }, sigilat, progres);
}

/** Where an ask's answers wait: the relay, or the phone's storage once Android's job took them off it (still sealed). */
export interface SursaCerere {
  lista(): Promise<{ item: string; n: number }[]>;
  ia(a: { item: string; n: number }): Promise<Uint8Array>;
  gata(item: string): Promise<void>;
}

/**
 * What waits in the asker's ask, opened: first what the background job already took (`local`), then the relay; each
 * package deleted from where it waited once `pastreaza` kept it. The answer is the number of papers kept, as
 * `pastreaza` counts them.
 */
export async function iauDinCerere(r: Relay, c: { id: string; s: string; privata: Uint8Array; publica: Uint8Array }, pastreaza: (pachet: Uint8Array) => Promise<number>, local?: SursaCerere): Promise<number> {
  const relayul: SursaCerere = {
    lista: async () => (await r<{ acte: { item: string; n: number }[] }>("cerere-primite", { id: c.id, s: c.s })).acte,
    ia: (a) => coboara(r, "cerere-ia", { id: c.id, s: c.s, item: a.item }, a.n),
    gata: async (item) => { await r("cerere-confirma", { id: c.id, s: c.s, item }); },
  };
  const privata = await crypto.subtle.importKey("pkcs8", c.privata as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  let luate = 0;
  // An item kept from the phone is deleted from the relay too (the job may have been cut before its confirm).
  for (const sursa of local ? [local, relayul] : [relayul]) {
    for (const a of await sursa.lista()) {
      const sigilat = await sursa.ia(a);
      const pachet = await deschideDinCerere(privata, c.publica, sigilat);
      // One that does not open (not sealed to this ask) is dropped: nobody can read it.
      if (pachet) luate += await pastreaza(pachet);
      await sursa.gata(a.item);
      if (sursa === local) await relayul.gata(a.item).catch(() => undefined);
    }
  }
  return luate;
}
