// Fictitious papers for the black-out (src/acte/innegrire.ts): a French bank statement, a German payslip, a Romanian
// income certificate and a Dutch payslip, marked SPECIMEN, with account, card and ID numbers whose check digits are
// computed here (textbook example IBANs, the Visa test card, made-up national numbers). Never a real person's data.
// Each sensitive field knows its own ink: the page drawn without it, compared with the page drawn whole.
import { createCanvas, type Canvas } from "@napi-rs/canvas";

/** "eu": the owner's own name, town or birth date, found by its value (src/acte/innegrire.ts valoriProprii). */
export type FelCamp = "eu" | "cont" | "id" | "tranzactie" | "suma";

interface Text {
  t: string;
  x: number;
  y: number;
  px: number;
  bold?: boolean;
  /** Printed before and after the text, not part of the field (a label, the rest of a sentence). */
  inainte?: string;
  dupa?: string;
  /** Right-aligned at x. */
  dreapta?: boolean;
  /** A field to hide, and its group; texts with the same `camp` are one field (a table row's cells). */
  camp?: string;
  fel?: FelCamp;
}

export interface Hartie {
  nume: string;
  w: number;
  h: number;
  texte: Text[];
}

const cnp = (d12: string) => d12 + String(((r) => (r === 10 ? 1 : r))([...d12].reduce((s, c, i) => s + Number(c) * Number("279146358279"[i]), 0) % 11));
const nir = (d13: string) => d13 + String(97 - Number(BigInt(d13) % 97n)).padStart(2, "0");
function steuerId(d10: string): string {
  let p = 10;
  for (const d of d10) { let x = (Number(d) + p) % 10; if (x === 0) x = 10; p = (x * 2) % 11; }
  return d10 + String((11 - p) % 10);
}
const grupe = (s: string, n = 4) => s.replace(new RegExp(`(.{${n}})(?=.)`, "g"), "$1 ");

/** The values printed, for the tests' expectations. */
export const VALORI = {
  ibanFr: "FR1420041010050500013M02606",
  card: "4111111111111111",
  ibanDe: "DE89370400440532013000",
  steuerId: steuerId("6592997048"),
  svNr: "65170839J003",
  ibanRo: "RO49AAAA1B31007593840000",
  cnp: cnp("284030724001"),
  nir: nir("2840375123456"),
  bsn: "111222333",
  ibanNl: "NL91ABNA0417164300",
};

const W = 1240, H = 1754;
const L = 90, R = W - 90;

function rand(y: number, celule: [string, number, boolean?][], px: number, camp?: string, fel?: FelCamp): Text[] {
  return celule.map(([t, x, dreapta]) => ({ t, x, y, px, dreapta, camp, fel }));
}

function extras(): Hartie {
  const t: Text[] = [
    { t: "BANQUE SPECIMEN", x: L, y: 110, px: 40, bold: true },
    { t: "Relevé de compte n° 10 · du 01/10/2026 au 31/10/2026", x: L, y: 160, px: 22 },
    { t: "SPECIMEN — document fictif", x: R, y: 110, px: 20, dreapta: true },
    { inainte: "Titulaire : Mme ", t: "Marie EXEMPLE", x: L, y: 230, px: 24, camp: "nume", fel: "eu" },
    { t: "75011 PARIS", x: R, y: 230, px: 24, dreapta: true, camp: "oras", fel: "eu" },
    { inainte: "IBAN : ", t: grupe(VALORI.ibanFr), x: L, y: 270, px: 24, camp: "iban", fel: "cont" },
    { t: "BIC : PSSTFRPPPAR", x: L, y: 305, px: 24 },
    { inainte: "Carte n° ", t: grupe(VALORI.card), x: L, y: 340, px: 24, camp: "card", fel: "cont" },
    { inainte: "N° de sécurité sociale : ", t: `${VALORI.nir.replace(/^(\d)(\d{2})(\d{2})(\d{2})(\d{3})(\d{3})(\d{2})$/, "$1 $2 $3 $4 $5 $6 $7")}`, x: L, y: 375, px: 24, camp: "nir", fel: "id" },
    ...rand(450, [["Date", L], ["Libellé", L + 170], ["Débit", R - 220, true], ["Crédit", R, true]], 22),
  ];
  const op: [string, string, string, string][] = [
    ["02/10/2026", "PRLV SEPA EDF CLIENTS", "84,20", ""], ["03/10/2026", "CB CARREFOUR MARKET 03/10", "56,34", ""],
    ["05/10/2026", "VIR SEPA SALAIRE SPECIMEN SARL", "", "2 145,00"], ["07/10/2026", "CB PHARMACIE DU CENTRE", "18,90", ""],
    ["10/10/2026", "PRLV SEPA FREE MOBILE", "19,99", ""], ["12/10/2026", "RETRAIT DAB 12/10", "60,00", ""],
    ["15/10/2026", "VIR LOYER OCTOBRE", "780,00", ""], ["18/10/2026", "CB SNCF INTERNET", "42,50", ""],
    ["22/10/2026", "VIR CAF ALLOCATIONS", "", "126,45"], ["27/10/2026", "CB BOULANGERIE PAUL", "7,80", ""],
  ];
  op.forEach(([d, l, deb, cr], i) => t.push(...rand(500 + i * 46, [[d, L], [l, L + 170], [deb, R - 220, true], [cr, R, true]], 22, `op${i}`, "tranzactie")));
  t.push(...rand(1000, [["Nouveau solde au 31/10/2026", L + 170], ["1 873,45", R, true]], 24, "solde", "tranzactie"));
  return { nume: "fr-releve", w: W, h: H, texte: t };
}

function lohn(): Hartie {
  const t: Text[] = [
    { t: "Lohn- und Gehaltsabrechnung Oktober 2026", x: L, y: 110, px: 36, bold: true },
    { t: "MUSTER GmbH · Beispielstraße 1 · 10115 Berlin", x: L, y: 160, px: 22 },
    { t: "MUSTER — fiktives Dokument", x: R, y: 110, px: 20, dreapta: true },
    { t: "Erika Beispiel", dupa: ", Personalnummer 00421", x: L, y: 230, px: 24, camp: "nume", fel: "eu" },
    { inainte: "geboren am ", t: "07.03.1984", x: R - 300, y: 230, px: 24, camp: "nastere", fel: "eu" },
    { inainte: "Steuer-ID ", t: `${VALORI.steuerId.replace(/^(\d{2})(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4")}`, x: L, y: 270, px: 24, camp: "steuer", fel: "id" },
    { inainte: "SV-Nummer ", t: `${VALORI.svNr.replace(/^(\d{2})(\d{6})([A-Z])(\d{3})$/, "$1 $2 $3 $4")}`, x: L, y: 305, px: 24, camp: "sv", fel: "id" },
    { t: "Steuerklasse 1 · Kinderfreibetrag 0,0", x: L, y: 340, px: 24 },
    ...rand(420, [["Bezeichnung", L], ["Betrag EUR", R, true]], 22),
  ];
  const zeilen: [string, string][] = [
    ["Grundgehalt", "3.200,00"], ["Vermögenswirksame Leistungen", "40,00"], ["Gesamtbrutto", "3.240,00"],
    ["Lohnsteuer", "-412,33"], ["Solidaritätszuschlag", "0,00"], ["Krankenversicherung", "-265,68"],
    ["Rentenversicherung", "-301,32"], ["Arbeitslosenversicherung", "-42,12"], ["Pflegeversicherung", "-55,08"],
  ];
  zeilen.forEach(([b, v], i) => t.push(...rand(470 + i * 46, [[b, L], [v, R, true]], 22, `z${i}`, "suma")));
  t.push(...rand(920, [["Auszahlungsbetrag", L], ["2.163,47", R, true]], 26, "netto", "suma"));
  t.push({ inainte: "Überweisung an IBAN ", t: grupe(VALORI.ibanDe), x: L, y: 990, px: 22, camp: "iban", fel: "cont" });
  return { nume: "de-lohn", w: W, h: H, texte: t };
}

function adeverinta(): Hartie {
  const t: Text[] = [
    { t: "ADEVERINȚĂ DE VENIT", x: W / 2 - 230, y: 140, px: 40, bold: true },
    { t: "SPECIMEN SRL · CUI 12345678 · Baia Mare", x: L, y: 210, px: 22 },
    { t: "SPECIMEN — document fictiv", x: R, y: 100, px: 20, dreapta: true },
    { inainte: "Se adeverește prin prezenta că doamna ", t: "Ana EXEMPLU", dupa: ",", x: L, y: 290, px: 24, camp: "nume", fel: "eu" },
    { inainte: "CNP ", t: VALORI.cnp, dupa: ", este angajata noastră din 2019.", x: L, y: 330, px: 24, camp: "cnp", fel: "id" },
    { inainte: "Salariul se plătește în contul ", t: grupe(VALORI.ibanRo), dupa: ".", x: L, y: 370, px: 24, camp: "iban", fel: "cont" },
    ...rand(450, [["Luna", L], ["Venit brut", R - 300, true], ["Venit net", R, true]], 22),
  ];
  const luni: [string, string, string][] = [["iulie 2026", "6.500,00", "3.803,00"], ["august 2026", "6.500,00", "3.803,00"], ["septembrie 2026", "6.750,00", "3.949,00"]];
  luni.forEach(([l, b, n], i) => t.push(...rand(500 + i * 46, [[l, L], [b, R - 300, true], [n, R, true]], 22, `l${i}`, "suma")));
  return { nume: "ro-adeverinta", w: W, h: H, texte: t };
}

function loonstrook(): Hartie {
  const t: Text[] = [
    { t: "Loonstrook oktober 2026", x: L, y: 110, px: 36, bold: true },
    { t: "VOORBEELD B.V. · Amsterdam", x: L, y: 160, px: 22 },
    { t: "VOORBEELD — fictief document", x: R, y: 110, px: 20, dreapta: true },
    { t: "Werknemer: J. Voorbeeld", x: L, y: 230, px: 24 },
    { inainte: "BSN: ", t: VALORI.bsn, x: L, y: 270, px: 24, camp: "bsn", fel: "id" },
    { inainte: "Rekening: ", t: grupe(VALORI.ibanNl), x: L, y: 305, px: 24, camp: "iban", fel: "cont" },
  ];
  const r: [string, string][] = [["Salaris", "2.850,00"], ["Loonheffing", "-512,40"], ["Pensioenpremie", "-118,75"], ["Netto", "2.218,85"]];
  r.forEach(([b, v], i) => t.push(...rand(400 + i * 46, [[b, L], [v, R, true]], 22, `r${i}`, "suma")));
  return { nume: "nl-loon", w: W, h: H, texte: t };
}

/** A German statement in two columns, each a table of its own, their rows at different heights (2026-10-20). */
function douaColoane(): Hartie {
  const M = W / 2;
  const t: Text[] = [
    { t: "Kontoauszug Oktober 2026", x: L, y: 110, px: 36, bold: true },
    { t: "MUSTERBANK — fiktives Dokument", x: R, y: 110, px: 20, dreapta: true },
    { inainte: "IBAN ", t: grupe(VALORI.ibanDe), x: L, y: 180, px: 24, camp: "iban", fel: "cont" },
    { inainte: "Karte ", t: grupe(VALORI.card), x: L, y: 220, px: 24, camp: "card", fel: "cont" },
    { t: "Girokonto", x: L, y: 300, px: 24, bold: true },
    { t: "Kreditkarte", x: M + 40, y: 300, px: 24, bold: true },
  ];
  const giro: [string, string, string][] = [
    ["01.10.", "Miete Oktober", "-850,00"], ["02.10.", "Gehalt Muster GmbH", "2.163,47"], ["05.10.", "Stadtwerke", "-64,20"],
    ["09.10.", "Versicherung", "-31,90"], ["14.10.", "Bargeld", "-100,00"], ["20.10.", "Rundfunkbeitrag", "-18,36"],
    ["27.10.", "Sparplan", "-150,00"],
  ];
  const karte: [string, string, string][] = [
    ["03.10.", "Supermarkt", "-42,17"], ["06.10.", "Tankstelle", "-61,05"], ["11.10.", "Buchhandlung", "-18,90"],
    ["16.10.", "Apotheke", "-9,85"], ["24.10.", "Bahnticket", "-29,90"],
  ];
  giro.forEach(([d, x, v], i) => t.push(...rand(350 + i * 44, [[d, L], [x, L + 90], [v, M - 30, true]], 20, `g${i}`, "tranzactie")));
  karte.forEach(([d, x, v], i) => t.push(...rand(362 + i * 58, [[d, M + 40], [x, M + 130], [v, R, true]], 20, `k${i}`, "tranzactie")));
  return { nume: "de-zwei-spalten", w: W, h: H, texte: t };
}

/** A Romanian rent statement with amounts written without decimals (2026-10-20). */
function chirie(): Hartie {
  const t: Text[] = [
    { t: "SITUAȚIA PLĂȚILOR — CHIRIE", x: L, y: 120, px: 36, bold: true },
    { t: "SPECIMEN — document fictiv", x: R, y: 120, px: 20, dreapta: true },
    { inainte: "Chiriaș: Ana EXEMPLU, CNP ", t: VALORI.cnp, x: L, y: 200, px: 24, camp: "cnp", fel: "id" },
    { inainte: "Cont chiriaș ", t: grupe(VALORI.ibanRo), x: L, y: 240, px: 24, camp: "iban", fel: "cont" },
  ];
  const r: [string, string][] = [["Chirie lunară", "2.300 lei"], ["Garanție", "4.600 lei"], ["Întreținere", "450 lei"], ["Total de plată", "7.350 lei"], ["Echivalent", "1 478 EUR"]];
  r.forEach(([b, v], i) => t.push(...rand(330 + i * 46, [[b, L], [v, R, true]], 22, `c${i}`, "suma")));
  return { nume: "ro-chirie", w: W, h: H, texte: t };
}

/** What the app knows of each paper's owner: the reading of their ID and About me (fictitious, like the papers). */
export const PROPRII: Record<string, { citiri: { nume?: string; prenume?: string; cnp?: string; nastere?: string }[]; eu: { cod?: string; oras?: string } }> = {
  "fr-releve": { citiri: [{ nume: "EXEMPLE", prenume: "MARIE", nastere: "1984-03-07" }], eu: { cod: "75011", oras: "Paris" } },
  "de-lohn": { citiri: [{ nume: "BEISPIEL", prenume: "ERIKA", nastere: "1984-03-07" }], eu: {} },
  "ro-adeverinta": { citiri: [{ nume: "EXEMPLU", prenume: "ANA", cnp: VALORI.cnp }], eu: {} },
  "ro-chirie": { citiri: [{ nume: "EXEMPLU", prenume: "ANA", cnp: VALORI.cnp }], eu: {} },
};

export const HARTII: Hartie[] = [extras(), lohn(), adeverinta(), loonstrook(), douaColoane(), chirie()];

/** The paper drawn on white, every text but those of field `fara`. */
export function deseneazaHartie(h: Hartie, fara?: string): Canvas {
  const c = createCanvas(h.w, h.h);
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, h.w, h.h);
  g.fillStyle = "#151515";
  g.textBaseline = "alphabetic";
  for (const x of h.texte) {
    g.font = `${x.bold ? "700" : "400"} ${x.px}px Arial, "DejaVu Sans", sans-serif`;
    g.textAlign = x.dreapta ? "right" : "left";
    const a = x.inainte ? g.measureText(x.inainte).width : 0, b = g.measureText(x.t).width;
    if (x.inainte) g.fillText(x.inainte, x.x, x.y);
    if (!fara || x.camp !== fara) g.fillText(x.t, x.x + a, x.y);
    if (x.dupa) g.fillText(x.dupa, x.x + a + b, x.y);
  }
  return c;
}

export interface Camp {
  camp: string;
  fel: FelCamp;
  /** Where its ink is: 1 for each pixel of the page drawn whole that the field darkens. */
  cerneala: Uint8Array;
}

/** Each field to hide and its ink. */
export function campuri(h: Hartie): Camp[] {
  const tot = deseneazaHartie(h).getContext("2d").getImageData(0, 0, h.w, h.h).data;
  const nume = [...new Set(h.texte.filter((x) => x.camp).map((x) => x.camp!))];
  return nume.map((camp) => {
    const fara = deseneazaHartie(h, camp).getContext("2d").getImageData(0, 0, h.w, h.h).data;
    const cerneala = new Uint8Array(h.w * h.h);
    for (let i = 0, p = 0; i < cerneala.length; i++, p += 4) cerneala[i] = fara[p] - tot[p] > 100 ? 1 : 0;
    return { camp, fel: h.texte.find((x) => x.camp === camp)!.fel!, cerneala };
  });
}

/** The page's text as a PDF's text layer gives it: each printed piece with its box (no OCR). */
export function textHartie(h: Hartie): { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[] {
  const g = createCanvas(10, 10).getContext("2d");
  return h.texte.flatMap((x) => {
    g.font = `${x.bold ? "700" : "400"} ${x.px}px Arial, "DejaVu Sans", sans-serif`;
    const parti = [x.inainte, x.t, x.dupa].filter((p): p is string => !!p);
    let st = x.dreapta ? x.x - g.measureText(parti.join("")).width : x.x;
    return parti.map((p) => {
      const w = g.measureText(p).width, o = { text: p, bbox: { x0: st, y0: x.y - x.px * 0.8, x1: st + w, y1: x.y + x.px * 0.22 } };
      st += w;
      return o;
    });
  });
}
