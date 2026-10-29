// Blacking out what a paper's reader does not need (decisions.md 2026-10-19 "Black out any paper"): on a payslip, a bank
// statement, a tax notice, the program proposes boxes over account and card numbers, national ID numbers, transaction
// rows and lines with amounts, found in the page's text (a PDF's text layer, or OCR of a scan or photo); the person
// keeps or drops each one and draws more. The result is a new paper, every page a picture with solid black boxes drawn
// into its pixels: no text layer, nothing under the box. The original is never changed.
//
// What may be wrong is only what is proposed, never what is hidden: a chosen box covers the whole token (or the whole
// row) it was proposed for, with a margin, so that a line chosen to hide never survives even when OCR's boxes are
// tight or a row is read in pieces (benchmark: tests/acte-innegrire-bench.test.ts).
import type { Zona } from "./copie-sigura.ts";

export interface Cutie {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A line of text on a page, in pixels of the page's picture; its characters' boxes when the reader gives them. */
export interface LinieText {
  text: string;
  bbox: Cutie;
  chars?: { text: string; bbox: Cutie }[];
}

/**
 * What a box is for. "eu-nume" and "eu-date": the owner's own name and address, and their birth date, document number,
 * phone and e-mail, found by their values (from the ID's reading and About me, `valoriProprii`), not guessed; "cuvant":
 * a word or number the person chose to hide everywhere (typed, or under a box they drew).
 */
export type FelPropunere = "eu-nume" | "eu-date" | "cont" | "id" | "tranzactie" | "suma" | "numar" | "cuvant";

/** A box the program proposes. `ales`: hidden unless the person drops it. */
export interface Propunere {
  id: string;
  fel: FelPropunere;
  text: string;
  pagina: number;
  zona: Zona;
  ales: boolean;
  /** An account or card number's box that leaves its last four digits visible, as banks print them. */
  ultime4?: Zona;
}

/** The groups as the screen lists them, in this order; those on by default. */
export const FELURI: FelPropunere[] = ["eu-nume", "eu-date", "cont", "id", "tranzactie", "suma", "numar", "cuvant"];
export const IMPLICIT: Record<FelPropunere, boolean> = { "eu-nume": false, "eu-date": true, cont: true, id: true, tranzactie: false, suma: false, numar: false, cuvant: true };

// ------------------------------------------------------------------ check digits

const cifre = (s: string) => [...s].map(Number);

/** ISO 13616: the IBAN's mod-97 check. */
export function ibanBun(s: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let m = 0;
  for (const c of r) m = (m * 10 + Number(c)) % 97;
  return m === 1;
}

/** Luhn, for card numbers. */
export function luhn(s: string): boolean {
  let sum = 0;
  cifre(s).reverse().forEach((d, i) => { const x = i % 2 ? d * 2 : d; sum += x > 9 ? x - 9 : x; });
  return sum % 10 === 0;
}

/** Romania's CNP: 13 digits, weights 279146358279. */
export function cnpBun(s: string): boolean {
  if (!/^[1-9]\d{12}$/.test(s)) return false;
  const r = cifre(s.slice(0, 12)).reduce((t, d, i) => t + d * Number("279146358279"[i]), 0) % 11;
  return (r === 10 ? 1 : r) === Number(s[12]);
}

/** France's NIR (numéro de sécurité sociale): 13 digits and a key, 97 − (number mod 97). */
export function nirBun(s: string): boolean {
  if (!/^[12]\d{14}$/.test(s)) return false;
  return 97 - Number(BigInt(s.slice(0, 13)) % 97n) === Number(s.slice(13));
}

/** Germany's Steuer-ID: 11 digits, ISO 7064 MOD 11,10. */
export function steuerIdBun(s: string): boolean {
  if (!/^[1-9]\d{10}$/.test(s)) return false;
  let p = 10;
  for (const d of cifre(s.slice(0, 10))) {
    let x = (d + p) % 10;
    if (x === 0) x = 10;
    p = (x * 2) % 11;
  }
  return (11 - p) % 10 === Number(s[10]);
}

/** The Netherlands' BSN: the 11-test. */
export function bsnBun(s: string): boolean {
  if (!/^\d{9}$/.test(s)) return false;
  const d = cifre(s);
  return /[1-9]/.test(s) && (d.slice(0, 8).reduce((t, x, i) => t + x * (9 - i), 0) - d[8]) % 11 === 0;
}

/** Belgium's national number: 11 digits, 97 − (first 9 mod 97), with 2 before them for those born from 2000. */
export function nrNationalBeBun(s: string): boolean {
  if (!/^\d{11}$/.test(s)) return false;
  const n = Number(s.slice(0, 9)), c = Number(s.slice(9));
  return 97 - (n % 97) === c || 97 - (Number(`2${s.slice(0, 9)}`) % 97) === c;
}

/** Spain's DNI and NIE: 8 digits (NIE: X/Y/Z and 7) and the letter of mod 23. */
export function dniBun(s: string): boolean {
  const m = /^([XYZ]?)(\d{7,8})([A-Z])$/.exec(s);
  if (!m || m[1].length + m[2].length !== 8) return false;
  const n = Number(`${"XYZ".indexOf(m[1]) >= 0 ? "XYZ".indexOf(m[1]) : ""}${m[2]}`);
  return "TRWAGMYFPDXBNJZSQVHLCKE"[n % 23] === m[3];
}

// ------------------------------------------------------------------ reading a row

/** A row of the page: the lines at the same height, left to right (OCR often reads a row in pieces). */
interface Rand {
  linii: LinieText[];
  bbox: Cutie;
  text: string;
  /** Every character with its box, spaces left out; `s`: a space (or a gap) came before it. */
  chars: { c: string; b: Cutie; s?: boolean; l: number }[];
}

const uneste = (c: Cutie[]): Cutie => ({ x0: Math.min(...c.map((b) => b.x0)), y0: Math.min(...c.map((b) => b.y0)), x1: Math.max(...c.map((b) => b.x1)), y1: Math.max(...c.map((b) => b.y1)) });

/**
 * A line's characters with boxes: the reader's, or spread evenly over its box (a PDF's text items). A character after
 * a space, or after a gap wider than a quarter of its height, is marked.
 */
function caractere(l: LinieText): { c: string; b: Cutie; s?: boolean }[] {
  let out: { c: string; b: Cutie; s?: boolean }[];
  if (l.chars?.length) out = l.chars.flatMap((x) => [...x.text].map((c) => ({ c, b: x.bbox })));
  else {
    const n = [...l.text].length || 1, w = (l.bbox.x1 - l.bbox.x0) / n;
    out = [...l.text].map((c, i) => ({ c, b: { x0: l.bbox.x0 + i * w, y0: l.bbox.y0, x1: l.bbox.x0 + (i + 1) * w, y1: l.bbox.y1 } }));
  }
  const r: { c: string; b: Cutie; s?: boolean }[] = [];
  let spatiu = true;
  for (const x of out) {
    if (!x.c.trim()) { spatiu = true; continue; }
    const ant = r[r.length - 1];
    const gol = ant && x.b.x0 - ant.b.x1 > (x.b.y1 - x.b.y0) * 0.25;
    r.push({ ...x, s: spatiu || gol || undefined });
    spatiu = false;
  }
  return r;
}

function randuri(linii: LinieText[]): Rand[] {
  const sortate = linii.filter((l) => l.text.trim() && l.bbox.y1 > l.bbox.y0).sort((a, b) => (a.bbox.y0 + a.bbox.y1) - (b.bbox.y0 + b.bbox.y1));
  const inalt = sortate.map((l) => l.bbox.y1 - l.bbox.y0).sort((a, b) => a - b)[Math.floor(sortate.length / 2)] ?? 0;
  const out: Rand[] = [];
  for (const l of sortate) {
    const c = (l.bbox.y0 + l.bbox.y1) / 2;
    // A "line" OCR made of several rows (a tall box) stays a row of its own: joined to one, it would stretch it.
    const r = l.bbox.y1 - l.bbox.y0 > inalt * 2 ? undefined : out.find((x) => x.bbox.y1 - x.bbox.y0 <= inalt * 2 && c >= x.bbox.y0 && c <= x.bbox.y1);
    if (r) { r.linii.push(l); r.bbox = uneste([r.bbox, l.bbox]); } else out.push({ linii: [l], bbox: { ...l.bbox }, text: "", chars: [] });
  }
  for (const r of out) {
    r.linii.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    r.text = r.linii.map((l) => l.text.trim()).join("   ");
    r.chars = r.linii.flatMap((l, i) => caractere(l).map((x) => ({ ...x, l: i })));
  }
  return out;
}

/** OCR's usual confusions in a number, folded to digits; only inside a run that is mostly digits. */
const CIFRA: Record<string, string> = { O: "0", o: "0", D: "0", Q: "0", I: "1", l: "1", "|": "1", S: "5", B: "8", Z: "2" };

const DATA = /\b(\d{1,2}[./-]\d{1,2}[./-](\d{2}|\d{4})|\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}\.?)(?!\d)/;
/**
 * An amount: with two decimals ("1.234,56", "84.20"), or without them next to a currency ("2.300 lei", "1 478 EUR",
 * "€ 850"), or German style ("1.234,-"). Never followed by a dot: "01.10." is a date.
 */
const SUMA = new RegExp([
  String.raw`(?<![\d.,])[-+−]?\d{1,3}(?:[ .'\u00a0\u202f]\d{3})*[.,]\d{2}(?![\d.])`,
  String.raw`(?<![\d.,])[-+−]?\d+[.,]\d{2}(?![\d.]|,\d)`,
  String.raw`(?<![\d.,])[-+−]?\d+(?:[ .'\u00a0\u202f]\d{3})*\s?(?:€|EUR|RON|lei|Lei|LEI|CHF|£|\$|zł|PLN|Kč)(?![A-Za-z])`,
  String.raw`(?<![A-Za-z])(?:€|£|\$|EUR|CHF|RON)\s?[-+−]?\d`,
  String.raw`(?<![\d.,])\d{1,3}(?:\.\d{3})*,[-–]`,
].join("|"));

/**
 * An amount that cannot be a date OCR read without its last dot ("01.10" for "01.10."): it has a sign, a thousands
 * separator or a currency, or its two parts cannot be a day and a month. Only these decide whether a page splits
 * into two tables (coloane); a row with the other kind is still proposed.
 */
function sumaSigura(text: string): boolean {
  for (const m of text.matchAll(new RegExp(SUMA.source, "g"))) {
    const x = m[0].trim();
    if (/^[-+−]|[€$£]|EUR|RON|lei|LEI|Lei|CHF|zł|PLN|Kč|,[-–]$/.test(x) || /\d[ .'\u00a0\u202f]\d{3}/.test(x)) return true;
    const d = /^(\d{1,2})[.,](\d{2})$/.exec(x);
    if (!d || Number(d[1]) > 31 || Number(d[1]) === 0 || Number(d[2]) > 12 || Number(d[2]) === 0) return true;
  }
  return false;
}

interface Gasit {
  fel: FelPropunere;
  text: string;
  de: number;
  la: number;
}

/** The numbers on a row's characters (spaces ignored, so "RO49 AAAA 1B31…" is one), each with its kind. */
function numere(chars: { c: string; s?: boolean }[]): Gasit[] {
  const s = chars.map((x) => x.c).join("");
  const out: Gasit[] = [];
  const ia = (de: number, la: number) => out.some((g) => de < g.la && la > g.de);
  // IBANs: the longest prefix whose check holds; one that looks like an IBAN is kept even when OCR broke the check.
  for (const m of s.matchAll(/[A-Z]{2}\d{2}[A-Z0-9]{11,30}/g)) {
    let lung = 0;
    for (let n = Math.min(34, m[0].length); n >= 15; n--) if (ibanBun(m[0].slice(0, n))) { lung = n; break; }
    // One that fails the check must at least start as an IBAN is printed: country and check digits together.
    if (!lung && [1, 2, 3].some((i) => chars[m.index! + i].s)) continue;
    out.push({ fel: "cont", text: m[0].slice(0, lung || m[0].length), de: m.index!, la: m.index! + (lung || m[0].length) });
  }
  // Codes with letters: Italy's codice fiscale, Spain's DNI/NIE, the UK's NINO, Germany's social insurance number.
  for (const re of [/[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]/g, /[XYZ]?\d{7,8}[A-Z]/g, /[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]/g, /\d{8}[A-Z]\d{3}/g]) {
    for (const m of s.matchAll(re)) {
      if (ia(m.index!, m.index! + m[0].length)) continue;
      if (re.source.startsWith("[XYZ]") && !dniBun(m[0])) continue;
      out.push({ fel: "id", text: m[0], de: m.index!, la: m.index! + m[0].length });
    }
  }
  // Runs of digits (OCR's letter-for-digit slips folded inside them): cards, national numbers, other long numbers.
  for (const m of s.matchAll(/[0-9OoDQIl|SBZ]{8,}/g)) {
    const t = [...m[0]].map((c) => CIFRA[c] ?? c).join("");
    const litere = [...m[0]].filter((c) => !/\d/.test(c)).length;
    if (litere > 2 || ia(m.index!, m.index! + m[0].length)) continue;
    const de = m.index!, la = de + m[0].length;
    const card = t.length >= 13 && t.length <= 19 && luhn(t);
    const id = cnpBun(t) || nirBun(t) || steuerIdBun(t) || bsnBun(t) || nrNationalBeBun(t);
    out.push({ fel: card ? "cont" : id ? "id" : "numar", text: t, de, la });
  }
  return out;
}

/** A box around `b`, larger by `mx` and `my` pixels, as fractions of a w × h page. */
function zona(b: Cutie, w: number, h: number, mx: number, my: number): Zona {
  const x0 = Math.max(0, b.x0 - mx), y0 = Math.max(0, b.y0 - my), x1 = Math.min(w, b.x1 + mx), y1 = Math.min(h, b.y1 + my);
  return { x: x0 / w, y: y0 / h, w: (x1 - x0) / w, h: (y1 - y0) / h };
}

/**
 * The boxes proposed on one page (w × h pixels, the picture its lines were read on). A number's box spans its
 * characters and the whole row's height, with half a row's height either side; a row's box spans the page's text
 * column (from the leftmost to the rightmost text on the page), so the pieces of a row OCR read apart go with it.
 */
export function propune(linii: LinieText[], w: number, h: number, pagina = 0): Propunere[] {
  const out: Propunere[] = [];
  const n = { v: 0 };
  for (const grup of coloane(linii, w)) out.push(...propuneColoana(grup, w, h, pagina, n));
  return out;
}

/**
 * The page's text in columns: one, or two when it holds two tables side by side. That needs a gap no line crosses
 * between the rows with amounts, and on each side at least three amounts with their own text on the same row: a table
 * of its own. A statement's own columns (date, text, debit, credit) never split, since one side would hold only text
 * or only amounts. The lines above and below the tables stay one column.
 */
function coloane(linii: LinieText[], w: number): LinieText[][] {
  const cuSuma = (l: LinieText) => sumaSigura(l.text);
  const cu = linii.filter(cuSuma);
  if (cu.length < 6) return [linii];
  const y0 = Math.min(...cu.map((l) => l.bbox.y0)), y1 = Math.max(...cu.map((l) => l.bbox.y1));
  const tabel = linii.filter((l) => { const c = (l.bbox.y0 + l.bbox.y1) / 2; return c >= y0 && c <= y1; });
  const inalt = tabel.map((l) => l.bbox.y1 - l.bbox.y0).sort((a, b) => a - b)[Math.floor(tabel.length / 2)] ?? 0;
  const acoperit = new Uint8Array(Math.ceil(w) + 1);
  for (const l of tabel) for (let x = Math.max(0, Math.floor(l.bbox.x0)); x < Math.min(w, Math.ceil(l.bbox.x1)); x++) acoperit[x] = 1;
  const goluri: [number, number][] = [];
  const lo = Math.floor(w * 0.2), hi = Math.ceil(w * 0.8);
  for (let x = lo, start = -1; x <= hi; x++) {
    if (x < hi && !acoperit[x]) { if (start < 0) start = x; } else if (start >= 0) { goluri.push([start, x]); start = -1; }
  }
  // An amount with its own text on the same row, on its own side of the gap.
  const deSine = (parte: LinieText[]) => parte.filter(cuSuma).filter((l) => parte.some((x) => !cuSuma(x)
    && Math.min(x.bbox.y1, l.bbox.y1) - Math.max(x.bbox.y0, l.bbox.y0) > (l.bbox.y1 - l.bbox.y0) * 0.5)).length;
  for (const [a, b] of goluri.filter(([a, b]) => b - a >= Math.max(w * 0.03, inalt * 2)).sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]))) {
    const g = (a + b) / 2;
    const st = tabel.filter((l) => (l.bbox.x0 + l.bbox.x1) / 2 < g), dr = tabel.filter((l) => (l.bbox.x0 + l.bbox.x1) / 2 >= g);
    if (deSine(st) >= 3 && deSine(dr) >= 3) return [linii.filter((l) => !tabel.includes(l)), st, dr];
  }
  return [linii];
}

/** The boxes of one column: its numbers, and its rows with amounts as wide as the column. */
function propuneColoana(linii: LinieText[], w: number, h: number, pagina: number, n: { v: number }): Propunere[] {
  const rs = randuri(linii);
  if (!rs.length) return [];
  const coloana = { x0: Math.min(...rs.map((r) => r.bbox.x0)), x1: Math.max(...rs.map((r) => r.bbox.x1)) };
  const inaltimi = rs.map((r) => r.bbox.y1 - r.bbox.y0).sort((a, b) => a - b);
  const linie = inaltimi[Math.floor(inaltimi.length / 2)];
  const out: Propunere[] = [];
  rs.forEach((r) => {
    const rh = r.bbox.y1 - r.bbox.y0;
    for (const g of numere(r.chars)) {
      // The box takes in the whole printed group: characters of a number or a code next to it, closer than a word's
      // gap (a group OCR misread, a check digit it split off); and the end of its line when the number ends it (glyphs
      // OCR saw but did not read).
      let de = g.de, la = g.la;
      const lipit = (a: { b: Cutie }, b: { b: Cutie }) => b.b.x0 - a.b.x1 < rh * 1.2;
      while (la < r.chars.length && /[A-Z0-9]/.test(r.chars[la].c) && lipit(r.chars[la - 1], r.chars[la])) la++;
      while (de > 0 && /[A-Z0-9]/.test(r.chars[de - 1].c) && lipit(r.chars[de - 1], r.chars[de])) de--;
      const b = uneste(r.chars.slice(de, la).map((x) => x.b));
      const ultim = r.chars[la - 1];
      if (la === r.chars.length || r.chars[la].l !== ultim.l) b.x1 = Math.max(b.x1, r.linii[ultim.l].bbox.x1);
      if (de === 0 || r.chars[de - 1].l !== r.chars[de].l) b.x0 = Math.min(b.x0, r.linii[r.chars[de].l].bbox.x0);
      const mx = Math.max(rh, linie) * 0.6, my = Math.max(rh, linie) * 0.35;
      const p: Propunere = { id: `${pagina}-${n.v++}`, fel: g.fel, text: g.text, pagina, zona: zona({ ...b, y0: r.bbox.y0, y1: r.bbox.y1 }, w, h, mx, my), ales: IMPLICIT[g.fel] };
      // Keeping the last four: the box stops halfway into the gap before the fourth digit from the end.
      if (g.fel === "cont") {
        const cifre = r.chars.slice(de, la).map((x, i) => (/\d/.test(CIFRA[x.c] ?? x.c) ? de + i : -1)).filter((i) => i >= 0);
        if (cifre.length >= 8) {
          const taie = cifre[cifre.length - 4];
          const st = { ...b, x1: (r.chars[taie - 1].b.x1 + r.chars[taie].b.x0) / 2, y0: r.bbox.y0, y1: r.bbox.y1 };
          const z = zona({ ...st, x1: st.x1 + mx }, w, h, mx, my);
          p.ultime4 = { ...z, w: Math.max(0, st.x1 / w - z.x) };
        }
      }
      out.push(p);
    }
    const suma = SUMA.test(r.text);
    if (!suma) return;
    const fel: FelPropunere = DATA.test(r.text) ? "tranzactie" : "suma";
    out.push({ id: `${pagina}-${n.v++}`, fel, text: r.text, pagina, zona: zona({ x0: coloana.x0, x1: coloana.x1, y0: r.bbox.y0, y1: r.bbox.y1 }, w, h, linie * 0.5, Math.max(rh, linie) * 0.3), ales: IMPLICIT[fel] });
  });
  return out;
}

/**
 * What is hidden on page `pagina`: the chosen proposals' boxes and the boxes drawn by hand. `ultime4`: account and
 * card numbers keep their last four digits.
 */
export const zoneAscunse = (p: Propunere[], pagina: number, manual: Zona[] = [], ultime4 = false): Zona[] =>
  [...p.filter((x) => x.ales && x.pagina === pagina).map((x) => (ultime4 && x.ultime4 ? x.ultime4 : x.zona)), ...manual];

// ------------------------------------------------------------------ finding a value: the owner's, a word, a leak

/** A value to find on the pages: as digits (dates, numbers, phones) or as words (names, places, e-mails). */
export interface Valoare {
  fel: FelPropunere;
  text: string;
  mod: "cifre" | "cuvinte";
}

const pliaza = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
const ALNUM = /[A-Z0-9]/;

/** Words that name a kind of street, not a street: never searched alone. */
const GENERICE = new Set(["STRADA", "STR", "STREET", "RUE", "AVENUE", "AVE", "STRASSE", "STRAßE", "BULEVARDUL", "BD", "BLVD", "CALEA", "ALEEA",
  "SOSEAUA", "PIATA", "NR", "NO", "ROAD", "LANE", "VIA", "VIALE", "CALLE", "AVENIDA", "ULICA", "UL", "STRAAT", "RUA", "WEG", "PLATZ", "CHEMIN",
  "PLACE", "BLOC", "SCARA", "AP", "ETAJ", "APT", "THE", "DE", "DU", "DES", "LA", "LE", "VON", "DER", "VAN"]);

/** How a value is searched: its digits when it is a number (at least five), else its words. */
function valoare(fel: FelPropunere, text: string): Valoare | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const cifre = t.replace(/\D/g, "");
  const litere = pliaza(t).replace(/[^A-Z]/g, "");
  if (cifre.length >= 5 && litere.length <= 1) return { fel, text: cifre, mod: "cifre" };
  return pliaza(t).split(/[^A-Z0-9]+/).some((x) => x.length >= 2) ? { fel, text: t, mod: "cuvinte" } : undefined;
}

/** A birth date as documents print it: day, month and year in either order, with or without the leading zeros. */
function dateNastere(iso: string): string[] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return [];
  const [, y, mo, d] = m;
  return [...new Set([`${d}${mo}${y}`, `${y}${mo}${d}`, `${Number(d)}${Number(mo)}${y}`, `${d}${Number(mo)}${y}`, `${Number(d)}${mo}${y}`, `${mo}${d}${y}`])];
}

/**
 * The owner's own values to look for on a paper: from the readings of their ID cards and passports (name, given
 * names, document and national numbers, birth date) and from About me (street, postal code, town, phone, e-mail).
 * Each name word and each street word apart, so "SMITH, John" and "John Smith" are both found; words that only name a
 * kind of street ("Strada", "rue") are not searched.
 */
export function valoriProprii(citiri: { nume?: string; prenume?: string; numar?: string; cnp?: string; nastere?: string }[], eu: { strada?: string; cod?: string; oras?: string; telefon?: string; email?: string } = {}): Valoare[] {
  const out: Valoare[] = [];
  const cuvinte = (fel: FelPropunere, s?: string) => {
    for (const w of pliaza(s ?? "").split(/[^A-Z0-9]+/)) if (w.length >= 3 && !GENERICE.has(w) && /[A-Z]/.test(w)) out.push({ fel, text: w, mod: "cuvinte" });
  };
  for (const c of citiri) {
    cuvinte("eu-nume", c.nume);
    cuvinte("eu-nume", c.prenume);
    // The whole name both ways round too: it finds the name read without its spaces ("MARIEEXEMPLE").
    if (c.nume && c.prenume) for (const s of [`${c.prenume} ${c.nume}`, `${c.nume} ${c.prenume}`]) out.push({ fel: "eu-nume", text: s, mod: "cuvinte" });
    for (const x of [c.numar, c.cnp]) { const v = x && valoare("eu-date", x); if (v) out.push(v); }
    for (const d of dateNastere(c.nastere ?? "")) out.push({ fel: "eu-date", text: d, mod: "cifre" });
  }
  cuvinte("eu-nume", eu.strada);
  if (eu.oras) { const v = valoare("eu-nume", eu.oras); if (v) out.push(v); }
  if (eu.cod) { const v = valoare("eu-nume", eu.cod); if (v) out.push(v.mod === "cifre" || eu.cod.trim().length >= 4 ? v : { ...v, mod: "cuvinte" }); }
  // A phone by its last nine digits, so "+40 712…" and "0712…" are the same number.
  const tel = (eu.telefon ?? "").replace(/\D/g, "");
  if (tel.length >= 9) out.push({ fel: "eu-date", text: tel.slice(-9), mod: "cifre" });
  if (eu.email?.includes("@")) out.push({ fel: "eu-date", text: eu.email.trim(), mod: "cuvinte" });
  const vazute = new Set<string>();
  return out.filter((v) => { const k = `${v.fel}:${v.mod}:${pliaza(v.text)}`; if (vazute.has(k)) return false; vazute.add(k); return true; });
}

/** Levenshtein distance, stopping once it passes `max`. */
function distanta(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let ant = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(ant[j] + 1, cur[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (Math.min(...cur) > max) return max + 1;
    ant = cur;
  }
  return ant[b.length];
}

/** Two words the same, allowing OCR one slip from five letters and two from nine. */
const acelasiCuvant = (a: string, b: string) => a === b || (a.length >= 5 && distanta(a, b, a.length >= 9 ? 2 : 1) <= (a.length >= 9 ? 2 : 1));

/** Where a value is on one row: the character ranges [de, la) it covers. */
function gasesteInRand(r: Rand, v: Valoare): [number, number][] {
  const out: [number, number][] = [];
  const ch = r.chars.map((x) => pliaza(x.c));
  const rh = r.bbox.y1 - r.bbox.y0;
  if (v.mod === "cifre") {
    // The row's digits in order (OCR's letter-for-digit slips folded where a digit stands next to them), a letter
    // or a wide gap breaking the run, so a value never joins two numbers or columns.
    let d = "";
    const idx: number[] = [];
    ch.forEach((c, i) => {
      const vecinCifra = /\d/.test(ch[i - 1] ?? "") || /\d/.test(ch[i + 1] ?? "");
      const f = /\d/.test(c) ? c : vecinCifra && CIFRA[r.chars[i].c] ? CIFRA[r.chars[i].c] : undefined;
      const gol = i > 0 && r.chars[i].b.x0 - r.chars[i - 1].b.x1 > rh * 1.5;
      if (f && !gol) { d += f; idx.push(i); } else if (f) { d += `|${f}`; idx.push(-1, i); } else if (/[A-Z]/.test(c)) { d += "|"; idx.push(-1); }
    });
    for (let k = d.indexOf(v.text); k >= 0; k = d.indexOf(v.text, k + 1)) {
      // A short value must be a whole number, not a piece of a longer one.
      if (v.text.length < 9 && (/\d/.test(d[k - 1] ?? "") || /\d/.test(d[k + v.text.length] ?? ""))) continue;
      const de = idx[k], la = idx[k + v.text.length - 1] + 1;
      if (de >= 0 && la > 0) out.push([de, la]);
    }
    return out;
  }
  // Words: the row's words (runs of letters and digits), matched in a row against the value's words, or the value's
  // words joined against one word OCR read without its spaces.
  const cuvinte: { t: string; de: number; la: number }[] = [];
  ch.forEach((c, i) => {
    if (!ALNUM.test(c)) return;
    const ult = cuvinte[cuvinte.length - 1];
    if (ult && ult.la === i && !r.chars[i].s) { ult.t += c; ult.la = i + 1; } else cuvinte.push({ t: c, de: i, la: i + 1 });
  });
  const cautate = pliaza(v.text).split(/[^A-Z0-9]+/).filter((x) => x.length >= 2);
  if (!cautate.length) return out;
  const lipit = cautate.join("");
  // In a value of several words, the words beside one that matches may be read worse: two slips in five letters
  // ("Enka Beispiel" for "Erika Beispiel"), the same first letter. Beside the surname, a near given name is the name.
  const aproape = (a: string, b: string) => a[0] === b[0] && distanta(a, b, Math.ceil(a.length * 0.4)) <= Math.ceil(a.length * 0.4);
  for (let i = 0; i < cuvinte.length; i++) {
    if (cautate.length > 1 && acelasiCuvant(lipit, cuvinte[i].t)) { out.push([cuvinte[i].de, cuvinte[i].la]); continue; }
    if (i + cautate.length > cuvinte.length) continue;
    const ale = cautate.map((c, j) => cuvinte[i + j].t);
    const tari = cautate.filter((c, j) => acelasiCuvant(c, ale[j])).length;
    if (tari === cautate.length || (cautate.length > 1 && tari >= 1 && cautate.every((c, j) => acelasiCuvant(c, ale[j]) || aproape(c, ale[j])))) {
      out.push([cuvinte[i].de, cuvinte[i + cautate.length - 1].la]);
    }
  }
  return out;
}

/** The boxes (in the page's pixels) where a value is on a page; each spans its characters and its row's height. */
export function gaseste(linii: LinieText[], v: Valoare): Cutie[] {
  return randuri(linii).flatMap((r) => gasesteInRand(r, v).map(([de, la]) => ({ ...uneste(r.chars.slice(de, la).map((x) => x.b)), y0: r.bbox.y0, y1: r.bbox.y1 })));
}

const intersectie = (a: Zona, b: Zona) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * Boxes for values on a page (w × h): the owner's own, a word the person typed, the text under a box they drew. A value
 * already under a proposal of the same text (a number the check digits found) is not proposed twice. Margins as a
 * number's: half a row's height either side, a third above and below.
 */
export function propuneValori(linii: LinieText[], w: number, h: number, pagina: number, valori: Valoare[], deja: Propunere[] = [], prefix = "v"): Propunere[] {
  const out: Propunere[] = [];
  const inalt = linii.map((l) => l.bbox.y1 - l.bbox.y0).sort((a, b) => a - b)[Math.floor(linii.length / 2)] ?? 0;
  let n = 0;
  for (const v of valori) {
    for (const b of gaseste(linii, v)) {
      const rh = Math.max(b.y1 - b.y0, inalt);
      const z = zona(b, w, h, rh * 0.6, rh * 0.35);
      // Rows' boxes do not count: they are off unless turned on, and a word in a row is still worth its own box.
      const acoperit = [...deja, ...out].some((x) => x.pagina === pagina && x.fel !== "tranzactie" && x.fel !== "suma" && intersectie(x.zona, z) > z.w * z.h * 0.9);
      if (acoperit) continue;
      out.push({ id: `${prefix}${pagina}-${n++}`, fel: v.fel, text: v.text, pagina, zona: z, ales: IMPLICIT[v.fel] });
    }
  }
  return out;
}

/** What a proposal's text is, compared: its digits when it is a number, else its letters and digits. */
export function cheieText(text: string): string {
  const v = valoare("cuvant", text);
  return v ? (v.mod === "cifre" ? `#${v.text}` : pliaza(v.text).replace(/[^A-Z0-9]/g, "")) : "";
}

/** The text under a box drawn by hand: the characters whose centre is inside it, or "" when there are none. */
export function textSub(linii: LinieText[], z: Zona, w: number, h: number): string {
  const x0 = z.x * w, x1 = (z.x + z.w) * w, y0 = z.y * h, y1 = (z.y + z.h) * h;
  return randuri(linii).map((r) => {
    const c = r.chars.filter((x) => { const cx = (x.b.x0 + x.b.x1) / 2, cy = (x.b.y0 + x.b.y1) / 2; return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1; });
    return c.map((x, i) => (i && x.s ? ` ${x.c}` : x.c)).join("");
  }).filter(Boolean).join(" ").trim();
}

/** A value for the text under a drawn box or a typed word, when it is worth looking for (three letters or digits). */
export function valoareCautata(text: string): Valoare | undefined {
  const v = valoare("cuvant", text);
  return v && pliaza(v.text).replace(/[^A-Z0-9]/g, "").length >= 3 ? v : undefined;
}

/**
 * The check of a blacked-out copy, read again by OCR (`linii`, on the copy's own pixels): what can still be read inside
 * a black box (two letters or digits of one line with their centres in it), and each hidden value found anywhere on
 * the page whose box overlaps a black one. Empty when nothing hidden can be read. Boxes in the page's pixels.
 */
export function scapari(linii: LinieText[], zone: Zona[], w: number, h: number, valori: Valoare[], gri?: { width: number; height: number; data: Uint8Array }): Cutie[] {
  const out: Cutie[] = [];
  // What OCR "reads" on solid black is not ink (it makes up letters there): a leak shows paper between its strokes.
  // With the copy's grey pixels, a find whose part inside the black boxes is nine tenths black is let go; its box
  // often reaches past the black, into the paper around it, so only the part inside counts.
  const cutiiPx = zone.map((z) => ({ x0: z.x * w, y0: z.y * h, x1: (z.x + z.w) * w, y1: (z.y + z.h) * h }));
  const negru = (b: Cutie) => {
    if (!gri) return false;
    let n = 0, t = 0;
    for (const z of cutiiPx) {
      const x0 = Math.max(0, Math.floor(Math.max(b.x0, z.x0) * gri.width / w)), x1 = Math.min(gri.width, Math.ceil(Math.min(b.x1, z.x1) * gri.width / w));
      const y0 = Math.max(0, Math.floor(Math.max(b.y0, z.y0) * gri.height / h)), y1 = Math.min(gri.height, Math.ceil(Math.min(b.y1, z.y1) * gri.height / h));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++, t++) if (gri.data[y * gri.width + x] < 60) n++;
    }
    return t > 0 && n / t >= 0.9;
  };
  const adaug = (b: Cutie) => { if (!negru(b)) out.push(b); };
  const px = (z: Zona) => ({ x0: z.x * w, y0: z.y * h, x1: (z.x + z.w) * w, y1: (z.y + z.h) * h });
  const cutii = zone.map(px);
  for (const l of linii) {
    const c = caractere(l).filter((x) => ALNUM.test(pliaza(x.c)));
    for (const b of cutii) {
      const inauntru = c.filter((x) => { const cx = (x.b.x0 + x.b.x1) / 2, cy = (x.b.y0 + x.b.y1) / 2; return cx > b.x0 && cx < b.x1 && cy > b.y0 && cy < b.y1; });
      if (inauntru.length >= 2) adaug(uneste(inauntru.map((x) => x.b)));
    }
  }
  for (const v of valori) {
    for (const b of gaseste(linii, v)) {
      const z = { x: b.x0 / w, y: b.y0 / h, w: (b.x1 - b.x0) / w, h: (b.y1 - b.y0) / h };
      // Under a box, not beside one: a value left visible next to a box stays the person's choice.
      if (zone.some((x) => intersectie(x, z) > z.w * z.h * 0.3)) adaug(b);
    }
  }
  // A box too short: a piece of a hidden value (three letters or digits of it) read right beside a box, on its row.
  const ascunse = valori.map((v) => (v.mod === "cifre" ? v.text : pliaza(v.text).replace(/[^A-Z0-9]/g, "")));
  for (const r of randuri(linii)) {
    const rh = r.bbox.y1 - r.bbox.y0;
    const lang = cutii.filter((b) => Math.min(b.y1, r.bbox.y1) - Math.max(b.y0, r.bbox.y0) > rh * 0.5);
    if (!lang.length) continue;
    const bucati: { t: string; b: Cutie }[] = [];
    for (const x of r.chars) {
      const c = pliaza(x.c);
      if (!ALNUM.test(c)) continue;
      const ult = bucati[bucati.length - 1];
      if (ult && !x.s) { ult.t += /\d/.test(c) ? c : CIFRA[x.c] && /\d/.test(ult.t) ? CIFRA[x.c] : c; ult.b = uneste([ult.b, x.b]); } else bucati.push({ t: c, b: x.b });
    }
    for (const p of bucati) {
      if (p.t.length < 3 || !ascunse.some((a) => a.includes(p.t))) continue;
      if (!lang.some((b) => p.b.x0 - b.x1 < rh && b.x0 - p.b.x1 < rh)) continue;
      // Mostly out of the boxes: visible, a leak. Mostly in: the pixels say whether it is ink or OCR making it up.
      const z = { x: p.b.x0 / w, y: p.b.y0 / h, w: (p.b.x1 - p.b.x0) / w, h: (p.b.y1 - p.b.y0) / h };
      const acoperit = zone.reduce((s, x) => s + intersectie(x, z), 0) / Math.max(1e-9, z.w * z.h);
      if (acoperit < 0.7) out.push(p.b); else adaug(p.b);
    }
  }
  return out;
}

/** The 2D calls used to draw a blacked-out page: a browser canvas's or @napi-rs/canvas's. */
export interface DesenNegru {
  drawImage(img: CanvasImageSource, x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillStyle: unknown;
}

/** The page (w × h) with the boxes in solid black, rounded outwards to whole pixels. */
export function deseneazaNegru(g: DesenNegru, img: CanvasImageSource, w: number, h: number, zone: Zona[]): void {
  g.drawImage(img, 0, 0, w, h);
  g.fillStyle = "#000";
  for (const z of zone) {
    const x0 = Math.floor(z.x * w), y0 = Math.floor(z.y * h);
    g.fillRect(x0, y0, Math.ceil((z.x + z.w) * w) - x0, Math.ceil((z.y + z.h) * h) - y0);
  }
}
