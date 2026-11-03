// The firm's receipt of arrival, back to the client (decisions.md 2026-11-03, "The client gets the firm's receipt of
// arrival"). When a firm's device takes a client's papers from a request with a short link, it makes its receipt
// (./birou/recipisa.ts) and leaves a copy on the request: the PDF and a few words about it, encrypted with the link's
// own key (the 16 bytes after the "." in the link), so only who holds the link (the client, the firm) can open it and
// the relay never can. The client's page (./pagina-cerere.ts) and the app (./app.ts) list the receipts of the request
// and open the one whose papers are theirs: its digest (`h`) is the receipt's own over the files sent, which they
// compute from the files they still hold. Several devices of the firm take the same papers; the receipt's slot (`r`)
// comes from the link's key and that digest, so the first device's copy stands and the relay can't tell what it is of.
import { b64url, coboara, dinB64url, EroareRelay, rezumatPachet, urca, type Relay } from "./link.ts";
// The papers' digest a firm's receipt carries (./birou/stare.ts declaratiePrimire `h`) is ./deschidere.ts rezumatActe.
export { rezumatActe } from "./deschidere.ts";

/** A receipt as the request lists it: its slot, its chunks, its sealed words, when it was put. */
export interface RecipisaPusa { r: string; n: number; m: string; la: string }
/** What the sealed words say: the papers' digest, the receipt's file name, its number, and the digest of its sealed body. */
export interface DespreRecipisa { h: string; nume: string; nr: string; d: string }
/** A receipt listed and opened: its slot, its chunks and what it says of itself. */
export type RecipisaGasita = DespreRecipisa & { r: string; n: number; la: string };

/** A receipt's chunks at most, as the relay keeps them (colshare-web/api/_acte/core.js MAX_BUCATI_RECIPISA). */
export const MAX_BUCATI_RECIPISA = 8;

const enc = (s: string) => new TextEncoder().encode(s);
const aad = (fel: "m" | "d", id: string, r: string) => enc(`colshare-recipisa-${fel}-v1\n${id}\n${r}`);
const cheie = (kl: Uint8Array, uz: KeyUsage) => crypto.subtle.importKey("raw", kl as BufferSource, "AES-GCM", false, [uz]);

async function cifrez(kl: Uint8Array, aadul: Uint8Array, date: Uint8Array): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aadul as BufferSource }, await cheie(kl, "encrypt"), date as BufferSource));
  const o = new Uint8Array(12 + ct.length);
  o.set(iv);
  o.set(ct, 12);
  return o;
}
async function descifrez(kl: Uint8Array, aadul: Uint8Array, b: Uint8Array): Promise<Uint8Array | undefined> {
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b.subarray(0, 12) as BufferSource, additionalData: aadul as BufferSource }, await cheie(kl, "decrypt"), b.subarray(12) as BufferSource));
  } catch {
    return undefined;
  }
}

/** A receipt's slot on the request: from the link's key and the papers' digest, so the relay learns neither. */
export async function locRecipisa(kl: Uint8Array, h: string): Promise<string> {
  const x = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array([...enc("colshare-recipisa-loc-v1\n"), ...kl, ...enc(h)]) as BufferSource));
  return b64url(x.subarray(0, 16));
}

/**
 * The firm's device leaves its receipt on the request (op "cerere-recipisa" on the firm's server, `trimite`): its body
 * sealed in chunks, its words sealed beside it. Resolves once the request holds it, or another device's copy.
 */
export async function punRecipisa(trimite: Relay, id: string, kl: Uint8Array, o: { h: string; nume: string; nr: string; pdf: Uint8Array }): Promise<void> {
  const r = await locRecipisa(kl, o.h);
  const corp = await cifrez(kl, aad("d", id, r), o.pdf);
  const despre: DespreRecipisa = { h: o.h, nume: o.nume.slice(0, 120), nr: o.nr.slice(0, 40), d: await rezumatPachet(corp) };
  const m = b64url(await cifrez(kl, aad("m", id, r), enc(JSON.stringify(despre))));
  await urca(trimite, "cerere-recipisa", { id, r, m }, corp);
}

/** The receipts left on a request, as far as this link's key opens them; none when the request has none or is gone. */
export async function recipiseleCererii(relay: Relay, id: string, kl: Uint8Array): Promise<RecipisaGasita[]> {
  let lista: RecipisaPusa[];
  try {
    lista = (await relay<{ r?: RecipisaPusa[] }>("cerere-recipise", { id })).r ?? [];
  } catch (e) {
    if (e instanceof EroareRelay && e.status === 404) return [];
    throw e;
  }
  const out: RecipisaGasita[] = [];
  for (const x of lista.slice(0, 40)) {
    if (typeof x?.r !== "string" || typeof x.m !== "string" || !Number.isInteger(x.n) || x.n < 1 || x.n > MAX_BUCATI_RECIPISA) continue;
    const b = await descifrez(kl, aad("m", id, x.r), dinB64url(x.m));
    if (!b) continue;
    try {
      const j = JSON.parse(new TextDecoder().decode(b)) as Partial<DespreRecipisa>;
      if (typeof j.h !== "string" || typeof j.d !== "string" || typeof j.nume !== "string") continue;
      out.push({ r: x.r, n: x.n, la: typeof x.la === "string" ? x.la : "", h: j.h, nume: j.nume.slice(0, 120), nr: typeof j.nr === "string" ? j.nr.slice(0, 40) : "", d: j.d });
    } catch {
      continue;
    }
  }
  return out;
}

/** One receipt's PDF: fetched, its digest checked against its words, opened with the link's key. */
export async function iauRecipisa(relay: Relay, id: string, kl: Uint8Array, x: RecipisaGasita, progres?: (f: number) => void): Promise<Uint8Array> {
  const corp = await coboara(relay, "cerere-recipisa-ia", { id, r: x.r }, x.n, progres);
  if ((await rezumatPachet(corp)) !== x.d) throw new EroareRelay(422, "cheie");
  const pdf = await descifrez(kl, aad("d", id, x.r), corp);
  if (!pdf) throw new EroareRelay(422, "cheie");
  return pdf;
}
