// The encryption of send links and of sealed items (asks, a firm's papers), checked on their own. The relay here is a
// stand-in kept in memory: it records every call, so the tests can say what a server would have seen. Burning a link
// after its one opening is the real relay's job (it is not in this repository); the stand-in only plays it back.
import { describe, expect, it } from "vitest";
import { deschideCuLacat, importaPrivata, perecheLacat, sigileazaPentruLacat } from "../src/core/teren/lacat.ts";
import { b64url, citesteAdresa, cripteazaLink, decripteazaLink, deschidLink, deschideDinCerere, EroareRelay, facLink, sigileazaPentruCerere, type Relay } from "../src/acte/link.ts";

const text = (s: string) => new TextEncoder().encode(s);
const PACHET = text("SPECIMEN · IBAN RO49AAAA1B31007593840000 · a paper that must not reach the server in the clear");

/** A relay kept in memory: chunks by id, one opening, every call's body kept. */
function relayInMemorie() {
  const linkuri = new Map<string, { bucati: string[]; n: number; deschis: boolean }>();
  const apeluri: { op: string; corp: Record<string, unknown> }[] = [];
  const r = (async (op: string, corp: Record<string, unknown>) => {
    apeluri.push({ op, corp });
    const id = String(corp.id);
    if (op === "link-bucata") {
      const l = linkuri.get(id) ?? { bucati: [], n: Number(corp.n), deschis: false };
      l.bucati[Number(corp.i)] = String(corp.d);
      linkuri.set(id, l);
      return { primit: l.bucati.filter(Boolean).length };
    }
    const l = linkuri.get(id);
    if (!l) throw new EroareRelay(404);
    if (l.deschis) throw new EroareRelay(410);
    if (op === "link-info") return { n: l.n };
    if (op === "link-ia") return { d: l.bucati[Number(corp.i)] };
    if (op === "link-deschis") { l.deschis = true; return {}; }
    throw new EroareRelay(400);
  }) as Relay;
  return { r, apeluri };
}

describe("a send link", () => {
  it("opens with its key and with nothing else", async () => {
    const cheie = crypto.getRandomValues(new Uint8Array(32));
    const sigilat = await cripteazaLink(cheie, PACHET);
    expect(await decripteazaLink(cheie, sigilat)).toEqual(PACHET);
    expect(await decripteazaLink(crypto.getRandomValues(new Uint8Array(32)), sigilat)).toBeUndefined();
  });

  it("refuses a single changed byte (AES-GCM authenticates the whole item)", async () => {
    const cheie = crypto.getRandomValues(new Uint8Array(32));
    const sigilat = await cripteazaLink(cheie, PACHET);
    for (const i of [0, 12, sigilat.length - 1]) {
      const alterat = sigilat.slice();
      alterat[i] ^= 1;
      expect(await decripteazaLink(cheie, alterat)).toBeUndefined();
    }
  });

  it("takes a fresh nonce each time: the same paper never gives the same bytes", async () => {
    const cheie = crypto.getRandomValues(new Uint8Array(32));
    const a = await cripteazaLink(cheie, PACHET), b = await cripteazaLink(cheie, PACHET);
    expect(a.subarray(0, 12)).not.toEqual(b.subarray(0, 12));
    expect(a).not.toEqual(b);
  });

  it("keeps the key after the # and never sends it, nor the paper, to the relay", async () => {
    const { r, apeluri } = relayInMemorie();
    const facut = await facLink(r, "https://colshare.app", PACHET);
    const [inainte, fragment] = facut.adresa.split("#");
    const a = citesteAdresa(facut.adresa);
    expect(a?.fel).toBe("link");
    if (a?.fel !== "link") return;
    const cheie = b64url(a.cheie);
    // The key is in the fragment only: the part a browser sends to a server has none of it.
    expect(fragment).toContain(cheie);
    expect(inainte).not.toContain(cheie);
    // Everything the relay received: no key, and no readable trace of the paper.
    const vazut = JSON.stringify(apeluri);
    expect(vazut).not.toContain(cheie);
    expect(vazut).not.toContain("RO49AAAA1B31007593840000");
    expect(vazut).not.toContain("SPECIMEN");
    const sus = apeluri.filter((x) => x.op === "link-bucata").map((x) => Uint8Array.from(atob(String(x.corp.d)), (c) => c.charCodeAt(0)));
    const brut = new TextDecoder("latin1").decode(sus[0]);
    expect(brut).not.toContain("RO49AAAA1B31007593840000");
  });

  it("opens once: after the opening, the relay answers that it was opened", async () => {
    const { r } = relayInMemorie();
    const facut = await facLink(r, "https://colshare.app", PACHET);
    const a = citesteAdresa(facut.adresa);
    if (a?.fel !== "link") throw new Error("not a send link");
    expect(await deschidLink(r, a.id, a.cheie)).toEqual(PACHET);
    await expect(deschidLink(r, a.id, a.cheie)).rejects.toMatchObject({ status: 410 });
  });
});

describe("sealing to a public key (asks, a firm's papers)", () => {
  it("opens only with the matching private key", async () => {
    const eu = await perecheLacat(), altul = await perecheLacat();
    const sigilat = await sigileazaPentruLacat(eu.publica, PACHET);
    expect(await deschideCuLacat(await importaPrivata(eu.privata), eu.publica, sigilat)).toEqual(PACHET);
    expect(await deschideCuLacat(await importaPrivata(altul.privata), altul.publica, sigilat)).toBeUndefined();
  });

  it("refuses a changed byte, and a sealed item of one use never opens as another (context label)", async () => {
    const eu = await perecheLacat();
    const privata = await importaPrivata(eu.privata);
    const sigilat = await sigileazaPentruCerere(eu.publica, PACHET);
    expect(await deschideDinCerere(privata, eu.publica, sigilat)).toEqual(PACHET);
    expect(await deschideCuLacat(privata, eu.publica, sigilat)).toBeUndefined();
    const alterat = sigilat.slice();
    alterat[alterat.length - 1] ^= 1;
    expect(await deschideDinCerere(privata, eu.publica, alterat)).toBeUndefined();
  });

  it("uses a fresh ephemeral key per item", async () => {
    const eu = await perecheLacat();
    const a = await sigileazaPentruLacat(eu.publica, PACHET), b = await sigileazaPentruLacat(eu.publica, PACHET);
    expect(a.subarray(0, 65)).not.toEqual(b.subarray(0, 65));
  });
});
