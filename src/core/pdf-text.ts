import { AnnotationMode, getDocument, OPS, type PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

export interface PdfContent {
  /** Text layer regrouped into lines, in reading order (all pages). */
  lines: string[];
  /** Text of FreeText annotations, e.g. the cadastral number and stamp OCPI writes onto the PAD. */
  annotations: string[];
  /** Number of digital-signature fields. */
  signatureFields: number;
  /** Filled-in form fields other than signatures, as "name=value": two forms from one template differ only here. */
  formFields: string[];
  pages: number;
  /** Lines of each page, in page order (0 for a page without text, e.g. a scan): `lines` split by page. */
  pageLines: number[];
  /**
   * Whether each page, in page order, has a text layer that stands for the page (at least TEXT_MINIM_PAGINA
   * letters and digits). False for a scanned page, with no text or only a scanner's footer on the image, and for
   * a blank page or a page with a few words.
   */
  pageText: boolean[];
  /** Subtypes of each page's annotations other than form fields (Stamp, Ink, FreeText, FileAttachment…), sorted. */
  pageAnnotations: string[][];
  /**
   * Images each page paints in its own content (a scan, a logo, a stamp or signature drawn onto the page), or
   * undefined where the page's drawing was not read: reading it decodes every image, so only where the answer is
   * needed (see extractPdf).
   */
  pageImages: (number | undefined)[];
  /** Share of each page's area its images cover (0 to 1, or more where they overlap); undefined where not read. */
  pageImageCover: (number | undefined)[];
  /**
   * Hash of what each page draws in its own content (every operator and its numbers: paths, positions, sizes,
   * colours), undefined where not read. A stamp or signature drawn as vector paths or as an image changes it;
   * signing again does not, since a signature touches only the annotations, which are left out.
   */
  pageOps: (string | undefined)[];
  /**
   * Whether each page is a scan: little text (under TEXT_MINIM_PAGINA) over images covering at least
   * ACOPERIRE_SCAN of the page. A blank page, a signature block (with or without a small signature image) or a plan
   * with a few labels is not. Where the page was not read (a PDF without any text, past LIMITE_PDF.paginiImagini
   * pages with images, a page pdf.js cannot draw), little text is enough.
   */
  pageScan: boolean[];
}

/**
 * Text a page needs (letters and digits, not spaces) for its text to stand for the page. A page of an OCPI
 * document or a primărie paper has hundreds of characters; a scanner's footer or stamp ("Scanat cu …", a date,
 * "Pagina 1 din 3") has a few dozen, and says nothing about the scanned image under it.
 */
export const TEXT_MINIM_PAGINA = 150;

/** A text item placed on a line: its left edge, width and font height, in page units. */
export interface ItemRand {
  x: number;
  width: number;
  height: number;
  str: string;
}

/**
 * Two items this close (a fraction of the font height) are one word cut in two by the PDF writer: the primărie
 * PDFs split "EXEMPLU" into "EXE" + "MPLU" and "12345" into "1" + "2345". A space between words is a quarter of
 * the font height or more, so anything wider is a word break.
 */
const LIPIT = 0.2;

/**
 * One line of text from its items: sorted left to right, joined with a space where the PDF leaves a gap (or
 * draws a space) and without one where an item starts where the previous one ends.
 */
export function joinItems(items: ItemRand[]): string {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let s = "";
  // Where the previous item ends; undefined when its width is unknown (0), and then a space always follows it.
  let end: number | undefined;
  for (const it of sorted) {
    if (!it.str.trim()) {
      s += " ";
      continue;
    }
    // An item starting well before the previous one ends (overprinted text, a bad width) is kept apart too.
    const lipit = end !== undefined && Math.abs(it.x - end) <= LIPIT * (it.height || 10);
    if (s && !/\s$/.test(s) && !/^\s/.test(it.str) && !lipit) s += " ";
    s += it.str;
    end = it.width ? it.x + it.width : undefined;
  }
  return s.replace(/\s+/g, " ").trim();
}

/**
 * OCPI documents are a few pages and a few MB; far beyond that the file is not one of them. `paginiImagini`: pages
 * with images whose images are counted at most (decoding a scanned page takes up to a second, and reading a PDF
 * has a minute).
 */
export const LIMITE_PDF = { octeti: 50e6, pagini: 300, caractereRand: 5000, paginiImagini: 30 };
/** The largest image pdf.js may decode, in pixels. */
export const MAX_PIXELI_IMAGINE = 50_000_000;

/** Operators that paint an image; pdf.js groups repeated small ones into the Group and Repeat forms. */
const IMAGINI = new Set([
  OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject, OPS.paintImageXObjectRepeat,
  OPS.paintInlineImageXObjectGroup, OPS.paintImageMaskXObjectGroup, OPS.paintImageMaskXObjectRepeat,
]);
/** Image paints drawn over the unit square of the current transform (a scan's page image among them). */
const IMAGINE_INTREAGA = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject]);

/**
 * Share of the page an image-only page's images must cover to be a scan: a scanned sheet fills the page, a
 * signature or stamp image beside the text of a signature block is a small part of it.
 */
export const ACOPERIRE_SCAN = 0.5;

/**
 * An operator's arguments as they stand for what is drawn: numbers (rounded), colours and glyphs kept, other
 * names left out, since pdf.js names fonts and images by the order it loads them in (another save of the file
 * renumbers them).
 */
function forma(v: unknown): unknown {
  if (typeof v === "number") return Math.round(v * 100) / 100;
  if (typeof v === "string") return v.startsWith("#") ? v : "";
  if (v == null || typeof v === "boolean") return v ?? null;
  if (ArrayBuffer.isView(v)) return forma(Array.from(v as unknown as ArrayLike<number>));
  if (Array.isArray(v)) return v.map(forma);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("unicode" in o) return o.unicode ?? "";
    return Object.keys(o).sort().map((k) => [k, forma(o[k])]);
  }
  return "";
}

/** What a page draws in its own content: images and the share of the page they cover, and a hash of every operator. */
async function citestePagina(page: PDFPageProxy) {
  // Not the annotations: a signature field's appearance belongs to the signed copy, not to the paper.
  const { fnArray, argsArray } = await page.getOperatorList({ annotationMode: AnnotationMode.DISABLE });
  let imagini = 0;
  let arie = 0;
  // Only the area scale of the current transform matters: the determinant of its linear part, stacked by q/Q.
  let det = 1;
  const stiva: number[] = [];
  const ops: unknown[] = [];
  fnArray.forEach((fn, i) => {
    const args = argsArray[i] as unknown[] | null;
    // Not in the hash: loading hints, and the q/Q pairs a program saving the file again wraps the content in.
    if (fn !== OPS.dependency && fn !== OPS.save && fn !== OPS.restore) ops.push(fn, forma(args));
    if (fn === OPS.save) stiva.push(det);
    else if (fn === OPS.restore || fn === OPS.paintFormXObjectEnd) det = stiva.pop() ?? det;
    else if (fn === OPS.transform && args) {
      const [a, b, c, d] = args as number[];
      det *= Math.abs(a * d - b * c);
    } else if (fn === OPS.paintFormXObjectBegin && args) {
      stiva.push(det);
      const m = args[0] as number[] | null;
      if (m) det *= Math.abs(m[0] * m[3] - m[1] * m[2]);
    }
    if (IMAGINI.has(fn)) {
      imagini++;
      if (IMAGINE_INTREAGA.has(fn)) arie += det;
      else if (fn === OPS.paintImageXObjectRepeat && args) {
        // [image, scaleX, scaleY, positions]: one image scaled and drawn at each position.
        const [, sx, sy, poz] = args as [unknown, number, number, ArrayLike<number>];
        arie += det * Math.abs(sx * sy) * Math.floor((poz?.length ?? 0) / 2);
      }
      // The Group forms and the repeated mask are small images (pdf.js groups only those): no area to speak of.
    }
  });
  const [x0, y0, x1, y1] = page.view;
  const pagina = Math.abs((x1 - x0) * (y1 - y0)) || 1;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(ops)));
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { imagini, acoperire: arie / pagina, hash };
}

/**
 * Reads the text layer of a PDF. pdf.js returns loose text items; we regroup them
 * into lines by their Y position so parsers can work with lines as a human reads them.
 */
export async function extractPdf(data: Uint8Array): Promise<PdfContent> {
  if (data.length > LIMITE_PDF.octeti) throw new Error("PDF-ul e prea mare pentru un document OCPI.");
  // pdf.js detaches the buffer it is given, so hand it a copy.
  // maxImageSize (pixels) refuses an image no scan reaches (600 dpi A4 is 35 million) before it is decoded. pdf.js 6
  // has no isEvalSupported: it no longer compiles fonts with eval.
  const doc = await getDocument({ data: data.slice(), useSystemFonts: true, maxImageSize: MAX_PIXELI_IMAGINE }).promise;
  const lines: string[] = [];
  const annotations: string[] = [];
  let signatureFields = 0;
  const formFields: string[] = [];
  const pageLines: number[] = [];
  const pageText: boolean[] = [];
  const pageAnnotations: string[][] = [];
  if (doc.numPages > LIMITE_PDF.pagini) {
    await doc.cleanup();
    throw new Error("PDF-ul are prea multe pagini pentru un document OCPI.");
  }

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map<number, ItemRand[]>();
    // Line keys by 2pt band, so finding a line is a lookup in three bands rather than a scan of every line.
    const benzi = new Map<number, number[]>();
    const rand = (y: number) => {
      const b = Math.floor(y / 2);
      return { b, key: [b - 1, b, b + 1].flatMap((n) => benzi.get(n) ?? []).find((k) => Math.abs(k - y) < 2) };
    };

    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;
      const [, , c, d, x, y] = item.transform as number[];
      const it: ItemRand = { x, width: item.width || 0, height: item.height || Math.hypot(c, d), str: item.str };
      // Items within 2pt vertically belong to the same line.
      let { b, key } = rand(y);
      if (!item.str.trim()) {
        // A drawn space only separates words on a line that has them; it never starts a line.
        if (key !== undefined) rows.get(key)!.push(it);
        continue;
      }
      if (key === undefined) {
        key = y;
        benzi.set(b, [...(benzi.get(b) ?? []), y]);
      }
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key)!.push(it);
    }

    const sorted = [...rows.entries()].sort((a, b) => b[0] - a[0]); // top of page first
    pageLines.push(sorted.length);
    let chars = 0;
    for (const [, items] of sorted) {
      const line = joinItems(items).slice(0, LIMITE_PDF.caractereRand);
      chars += line.replace(/\s/g, "").length;
      lines.push(line);
    }
    pageText.push(chars >= TEXT_MINIM_PAGINA);

    const subtipuri: string[] = [];
    for (const a of await page.getAnnotations()) {
      if (a.subtype === "FreeText" && a.contentsObj?.str?.trim()) annotations.push(a.contentsObj.str.trim());
      if (a.subtype !== "Widget") subtipuri.push(String(a.subtype ?? "").slice(0, 40));
      else if (a.fieldType === "Sig") signatureFields++;
      else if (a.fieldValue != null && String(a.fieldValue) !== "") {
        formFields.push(`${a.fieldName ?? ""}=${String(a.fieldValue)}`.slice(0, LIMITE_PDF.caractereRand));
      }
    }
    pageAnnotations.push(subtipuri.sort());
  }

  // What each page draws, from the operator list of its own content. The operator list decodes every image, so it
  // is read only where the answer is needed: first on the pages with little text of a PDF that has some (a scan, or
  // a blank page, a signature block or a few words), then, when none of them is a scan, on the pages with text too
  // (the copy fingerprint tells a stamped or hand-signed copy from the plain one; with a scan there is none). A PDF
  // without any text has nothing to read either way. Past LIMITE_PDF.paginiImagini pages with images, and on a
  // page pdf.js cannot draw, a page is not read.
  const pageImages: (number | undefined)[] = pageText.map(() => undefined);
  const pageImageCover: (number | undefined)[] = pageText.map(() => undefined);
  const pageOps: (string | undefined)[] = pageText.map(() => undefined);
  const scanata = (i: number) => !pageText[i] && (pageImageCover[i] ?? 1) >= ACOPERIRE_SCAN;
  const putinText = pageText.flatMap((t, i) => (t ? [] : [i]));
  const deCitit = lines.length ? [...putinText, ...pageText.flatMap((t, i) => (t ? [i] : []))] : [];
  let cuImagini = 0;
  for (const i of deCitit) {
    if (cuImagini >= LIMITE_PDF.paginiImagini) break;
    if (pageText[i] && putinText.some(scanata)) break;
    const page = await doc.getPage(i + 1);
    try {
      const citit = await citestePagina(page);
      pageImages[i] = citit.imagini;
      pageImageCover[i] = citit.acoperire;
      pageOps[i] = citit.hash;
      if (citit.imagini) cuImagini++;
    } catch {
      // Left unread: no fingerprint, and with little text the page counts as scanned.
    }
    // The decoded images are kept for a rendering that never comes: freed before the next page.
    page.cleanup();
  }
  const pageScan = pageText.map((_, i) => scanata(i));

  const pages = doc.numPages;
  await doc.cleanup();
  return {
    lines, annotations, signatureFields, formFields, pages, pageLines, pageText, pageAnnotations, pageImages, pageImageCover,
    pageOps, pageScan,
  };
}

/** 1-based numbers of the scanned pages (pageScan). */
export function paginiScanate(pdf: Pick<PdfContent, "pageScan">): number[] {
  return pdf.pageScan.flatMap((s, i) => (s ? [i + 1] : []));
}
