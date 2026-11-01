// What a send link or an ask carries, before it is encrypted: papers as files, with a title. One package per send.
// The format: "ACT1", the header's length (4 bytes, big-endian), the header as JSON, then the files one after the other.
// The send's encryption (AES-256-GCM under a key only in the link) and the ask's (sealed to the asker's public key,
// core/teren/lacat.ts) are in ./link.ts.
import { curat, curatNota } from "./link.ts";

const MAGIC = new TextEncoder().encode("ACT1");
/** The most files in one package, and the longest name. */
export const MAX_FISIERE = 60;
const MAX_NUME = 120;
const TIPURI = /^(application\/pdf|image\/jpeg|image\/png|image\/webp)$/;

export interface FisierPachet {
  nume: string;
  tip: string;
  date: Uint8Array;
}

export interface Pachet {
  /** What the sender wrote ("For the rental at …"), or the ask it answers. */
  titlu?: string;
  /** Who sends, as they wrote it (asks only). */
  de?: string;
  /**
   * A firm's send straight to another firm (./firma.ts trimitFirmei): the sender's certificate and its signature over
   * the rest, which the receiving desk checks before it names the sender.
   */
  firma?: { c: string; s: string };
  /**
   * Papers from a colleague at the same firm, or from the person's own other device (./firma.ts trimitPersoanei): who
   * sends (their person id), the client and title they are filed under on the sender's desk, the sender's row, and the
   * sender's signature with their person key over all of it.
   */
  coleg?: { p: string; client: string; titlu: string; rand: string; s: string };
  /** The client's note to the firm with an answer to a firm's ask (decisions.md 2026-10-28, "Notes on an ask"). */
  nota?: string;
  /**
   * The sender's People card (./oameni.ts adresaCarte) on a send link, when they ticked it (decisions.md 2026-10-30,
   * "A link can carry the sender's card"): sealed with the link's key like the rest, so the relay can't swap it.
   */
  carte?: string;
  /**
   * Papers in this package that are copies the sender's desk made (decisions.md 2026-11-01, "A copy stays with its
   * original"), sent to the person's own other device: which file (its place), the paper it was made from by the name
   * both devices give it (its `ref`), and for a marked copy what its marking says. Signed with the files when present.
   */
  copii?: CopieInPachet[];
  fisiere: FisierPachet[];
}

/** One copy in a package: file `i`, made from the paper both devices call `din`; `copie` only for a marked copy. */
export interface CopieInPachet { i: number; din: string; copie?: { pentru: string; scop: string; data: string } }

interface Antet {
  v: 1;
  titlu?: string;
  de?: string;
  o?: string;
  f?: { c: string; s: string };
  c?: { p: string; client: string; titlu: string; rand: string; s: string };
  k?: string;
  y?: CopieInPachet[];
  fisiere: { nume: string; tip: string; octeti: number }[];
}

/** The copies a header may name: each a file of the package, once, with bounded words; anything else is dropped. */
function copiiCurate(x: unknown, nrFisiere: number): CopieInPachet[] {
  if (!Array.isArray(x)) return [];
  const vazute = new Set<number>(), out: CopieInPachet[] = [];
  for (const y of x.slice(0, MAX_FISIERE) as Partial<CopieInPachet>[]) {
    if (!y || !Number.isInteger(y.i) || y.i! < 0 || y.i! >= nrFisiere || vazute.has(y.i!) || typeof y.din !== "string" || !/^[A-Za-z0-9_/#-]{1,120}$/.test(y.din)) continue;
    const c = y.copie;
    const copie = c && typeof c.pentru === "string" && typeof c.scop === "string" && typeof c.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.data)
      ? { pentru: curat(c.pentru).slice(0, 200), scop: curat(c.scop).slice(0, 200), data: c.data } : undefined;
    if (c && !copie) continue;
    vazute.add(y.i!);
    out.push({ i: y.i!, din: y.din, ...(copie ? { copie } : {}) });
  }
  return out;
}

/**
 * A file name safe to offer for saving: no folders, no control or direction characters (a name can't read backwards to
 * pass for another, attack test 2026-10-29, L3), an extension that matches its type.
 */
export function numeSigur(nume: string, tip: string): string {
  // eslint-disable-next-line no-control-regex
  let n = curat(nume).replace(/[\u0000-\u001f\u007f/\\:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_NUME) || "act";
  const ext = tip === "application/pdf" ? ".pdf" : tip === "image/png" ? ".png" : tip === "image/webp" ? ".webp" : ".jpg";
  if (!n.toLowerCase().endsWith(ext)) n += ext;
  return n;
}

/** The longest card a package carries (a card link is about 230 characters). */
const MAX_CARTE = 700;

export function impacheteaza(p: Pachet): Uint8Array {
  if (!p.fisiere.length || p.fisiere.length > MAX_FISIERE) throw new Error("pachet: număr de fișiere greșit");
  const antet: Antet = {
    v: 1, ...(p.titlu ? { titlu: p.titlu.slice(0, 300) } : {}), ...(p.de ? { de: p.de.slice(0, 120) } : {}), ...(p.nota && curatNota(p.nota) ? { o: curatNota(p.nota) } : {}), ...(p.firma ? { f: { c: p.firma.c, s: p.firma.s } } : {}),
    ...(p.coleg ? { c: { p: p.coleg.p, client: p.coleg.client.slice(0, 120), titlu: p.coleg.titlu.slice(0, 200), rand: p.coleg.rand, s: p.coleg.s } } : {}),
    ...(p.carte && p.carte.length <= MAX_CARTE ? { k: p.carte } : {}),
    ...(copiiCurate(p.copii, p.fisiere.length).length ? { y: copiiCurate(p.copii, p.fisiere.length) } : {}),
    fisiere: p.fisiere.map((f) => {
      if (!TIPURI.test(f.tip)) throw new Error("pachet: tip de fișier greșit");
      return { nume: numeSigur(f.nume, f.tip), tip: f.tip, octeti: f.date.length };
    }),
  };
  const a = new TextEncoder().encode(JSON.stringify(antet));
  const total = 8 + a.length + p.fisiere.reduce((s, f) => s + f.date.length, 0);
  const out = new Uint8Array(total);
  out.set(MAGIC);
  new DataView(out.buffer).setUint32(4, a.length);
  out.set(a, 8);
  let i = 8 + a.length;
  for (const f of p.fisiere) { out.set(f.date, i); i += f.date.length; }
  return out;
}

/** The package back; throws on anything that is not one (a wrong key never gets here: decryption fails first). */
export function despacheteaza(b: Uint8Array): Pachet {
  if (b.length < 8 || MAGIC.some((x, i) => b[i] !== x)) throw new Error("pachet: nu e un pachet");
  const n = new DataView(b.buffer, b.byteOffset).getUint32(4);
  if (8 + n > b.length) throw new Error("pachet: antet tăiat");
  const antet = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))) as Antet;
  if (antet.v !== 1 || !Array.isArray(antet.fisiere) || antet.fisiere.length > MAX_FISIERE) throw new Error("pachet: antet greșit");
  let i = 8 + n;
  const fisiere = antet.fisiere.map((f) => {
    if (!Number.isInteger(f.octeti) || f.octeti < 0 || i + f.octeti > b.length || !TIPURI.test(f.tip)) throw new Error("pachet: fișier greșit");
    const date = b.slice(i, i + f.octeti);
    i += f.octeti;
    return { nume: numeSigur(String(f.nume), f.tip), tip: f.tip, date };
  });
  const fm = antet.f && typeof antet.f.c === "string" && typeof antet.f.s === "string" && antet.f.c.length < 2000 && antet.f.s.length < 200 ? { firma: { c: antet.f.c, s: antet.f.s } } : {};
  const c = antet.c;
  const cm = c && [c.p, c.client, c.titlu, c.rand, c.s].every((x) => typeof x === "string") && c.client.length <= 120 && c.titlu.length <= 200 && c.p.length < 64 && c.rand.length < 64 && c.s.length < 200
    ? { coleg: { p: c.p, client: curat(c.client), titlu: curat(c.titlu), rand: c.rand, s: c.s } } : {};
  const nota = typeof antet.o === "string" ? curatNota(antet.o) : "";
  // The card is read as a card by whoever offers it (./oameni.ts citesteCarte); here only its size is bounded.
  const km = typeof antet.k === "string" && antet.k.length <= MAX_CARTE ? { carte: antet.k } : {};
  const copii = copiiCurate(antet.y, fisiere.length);
  // The title and the sender's name without control or direction characters, as the link's front (./link.ts curat).
  return { ...(typeof antet.titlu === "string" ? { titlu: curat(antet.titlu) } : {}), ...(typeof antet.de === "string" ? { de: curat(antet.de) } : {}), ...(nota ? { nota } : {}), ...fm, ...cm, ...km, ...(copii.length ? { copii } : {}), fisiere };
}
