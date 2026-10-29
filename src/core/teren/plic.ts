// What travels between the phone and the paired program through the relay (docs/decisions.md 2026-10-13, the
// end-to-end encrypted relay), each in an envelope sealed with the pairing's key (electron/telefon-cripto.ts
// `sigileaza`) and opened only at the other end. Everything about the job is inside the seal: the server sees opaque
// blobs. Pure and dependency-free: the phone page (src/teren/) and the program use this same file.
//
// From the phone: each paper as a PDF ("act"), the points file exported from the instrument's controller ("puncte",
// its text as it is: the program reads it as one dropped at Măsurătoare), the job's details from its second step ("detalii", may come again: the
// latest wins), and at the end of a job a "done" note ("gata"). A paper for a dossier already in the program carries
// that dossier's key (from the QR code the dossier shows): it goes straight into it. From the program: receipts
// ("chitanta") that say what arrived and, once made or chosen, the dossier; and for each dossier a phone works on, the
// papers it still lacks ("dosar", sent again when that changes). A paper photographed for one of them carries its place
// ("loc"): the program puts it there, as if dropped on that place. With the dossiers' copy on, the phone sends once the
// public key of its lock ("lacat", core/teren/lacat.ts) and the program sends the copy key sealed to it ("copie").
//
// Envelope: u32 little-endian header length ‖ UTF-8 JSON header ‖ the PDF's bytes ("act") or the points file's ("puncte").

/** What the phone says a paper is (the tile it was photographed under): a hint, the program's reading decides. */
export const FELURI_ACT = ["buletin", "buletin-verso", "onrc", "cf", "fiscal", "proprietate", "autorizatie", "alt"] as const;
export type FelAct = (typeof FELURI_ACT)[number];

/** A points file's name: plain text, CSV, an instrument's own (Leica GSI, Carlson RW5). */
export const EXT_PUNCTE = /\.(txt|csv|pts|xyz|dat|gsi|rw5)$/i;
/** A points file's most bytes (a day's measurement is a few hundred KB). */
export const MAX_PUNCTE = 5 * 1024 * 1024;

/** A place of a dossier (core/locuri.ts LOCURI id: "cf", "fiscal", "semnate"…), as the envelopes and a dossier's code carry it. */
export const LOC = /^[a-z][a-z-]{1,29}$/;
/** The most places a dossier's missing list names. */
export const MAX_LIPSA = 20;

/** Whether the land is fenced, as the surveyor says on the phone. */
export type Imprejmuit = "da" | "nu" | "nu-stiu";

/** The sides of the land, as the memoriu names them. */
export const LATURI = ["nord", "est", "sud", "vest"] as const;
export type Latura = (typeof LATURI)[number];
/**
 * What fences a side, picked on the phone: what a surveyor's hand sketches carry ("pe latura est gard de lemn, pe
 * latura vest gard de beton, pe latura sud gard de sârmă, gard viu"; answers of 2026-10-13).
 */
export const GARDURI = ["lemn", "beton", "plasa", "sarma", "metal", "gard-viu", "fara"] as const;
export type Gard = (typeof GARDURI)[number];
export const NUME_GARD: Record<Gard, string> = {
  lemn: "gard de lemn", beton: "gard de beton", plasa: "gard de plasă", sarma: "gard de sârmă", metal: "gard metalic", "gard-viu": "gard viu", fara: "fără gard",
};
export type Garduri = Partial<Record<Latura, Gard>>;

/** A building's height regime, as surveyors write it: S/D (basement), P (ground), nE (floors), M (attic). */
export const REGIMURI = ["P", "P+M", "P+E", "P+E+M", "P+2E", "P+2E+M", "P+3E", "P+4E", "S+P", "S+P+M", "S+P+E", "S+P+E+M", "S+P+2E", "D+P", "D+P+M", "D+P+E", "D+P+E+M"] as const;
export type Regim = (typeof REGIMURI)[number];
/** What a building is, as seen in the field ("dacă e bloc sau nu e bloc, sau casă de vacanță, sau e anexă"). */
export const FELURI_CONSTRUCTIE = ["casa", "anexa", "garaj", "bloc", "casa-de-vacanta", "hala", "spatiu-comercial", "alta"] as const;
export type FelConstructie = (typeof FELURI_CONSTRUCTIE)[number];
export const NUME_CONSTRUCTIE: Record<FelConstructie, string> = {
  casa: "casă", anexa: "anexă", garaj: "garaj", bloc: "bloc de locuințe", "casa-de-vacanta": "casă de vacanță", hala: "hală", "spatiu-comercial": "spațiu comercial", alta: "altă construcție",
};
/** A building as noted in the field, in the order seen (matched to the drawn C1, C2… by that order). */
export interface ConstructieTeren { fel?: FelConstructie; regim?: Regim }
export const MAX_CONSTRUCTII_TEREN = 20;

/** The number of levels a height regime names (S+P+2E+M → 5), as Generare CP's LEVELSNO counts them; undefined for a text that is not one. */
export function niveluriDinRegim(regim: string | undefined): number | undefined {
  if (!regim) return undefined;
  let n = 0;
  for (const t of regim.toUpperCase().split("+").map((s) => s.trim())) {
    if (t === "S" || t === "D" || t === "P" || t === "M" || t === "E") n += 1;
    else if (/^\d+E$/.test(t)) n += Number(t.slice(0, -1));
    else return undefined;
  }
  return n || undefined;
}

/** «Nord – gard de lemn, Est – gard de beton», in the sides' order; undefined when none is picked. */
export function textGarduri(g: Garduri | undefined): string | undefined {
  if (!g) return undefined;
  const parti = LATURI.filter((l) => g[l] && NUME_GARD[g[l]!]).map((l) => `${l.charAt(0).toUpperCase()}${l.slice(1)} – ${NUME_GARD[g[l]!]}`);
  return parti.length ? parti.join(", ") : undefined;
}

/** The fences read: fenced when any side has one (not "fără gard"); undefined when nothing is picked. */
export function imprejmuitDinGarduri(g: Garduri | undefined): boolean | undefined {
  const alese = g ? LATURI.map((l) => g[l]).filter((x): x is Gard => !!x) : [];
  if (!alese.length) return undefined;
  return alese.some((x) => x !== "fara");
}

export type AntetPlic =
  /**
   * One paper of a job: its index from 0, its page count, when it was photographed, the tile it came from, and the
   * dossier it goes into when the job adds papers to one already in the program (its key, as the QR code gave it).
   */
  | { v: 1; tip: "act"; lucrare: string; act: number; pagini: number; facut: string; fel?: FelAct; dosar?: string; loc?: string }
  /**
   * The points file exported from the instrument's controller, as one item of the job (its index among the papers),
   * with its name, for the dossier the job adds to when it does.
   */
  | { v: 1; tip: "puncte"; lucrare: string; act: number; facut: string; nume: string; dosar?: string }
  /** The job is complete: how many papers it has (a points file counts as one). */
  | { v: 1; tip: "gata"; lucrare: string; acte: number }
  /** The surveyor deleted the job on the phone before finishing it: the program drops what it has of it. */
  | { v: 1; tip: "renuntare"; lucrare: string }
  /** The job's details from the phone's second step; the latest `facut` wins. */
  | {
    v: 1; tip: "detalii"; lucrare: string; facut: string;
    /** One of the program's job types (core/records.ts TIPURI_LUCRARE); the program checks it. */
    tipLucrare?: string; imprejmuit?: Imprejmuit; localitate?: string; telefon?: string;
    /** The fence of each side and the buildings seen, picked on the phone. */
    garduri?: Garduri; constructii?: ConstructieTeren[];
  }
  /** From the program: what arrived of the job, and its dossier once made. */
  | {
    v: 1; tip: "chitanta"; lucrare: string; la: string;
    /** The papers' indices the program holds. */
    primite: number[]; detalii: boolean; gata: boolean;
    /** The papers its "gata" counted, once that came (programs from 1.0.55): with `gata` false, some never came. */
    total?: number;
    dosar?: { nr: string; client?: string };
  }
  /**
   * From the program: a dossier a phone works on (its key) and the places of the papers it still lacks, in the
   * program's order; empty when nothing is missing; absent when the surveyor turned the list off (the phone then drops
   * the one it has). The newest `la` wins. No client's name: every phone paired with the program gets it, and the
   * phone has the dossier's label from its code.
   */
  | { v: 1; tip: "dosar"; dosar: string; la: string; lipsa?: string[] }
  /**
   * From the phone, once per pairing: the public key of the lock the surveyor put on the dossiers' copy (base64url of
   * the raw P-256 key, core/teren/lacat.ts). The program keeps the first one it gets.
   */
  | { v: 1; tip: "lacat"; la: string; cheie: string }
  /**
   * From the program: the dossiers' encrypted copy (core/teren/copie.ts). `pornita`: it is on; then `cheie`, the copy
   * key sealed to this phone's lock (base64url, lacat.ts `sigileazaPentruLacat`), with `amprenta`, the key's
   * fingerprint; no `cheie` while the program has no lock of this phone. Neither: the copy is off. The newest `la` wins.
   */
  | { v: 1; tip: "copie"; la: string; pornita?: true; cheie?: string; amprenta?: string };

/** 16 random bytes in base64url, unpadded: a job's id, as the phone makes it. */
const ID = /^[A-Za-z0-9_-]{22}$/;
/** A dossier's key in the program (D-2026-007, or a request's 12345/2026): letters, digits, dashes, dots and slashes. */
export const CHEIE_DOSAR = /^[A-Za-z0-9][A-Za-z0-9./_-]{0,39}$/;
/**
 * A dossier's code names the phones paired with its program by a fingerprint of each pairing id, never the id itself:
 * the id lets anyone send to the relay and read its sealed receipts, and the code is shown on the office screen.
 * The fingerprint: the first AMPRENTA characters of base64url(SHA-256(PREFIX_AMPRENTA + id)).
 */
export const PREFIX_AMPRENTA = "topograpp-dosar:";
export const AMPRENTA = 11;

/** The fingerprint of pairing id `p`, with Web Crypto (the phone; electron/teren.ts `amprenta` is the same, in Node). */
export async function amprentaPereche(p: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(PREFIX_AMPRENTA + p));
  return b64url(new Uint8Array(h)).slice(0, AMPRENTA);
}

/** The most papers in one job, and pages in one paper: more is not a job from the field. */
export const MAX_ACTE = 100;
export const MAX_PAGINI = 50;
const MAX_ANTET = 4096;

const FARA_PDF = new Set(["gata", "detalii", "chitanta", "renuntare", "dosar", "copie", "lacat"]);

export function impacheteaza(antet: AntetPlic, pdf: Uint8Array = new Uint8Array(0)): Uint8Array {
  const a = new TextEncoder().encode(JSON.stringify(verificaAntet(antet)));
  if (FARA_PDF.has(antet.tip) && pdf.length) throw new Error(`plic: «${antet.tip}» nu are PDF`);
  if (antet.tip === "puncte" && !estePuncte(pdf)) throw new Error("plic: fișierul de puncte nu e text");
  if (a.length > MAX_ANTET) throw new Error("plic: antet prea lung");
  const out = new Uint8Array(4 + a.length + pdf.length);
  new DataView(out.buffer).setUint32(0, a.length, true);
  out.set(a, 4);
  out.set(pdf, 4 + a.length);
  return out;
}

/** The header and the PDF of an opened envelope; throws on anything that is not one. */
export function despacheteaza(plic: Uint8Array): { antet: AntetPlic; pdf: Uint8Array } {
  if (plic.length < 4) throw new Error("plic: prea scurt");
  const n = new DataView(plic.buffer, plic.byteOffset, plic.byteLength).getUint32(0, true);
  if (n < 2 || n > MAX_ANTET || 4 + n > plic.length) throw new Error("plic: antet greșit");
  let antet: unknown;
  try { antet = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plic.subarray(4, 4 + n))); } catch { throw new Error("plic: antet greșit"); }
  const a = verificaAntet(antet);
  const pdf = plic.subarray(4 + n);
  if (a.tip === "act" && !esteSemnaturaPdf(pdf)) throw new Error("plic: actul nu e PDF");
  if (a.tip === "puncte" && !estePuncte(pdf)) throw new Error("plic: fișierul de puncte nu e text");
  if (FARA_PDF.has(a.tip) && pdf.length) throw new Error(`plic: «${a.tip}» nu are PDF`);
  return { antet: a, pdf };
}

/** A points file's bytes: some text, not too much, no NUL byte, not a PDF. */
const estePuncte = (b: Uint8Array) => b.length > 0 && b.length <= MAX_PUNCTE && !b.includes(0) && !esteSemnaturaPdf(b);
const esteSemnaturaPdf = (b: Uint8Array) => b.length > 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d;
const intreg = (x: unknown, min: number, max: number): x is number => Number.isInteger(x) && (x as number) >= min && (x as number) <= max;
const moment = (x: unknown): x is string => typeof x === "string" && x.length <= 40 && !Number.isNaN(Date.parse(x));
/** A short free text: a string of at most `max` characters, no control characters; empty counts as absent. */
const text = (x: unknown, max: number): string | undefined => {
  if (x === undefined) return undefined;
  if (typeof x !== "string" || x.length > max || [...x].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f)) throw new Error("plic: antet greșit");
  return x.trim() || undefined;
};
const cu = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
const unulDin = <T extends string>(x: unknown, lista: readonly T[]): x is T => typeof x === "string" && (lista as readonly string[]).includes(x);

/** The fences by side, only the sides picked; undefined when none; anything else is not an envelope. */
function garduri(x: unknown): Garduri | undefined {
  if (x === undefined) return undefined;
  if (typeof x !== "object" || x === null || Array.isArray(x)) throw new Error("plic: antet greșit");
  const out: Garduri = {};
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (!unulDin(k, LATURI) || !unulDin(v, GARDURI)) throw new Error("plic: antet greșit");
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** The buildings noted, in order, each with what was picked; an empty list is none. */
function constructiiTeren(x: unknown): ConstructieTeren[] | undefined {
  if (x === undefined) return undefined;
  if (!Array.isArray(x) || x.length > MAX_CONSTRUCTII_TEREN) throw new Error("plic: antet greșit");
  const out = x.map((c: unknown) => {
    if (typeof c !== "object" || c === null) throw new Error("plic: antet greșit");
    const { fel, regim } = c as Record<string, unknown>;
    if ((fel !== undefined && !unulDin(fel, FELURI_CONSTRUCTIE)) || (regim !== undefined && !unulDin(regim, REGIMURI))) throw new Error("plic: antet greșit");
    return cu({ fel: fel as FelConstructie | undefined, regim: regim as Regim | undefined });
  });
  return out.length ? out : undefined;
}

/** A missing list: places, each once, at most MAX_LIPSA; anything else is not an envelope. */
function lipsa(x: unknown): string[] {
  if (!Array.isArray(x) || x.length > MAX_LIPSA || !x.every((l) => typeof l === "string" && LOC.test(l))) throw new Error("plic: antet greșit");
  return [...new Set(x as string[])];
}

function verificaAntet(x: unknown): AntetPlic {
  const a = x as Record<string, unknown>;
  if (typeof a !== "object" || a === null || a.v !== 1) throw new Error("plic: antet greșit");
  if (a.tip === "dosar" && typeof a.dosar === "string" && CHEIE_DOSAR.test(a.dosar) && moment(a.la)) {
    return { v: 1, tip: "dosar", dosar: a.dosar, la: a.la, ...(a.lipsa !== undefined ? { lipsa: lipsa(a.lipsa) } : {}) };
  }
  if (a.tip === "copie" && moment(a.la) && (a.pornita === undefined || a.pornita === true)
    && (a.cheie === undefined ? a.amprenta === undefined
      : a.pornita === true && typeof a.cheie === "string" && /^[A-Za-z0-9_-]{167}$/.test(a.cheie) && typeof a.amprenta === "string" && /^[A-Za-z0-9_-]{22}$/.test(a.amprenta))) {
    return cu({ v: 1, tip: "copie", la: a.la, pornita: a.pornita as true | undefined, cheie: a.cheie as string | undefined, amprenta: a.amprenta as string | undefined });
  }
  // A raw uncompressed P-256 public key: 65 bytes, the first 0x04 ("B" in base64url).
  if (a.tip === "lacat" && moment(a.la) && typeof a.cheie === "string" && /^B[A-Za-z0-9_-]{86}$/.test(a.cheie)) {
    return { v: 1, tip: "lacat", la: a.la, cheie: a.cheie };
  }
  if (typeof a.lucrare !== "string" || !ID.test(a.lucrare)) throw new Error("plic: antet greșit");
  if (a.tip === "act" && intreg(a.act, 0, MAX_ACTE - 1) && intreg(a.pagini, 1, MAX_PAGINI) && moment(a.facut)
    && (a.fel === undefined || (FELURI_ACT as readonly unknown[]).includes(a.fel))
    && (a.dosar === undefined || (typeof a.dosar === "string" && CHEIE_DOSAR.test(a.dosar)))
    && (a.loc === undefined || (typeof a.loc === "string" && LOC.test(a.loc) && a.dosar !== undefined))) {
    return cu({
      v: 1, tip: "act", lucrare: a.lucrare, act: a.act, pagini: a.pagini, facut: a.facut, fel: a.fel as FelAct | undefined,
      dosar: a.dosar as string | undefined, loc: a.loc as string | undefined,
    });
  }
  if (a.tip === "puncte" && intreg(a.act, 0, MAX_ACTE - 1) && moment(a.facut) && typeof a.nume === "string" && EXT_PUNCTE.test(a.nume)
    && (a.dosar === undefined || (typeof a.dosar === "string" && CHEIE_DOSAR.test(a.dosar)))) {
    const nume = text(a.nume, 100);
    if (!nume || /[\\/]/.test(nume)) throw new Error("plic: antet greșit");
    return cu({ v: 1, tip: "puncte", lucrare: a.lucrare, act: a.act, facut: a.facut, nume, dosar: a.dosar as string | undefined });
  }
  if (a.tip === "gata" && intreg(a.acte, 1, MAX_ACTE)) return { v: 1, tip: "gata", lucrare: a.lucrare, acte: a.acte };
  if (a.tip === "renuntare") return { v: 1, tip: "renuntare", lucrare: a.lucrare };
  if (a.tip === "detalii" && moment(a.facut) && (a.imprejmuit === undefined || ["da", "nu", "nu-stiu"].includes(a.imprejmuit as string))) {
    return cu({
      v: 1, tip: "detalii", lucrare: a.lucrare, facut: a.facut,
      tipLucrare: text(a.tipLucrare, 80), imprejmuit: a.imprejmuit as Imprejmuit | undefined,
      localitate: text(a.localitate, 100), telefon: text(a.telefon, 30),
      garduri: garduri(a.garduri), constructii: constructiiTeren(a.constructii),
    });
  }
  if (a.tip === "chitanta" && moment(a.la) && typeof a.detalii === "boolean" && typeof a.gata === "boolean"
    && Array.isArray(a.primite) && a.primite.length <= MAX_ACTE && a.primite.every((i) => intreg(i, 0, MAX_ACTE - 1))) {
    const d = a.dosar as Record<string, unknown> | undefined;
    if (d !== undefined && (typeof d !== "object" || d === null || !text(d.nr, 40))) throw new Error("plic: antet greșit");
    if (a.total !== undefined && !intreg(a.total, 1, MAX_ACTE)) throw new Error("plic: antet greșit");
    return cu({
      v: 1, tip: "chitanta", lucrare: a.lucrare, la: a.la, primite: [...new Set(a.primite as number[])].sort((x, y) => x - y),
      detalii: a.detalii, gata: a.gata, total: a.total as number | undefined, dosar: d ? cu({ nr: text(d.nr, 40)!, client: text(d.client, 120) }) : undefined,
    });
  }
  throw new Error("plic: antet greșit");
}

/** Bytes as base64url without padding (ids in the pairing address and the API), and back. */
export function b64url(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function dinB64url(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("base64url greșit");
  const t = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(t, (c) => c.charCodeAt(0));
}

/** The relay's chunk: sealed bytes are cut into pieces of this size (the last shorter) for the JSON API. */
export const BUCATA = 512 * 1024;
/** The most chunks of one sealed item (24 MiB). */
export const MAX_BUCATI = 48;
/** A sealed receipt's most bytes, and the most receipts waiting for one phone (the relay keeps them 7 days). */
export const MAX_CHITANTA = 8 * 1024;
export const MAX_CHITANTE = 50;
