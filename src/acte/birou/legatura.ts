// A person's devices find each other by a QR code read from a screen (decisions.md 2026-10-25, "Colshare Business
// gets its own app"). The phone joins the desk by scanning the computer's "Add my phone" code. The computer joins from
// the phone through a one-time slot (colshare-web/api/_firme/legatura.js): it shows a code with the slot's id and a key
// made for this alone, the phone seals an invitation to that key, and the computer opens it. Either way the usual
// invitation follows: the new device's own seat key, the same safety code on both screens, the approval.
//
// What a scanned code may be is checked strictly here: only this domain's /birou/ links, in their exact forms.
import { deschideCuLacat, estePublica, sigileazaPentruLacat } from "../../core/teren/lacat.ts";
import { EroareFirma, type ApelFirma } from "../firma.ts";
import { b64url, dinB64url } from "../link.ts";

const enc = (s: string) => new TextEncoder().encode(s);
const INFO = enc("colshare-legatura-v1");
const EC = { name: "ECDH", namedCurve: "P-256" } as const;
const ID = "[A-Za-z0-9_-]{22}";
/** A P-256 public key (65 bytes) in base64url. */
const PUB = "[A-Za-z0-9_-]{87}";

/** What a desk's code says, once checked. */
export type CodBirou =
  | { fel: "invitatie"; inv: string; aceeasi?: true }
  | { fel: "legatura"; id: string; publica: Uint8Array };

/**
 * A code scanned (or pasted) on a phone: an invitation (<domain>/birou/#inv= or #eu=) or a computer's slot
 * (<domain>/birou/#leg=<id>.<key>). Anything else, another site's link included, is undefined.
 */
export function citescCodul(text: string, domeniu: string): CodBirou | undefined {
  const s = text.trim();
  const baza = `${domeniu}/birou/#`;
  if (!s.startsWith(baza)) return undefined;
  const rest = s.slice(baza.length);
  let m = new RegExp(`^(inv|eu)=(${ID})$`).exec(rest);
  if (m) return { fel: "invitatie", inv: m[2], ...(m[1] === "eu" ? { aceeasi: true as const } : {}) };
  m = new RegExp(`^leg=(${ID})\\.(${PUB})$`).exec(rest);
  if (!m) return undefined;
  const publica = dinB64url(m[2]);
  return estePublica(publica) ? { fel: "legatura", id: m[1], publica } : undefined;
}

/** A colshare.app/birou/ link that opened the app: a desk code, or a colleague's link to take a returned device's papers. */
export type LinkBirou = CodBirou | { fel: "preiau"; token: string };

/**
 * A link tapped on a phone with the app (Android App Links on /birou/, decisions.md 2026-10-28 "The Business app opens
 * colshare.app/birou/ links"), checked as strictly as a scanned code. The desk then does what a browser does with it,
 * except that a computer's slot (`legatura`) is never paired from a tap: the scan is what proves which computer it is.
 * Anything else (a checkout's return, the desk's plain address) is undefined, and the app just opens.
 */
export function citescLinkul(adresa: string, domeniu: string): LinkBirou | undefined {
  const cod = citescCodul(adresa, domeniu);
  if (cod) return cod;
  const s = adresa.trim();
  const baza = `${domeniu}/birou/#preiau=`;
  const token = s.slice(baza.length);
  return s.startsWith(baza) && new RegExp(`^${ID}$`).test(token) ? { fel: "preiau", token } : undefined;
}

/**
 * A computer's open slot: the code it shows, and the key and the secret only it holds (in memory, never stored, never
 * in the QR): without the secret nobody else can take what the phone leaves (attack test 2026-10-29, L5).
 */
export interface Legatura { id: string; adresa: string; privata: CryptoKey; publica: Uint8Array; s: string }

/** The new computer opens a slot and makes its one-time key; `adresa` goes in the QR. */
export async function deschidLegatura(apel: ApelFirma, domeniu: string): Promise<Legatura> {
  // Not extractable: the private half can't be read out of this page, only used to open what the phone seals.
  const k = await crypto.subtle.generateKey(EC, false, ["deriveBits"]) as CryptoKeyPair;
  const publica = new Uint8Array(await crypto.subtle.exportKey("raw", k.publicKey));
  const { id, s } = await apel<{ id: string; s: string }>("legatura-deschid", {});
  if (!new RegExp(`^${ID}$`).test(id) || typeof s !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(s)) throw new EroareFirma(502);
  return { id, adresa: `${domeniu}/birou/#leg=${id}.${b64url(publica)}`, privata: k.privateKey, publica, s };
}

/** The phone leaves `inv` (an invitation for this person's own other device) in the computer's slot, sealed to its key. */
export async function punLegatura(apel: ApelFirma, loc: Parameters<ApelFirma>[2], cod: Extract<CodBirou, { fel: "legatura" }>, inv: string): Promise<void> {
  // The slot's id goes inside the seal too: a sealed invitation can't be moved to another slot.
  const d = b64url(await sigileazaPentruLacat(cod.publica, enc(JSON.stringify({ id: cod.id, inv })), INFO));
  await apel("legatura-pun", { id: cod.id, inv, d }, loc);
}

/** The computer looks at its slot: the invitation once the phone left it, else undefined. */
export async function iauLegatura(apel: ApelFirma, l: Legatura): Promise<string | undefined> {
  const { d } = await apel<{ d?: string }>("legatura-iau", { id: l.id, s: l.s });
  if (d === undefined) return undefined;
  const b = typeof d === "string" ? await deschideCuLacat(l.privata, l.publica, dinB64url(d), INFO) : undefined;
  let x: { id?: unknown; inv?: unknown } | undefined;
  try { x = b ? JSON.parse(new TextDecoder().decode(b)) : undefined; } catch { x = undefined; }
  if (!x || x.id !== l.id || typeof x.inv !== "string" || !new RegExp(`^${ID}$`).test(x.inv)) throw new EroareFirma(502);
  return x.inv;
}
