// What a safe copy or a receipt proves (docs/aplicatia-acte.md, "Proof"; decisions.md 2026-10-19 "A safe copy proves
// its purpose; every send leaves a receipt"): a short statement (what kind of paper, for whom, what for, when) signed
// with this phone's key, the same P-256 key People uses (./oameni.ts), with ECDSA over SHA-256. The statement, the
// key and the signature make one link, <domain>/v/#<statement>.<key>.<signature>, printed as a QR code on the sheet;
// the check page (./pagina-dovada.ts, colshare-web/v/) and the app verify it on the device. Nothing reaches a server.
//
// A file carries a second signature in its PDF's information dictionary (/ColshareProof): over the link and the
// SHA-256 of every picture in the file, so a digital copy shows whether a single byte of its pictures changed. The check
// also writes the file again from its own pictures and words, as the app wrote it, and wants every byte the same: a
// page drawn over the marking, an added image or an incremental update shows as changed though the pictures did not
// (security audit 2026-10-20). A copy printed and scanned again keeps only the QR code: it proves the words, never the
// pixels.
//
// One key for People's ECDH and for these signatures: ECIES-style encryption and ECDSA on one P-256 key are proven
// jointly secure (Degabriele, Lehmann, Paterson, Smart, Strefler, CT-RSA 2012), and every use is labelled apart
// ("colshare-dovada-v1", "colshare-fisier-v1", People's own labels).
import { pdfDinPagini, type PaginaJpeg } from "../core/scanner/pdf.ts";
import { perecheLacat } from "../core/teren/lacat.ts";
import { b64url, curat as faraSemne, dinB64url } from "./link.ts";

const enc = (s: string) => new TextEncoder().encode(s);
const ETICHETA = "colshare-dovada-v1\n";
const ETICHETA_FISIER = "colshare-fisier-v1\n";
/** The QR code's capacity (src/core/qr.ts: version 15, level M, byte mode). */
export const MAX_QR = 412;
/** The PDF's information entry that carries a file's proof. */
export const CHEIE_PDF = "ColshareProof";

/** The key a phone signs with: People's identity key when there is one, else one made for signing alone. */
export interface CheieSemnare {
  privata: string;
  publica: string;
}

/** What a phone's index keeps for signing (./seif.ts): People's identity, or the key made before it. */
export interface StareSemnare {
  eu?: CheieSemnare;
  semnez?: CheieSemnare;
}

/**
 * This phone's signing key: People's identity key, or the signing key; made (and left in `i` for the caller to save)
 * when the phone has neither. People reuses it when it starts (./oameni.ts facEu), so a phone has one key.
 */
export async function cheiaMea(i: StareSemnare): Promise<CheieSemnare> {
  const k = i.eu ?? i.semnez;
  if (k) return { privata: k.privata, publica: k.publica };
  const p = await perecheLacat();
  i.semnez = { privata: b64url(p.privata), publica: b64url(p.publica) };
  return { ...i.semnez };
}

/** The kind of paper a safe copy was made of. */
export type FelHartie = "id" | "pasaport" | "act";
/** How papers were given. */
export type Cum = "link" | "om" | "cerere" | "copie";

/** What a QR code says. */
export type Declaratie =
  | { fel: "copie"; id: string; data: string; act: FelHartie; pentru: string; scop: string }
  | { fel: "chitanta"; id: string; data: string; cum: Cum; catre: string; pentru: string; acte: number; h: string }
  /** A firm's receipt for papers it received in one of its asks (Colshare Business), signed with the firm's key. */
  | { fel: "primire"; id: string; data: string; de: string; catre: string; pentru: string; acte: number; h: string }
  /** A firm's receipt for papers it sent, by link or straight to another firm (Colshare Business), with the firm's key. */
  | { fel: "trimitere"; id: string; data: string; de: string; catre: string; pentru: string; cum: "link" | "firma"; acte: number; h: string };

const FELURI: FelHartie[] = ["id", "pasaport", "act"];
const CUM: Cum[] = ["link", "om", "cerere", "copie"];
const curat = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

/** The statement as the bytes signed: one field per line, a version first. */
export function textDeclaratie(d: Declaratie): string {
  return (d.fel === "copie"
    ? ["C1", d.id, d.data, d.act, curat(d.pentru), curat(d.scop)]
    : d.fel === "primire"
      ? ["P1", d.id, d.data, curat(d.de), curat(d.catre), curat(d.pentru), String(d.acte), d.h]
      : d.fel === "trimitere"
        ? ["T1", d.id, d.data, curat(d.de), curat(d.catre), curat(d.pentru), d.cum, String(d.acte), d.h]
        : ["R1", d.id, d.data, d.cum, curat(d.catre), curat(d.pentru), String(d.acte), d.h]).join("\n");
}

// Receipts bind their files with 128 bits of the digest; the 64 bits of the first receipts (before 2026-10-25) are no
// longer read: with them the signer could make two sets of files to one receipt (attack test 2026-10-29, L13).
export function citesteDeclaratia(s: string): Declaratie | undefined {
  // The words shown on /v/ without control or direction characters (attack test 2026-10-29, L3); the signature is
  // checked on the text as signed, apart from this.
  const p = s.split("\n").map((x, i) => (i === 0 ? x : faraSemne(x)));
  const data = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}Z)?$/;
  if (p[0] === "C1" && p.length === 6 && data.test(p[2]) && FELURI.includes(p[3] as FelHartie)) {
    return { fel: "copie", id: p[1], data: p[2], act: p[3] as FelHartie, pentru: p[4], scop: p[5] };
  }
  if (p[0] === "R1" && p.length === 8 && data.test(p[2]) && CUM.includes(p[3] as Cum) && /^\d{1,3}$/.test(p[6]) && /^[0-9a-f]{32}$/.test(p[7])) {
    return { fel: "chitanta", id: p[1], data: p[2], cum: p[3] as Cum, catre: p[4], pentru: p[5], acte: Number(p[6]), h: p[7] };
  }
  if (p[0] === "T1" && p.length === 9 && data.test(p[2]) && (p[6] === "link" || p[6] === "firma") && /^\d{1,3}$/.test(p[7]) && /^[0-9a-f]{32}$/.test(p[8])) {
    return { fel: "trimitere", id: p[1], data: p[2], de: p[3], catre: p[4], pentru: p[5], cum: p[6], acte: Number(p[7]), h: p[8] };
  }
  if (p[0] === "P1" && p.length === 8 && data.test(p[2]) && /^\d{1,3}$/.test(p[6]) && /^[0-9a-f]{32}$/.test(p[7])) {
    return { fel: "primire", id: p[1], data: p[2], de: p[3], catre: p[4], pentru: p[5], acte: Number(p[6]), h: p[7] };
  }
  return undefined;
}

// ------------------------------------------------------------------ P-256 keys

const P = 2n ** 256n - 2n ** 224n + 2n ** 192n + 2n ** 96n - 1n;
const B = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn;
const bigDin = (b: Uint8Array) => b.reduce((s, x) => (s << 8n) | BigInt(x), 0n);
const octetiDin = (n: bigint) => Uint8Array.from({ length: 32 }, (_, i) => Number((n >> BigInt(8 * (31 - i))) & 0xffn));
function putere(b: bigint, e: bigint): bigint {
  let r = 1n;
  b %= P;
  for (; e > 0n; e >>= 1n, b = (b * b) % P) if (e & 1n) r = (r * b) % P;
  return r;
}

/** A public key's 33-byte form (SEC 1 compressed), which keeps the QR code small. */
export const comprimata = (pub: Uint8Array) => Uint8Array.of(2 + (pub[64] & 1), ...pub.subarray(1, 33));

/** The 65-byte key back from its compressed form; undefined when it is not a point of the curve. */
export function decomprimata(c: Uint8Array): Uint8Array | undefined {
  if (c.length !== 33 || (c[0] !== 2 && c[0] !== 3)) return undefined;
  const x = bigDin(c.subarray(1));
  if (x >= P) return undefined;
  const dr = (((x * x * x - 3n * x + B) % P) + P) % P;
  let y = putere(dr, (P + 1n) / 4n);
  if ((y * y) % P !== dr) return undefined;
  if (Number(y & 1n) !== (c[0] & 1)) y = P - y;
  return Uint8Array.of(4, ...octetiDin(x), ...octetiDin(y));
}

const EC = { name: "ECDSA", namedCurve: "P-256" } as const;
const SHA = { name: "ECDSA", hash: "SHA-256" } as const;
const lipeste = (...p: Uint8Array[]) => {
  const o = new Uint8Array(p.reduce((s, x) => s + x.length, 0));
  let i = 0;
  for (const x of p) { o.set(x, i); i += x.length; }
  return o;
};
const sha256 = async (b: Uint8Array) => new Uint8Array(await crypto.subtle.digest("SHA-256", b as BufferSource));
export const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
export const sha256Hex = async (b: Uint8Array) => hex(await sha256(b));

async function semnatura(k: CheieSemnare, date: Uint8Array): Promise<Uint8Array> {
  const privata = await crypto.subtle.importKey("pkcs8", dinB64url(k.privata) as BufferSource, EC, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign(SHA, privata, date as BufferSource));
}

async function tine(publica: Uint8Array, sig: Uint8Array, date: Uint8Array): Promise<boolean> {
  try {
    const k = await crypto.subtle.importKey("raw", publica as BufferSource, EC, false, ["verify"]);
    return await crypto.subtle.verify(SHA, k, sig as BufferSource, date as BufferSource);
  } catch {
    return false;
  }
}

/**
 * A key as 24 digits, the same on every copy it signs: to see two copies come from the same phone. 80 bits: a key made
 * to match a phone's code would take far more than anyone can try (12 digits could be matched in hours; security audit
 * 2026-10-20).
 */
export async function codCheie(publica: Uint8Array): Promise<string> {
  const h = await sha256(lipeste(enc("colshare-cheie-v1"), publica));
  const n = h.slice(0, 10).reduce((s, x) => s * 256n + BigInt(x), 0n) % 10n ** 24n;
  return String(n).padStart(24, "0").replace(/(\d{4})(?=\d)/g, "$1 ");
}

// ------------------------------------------------------------------ the QR code's link

export const adresaDovezii = (domeniu: string, dovada: string) => `${domeniu}/v/#${dovada}`;

/**
 * The statement signed: "<statement>.<key>.<signature>". The words are shortened, the longer first, until the link
 * fits a QR code; `d` is changed to what was signed.
 */
export async function semnez(k: CheieSemnare, d: Declaratie, domeniu: string): Promise<string> {
  const cheie = b64url(comprimata(dinB64url(k.publica)));
  // 86 characters of signature, 2 dots.
  const loc = MAX_QR - enc(adresaDovezii(domeniu, "")).length - cheie.length - 88;
  const lung = () => Math.ceil(enc(textDeclaratie(d)).length / 3) * 4;
  const r = d as unknown as Record<string, string>;
  const campuri = d.fel === "copie" ? ["pentru", "scop"] : d.fel === "primire" || d.fel === "trimitere" ? ["de", "pentru", "catre"] : ["catre", "pentru"];
  while (lung() > loc && campuri.some((x) => r[x])) {
    const f = campuri.reduce((a, b) => ([...r[b]].length > [...r[a]].length ? b : a));
    const v = [...r[f]];
    r[f] = v.length <= 2 ? "" : `${v.slice(0, -2).join("").trimEnd()}…`;
  }
  const text = enc(textDeclaratie(d));
  const sig = await semnatura(k, lipeste(enc(ETICHETA), text));
  return `${b64url(text)}.${cheie}.${b64url(sig)}`;
}

/** A proof read and checked: what it says, the key, and whether the signature holds. */
export interface DovadaCitita {
  d: Declaratie;
  publica: Uint8Array;
  tine: boolean;
  dovada: string;
}

/** A /v/ link (or the part after #) read and checked; undefined when it is not one. */
export async function verific(adresa: string): Promise<DovadaCitita | undefined> {
  const m = /(?:^|#)([A-Za-z0-9_-]+\.[A-Za-z0-9_-]{44}\.[A-Za-z0-9_-]{86})\s*$/.exec(adresa.trim());
  if (!m) return undefined;
  const [t, c, s] = m[1].split(".");
  try {
    const text = dinB64url(t), publica = decomprimata(dinB64url(c)), sig = dinB64url(s);
    const d = citesteDeclaratia(new TextDecoder("utf-8", { fatal: true }).decode(text));
    if (!d || !publica || sig.length !== 64) return undefined;
    return { d, publica, tine: await tine(publica, sig, lipeste(enc(ETICHETA), text)), dovada: m[1] };
  } catch {
    return undefined;
  }
}

// ------------------------------------------------------------------ a file's proof

/** The digest a file's second signature covers: the link and each picture's SHA-256, in order. */
async function rezumatFisier(dovada: string, imagini: Uint8Array[]): Promise<Uint8Array> {
  const h = await Promise.all(imagini.map(sha256));
  return lipeste(enc(`${ETICHETA_FISIER}${dovada}\n`), await sha256(lipeste(...h)));
}

/**
 * The PDF's /ColshareProof value: the link's proof, "~", the signature over it and the pictures. A firm's receipt adds
 * "~" and the firm's certificate (./firma.ts), so /v/ can name the firm as Colshare checked it: the certificate is
 * signed by colshare.app and names the key the receipt is signed with (attack test 2026-10-29, K1).
 */
export async function legFisier(k: CheieSemnare, dovada: string, imagini: Uint8Array[], certificat?: string): Promise<string> {
  return `${dovada}~${b64url(await semnatura(k, await rezumatFisier(dovada, imagini)))}${certificat ? `~${certificat}` : ""}`;
}

/** The pictures (DCTDecode streams) of a PDF written by core/scanner/pdf.ts, in order. */
function imaginiPdf(pdf: Uint8Array, text: string): Uint8Array[] {
  const out: Uint8Array[] = [];
  const re = /\/Filter \/DCTDecode \/Length (\d+) >>\nstream\n/g;
  for (let m; (m = re.exec(text));) {
    const start = m.index + m[0].length, n = Number(m[1]);
    out.push(pdf.subarray(start, start + n));
    re.lastIndex = start + n;
  }
  return out;
}

/** A PDF text string as pdfDinPagini writes it, read back: "(ASCII)" or "<FEFF" UTF-16BE hex ">". */
function textDinPdf(s: string): string | undefined {
  if (s.startsWith("(")) return s.slice(1, -1);
  const m = /^<FEFF((?:[0-9A-F]{4})*)>$/.exec(s);
  if (!m) return undefined;
  const u = m[1].match(/.{4}/g)?.map((x) => parseInt(x, 16)) ?? [];
  return String.fromCharCode(...u);
}

/**
 * Whether the PDF is exactly what pdfDinPagini writes from its own pages and information entries: nothing added,
 * nothing drawn over, nothing appended after its end.
 */
function caScris(pdf: Uint8Array, text: string): boolean {
  const TOKEN = String.raw`(\([\x20-\x7e]*?\)|<FEFF[0-9A-F]*>)`;
  const info = new RegExp(`\n3 0 obj\n<< /Title ${TOKEN} /Producer ${TOKEN} /Creator ${TOKEN}((?: /[A-Za-z]+ ${TOKEN})*) >>\nendobj\n`).exec(text);
  if (!info) return false;
  const [titlu, Producer, Creator] = [info[1], info[2], info[3]].map(textDinPdf);
  if (titlu === undefined || Producer === undefined || Creator === undefined) return false;
  const alte: Record<string, string> = {};
  for (const m of info[4].matchAll(new RegExp(` /([A-Za-z]+) ${TOKEN}`, "g"))) {
    const v = textDinPdf(m[2]);
    if (v === undefined) return false;
    alte[m[1]] = v;
  }
  const pagini: PaginaJpeg[] = [];
  const re = /\/Width (\d+) \/Height (\d+) \/ColorSpace \/DeviceRGB \/BitsPerComponent 8 \/Filter \/DCTDecode \/Length (\d+) >>\nstream\n/g;
  for (let m; (m = re.exec(text));) {
    const start = m.index + m[0].length, n = Number(m[3]);
    pagini.push({ w: Number(m[1]), h: Number(m[2]), jpeg: pdf.subarray(start, start + n) });
    re.lastIndex = start + n;
  }
  if (!pagini.length) return false;
  const refacut = pdfDinPagini(pagini, titlu, { Producer, Creator, ...alte });
  return refacut.length === pdf.length && refacut.every((b, i) => b === pdf[i]);
}

/**
 * A file checked: "fara" when it carries no proof (not made by Colshare, or saved again by another program);
 * "schimbat" when its pictures are not the ones signed; "bun" when every picture is exactly what was signed.
 */
export async function verificFisier(pdf: Uint8Array): Promise<{ stare: "fara" } | { stare: "schimbat" | "bun"; dovada: DovadaCitita; certificat?: string }> {
  const text = new TextDecoder("latin1").decode(pdf);
  const m = new RegExp(`/${CHEIE_PDF} \\(([A-Za-z0-9_.-]+)~([A-Za-z0-9_-]{86})(?:~([A-Za-z0-9_.-]{20,1300}))?\\)`).exec(text);
  const dovada = m && await verific(m[1]);
  if (!m || !dovada) return { stare: "fara" };
  const imagini = imaginiPdf(pdf, text);
  const bun = dovada.tine && imagini.length > 0 && caScris(pdf, text) && await tine(dovada.publica, dinB64url(m[2]), await rezumatFisier(m[1], imagini));
  // The certificate is checked by the caller (./firma.ts verificCertificat, against the receipt's key and day).
  return { stare: bun ? "bun" : "schimbat", dovada, ...(m[3] ? { certificat: m[3] } : {}) };
}
