// Blacking out a PDF that has a real text layer: the copy must be pictures with the black in their pixels, with no text
// left to select, copy or extract, and none of the hidden numbers anywhere in the file's bytes.
import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { extractPdf } from "../src/core/pdf-text.ts";
import { pdfDinPagini } from "../src/core/scanner/pdf.ts";
import { deseneazaNegru, propune, zoneAscunse } from "../src/acte/innegrire.ts";
import { randeazaPdf } from "../src/acte/pdf-pagini.ts";
import { VALORI } from "./acte-hartii.ts";

describe("a PDF with a text layer", () => {
  it("becomes pictures: the blacked-out copy has no text layer and nothing of the hidden numbers", async () => {
    const { PDFDocument, StandardFonts } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const pag = doc.addPage([595, 842]);
    const f = await doc.embedFont(StandardFonts.Helvetica);
    pag.drawText(`IBAN ${VALORI.ibanRo}`, { x: 50, y: 760, size: 12, font: f });
    pag.drawText(`CNP ${VALORI.cnp}`, { x: 50, y: 740, size: 12, font: f });
    pag.drawText("Venit net 3.803,00", { x: 50, y: 720, size: 12, font: f });
    const sursa = await doc.save();

    // The original really has the numbers as text.
    expect((await extractPdf(sursa)).lines.join(" ")).toContain(VALORI.cnp);

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pagini = await randeazaPdf(pdfjs as never, sursa, (w, h) => createCanvas(w, h) as never);
    expect(pagini.length).toBe(1);
    const pg = pagini[0];
    const p = propune(pg.linii, pg.w, pg.h);
    expect(p.filter((x) => x.ales).map((x) => x.text)).toEqual(expect.arrayContaining([VALORI.ibanRo, VALORI.cnp]));
    const c = createCanvas(pg.w, pg.h);
    deseneazaNegru(c.getContext("2d") as never, pg.imagine as never, pg.w, pg.h, zoneAscunse(p, 0));
    const jpeg = new Uint8Array(await c.encode("jpeg", 90));
    const iesire = pdfDinPagini([{ jpeg, w: pg.w, h: pg.h }], "Blacked out");

    expect((await extractPdf(iesire)).lines.join(" ")).toBe("");
    const brut = new TextDecoder("latin1").decode(iesire);
    for (const v of [VALORI.ibanRo, VALORI.cnp, "AAAA", " BT"]) expect(brut.includes(v), v).toBe(false);
  }, 60_000);
});
