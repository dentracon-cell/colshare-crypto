// A PDF paper's pages as pictures and text, for the black-out (./innegrire.ts): each page drawn by pdf.js at 200 dpi,
// and its text layer's pieces with their boxes in that picture's pixels. A page with (almost) no text is a scan: the
// caller reads it with OCR. pdf.js is passed in (the app loads it from its own files when a PDF is blacked out; the
// tests import pdfjs-dist), so the app's script does not carry it.
import type { LinieText } from "./innegrire.ts";

/** The part of pdf.js used here. */
export interface PdfJs {
  getDocument(src: { data: Uint8Array; standardFontDataUrl?: string; isEvalSupported?: boolean; useSystemFonts?: boolean }): { promise: Promise<DocPdf>; destroy(): Promise<void> };
  Util: { transform(a: number[], b: number[]): number[] };
}
interface DocPdf {
  numPages: number;
  getPage(n: number): Promise<PaginaPdf>;
}
interface PaginaPdf {
  getViewport(o: { scale: number }): { width: number; height: number; transform: number[] };
  render(o: { canvasContext: unknown; canvas?: unknown; viewport: unknown }): { promise: Promise<void> };
  getTextContent(): Promise<{ items: { str?: string; transform?: number[]; width?: number }[] }>;
  cleanup(): void;
}

/** A canvas of the caller's: the page's own in the app, @napi-rs/canvas's in the tests. */
export interface PanzaPdf {
  width: number;
  height: number;
  getContext(t: "2d"): unknown;
}

export interface PaginaRandata<C extends PanzaPdf = PanzaPdf> {
  w: number;
  h: number;
  imagine: C;
  linii: LinieText[];
  /** Whether the page has a text layer worth the name (else: a scanned page, to read with OCR). */
  text: boolean;
}

/** Pages drawn at most this large on their longer side (A4 at 200 dpi is 2339). */
const MAX_LATURA = 2400;
/** Letters and digits a page needs for its text layer to stand for it. */
const MIN_TEXT = 30;

export async function randeazaPdf<C extends PanzaPdf>(pdfjs: PdfJs, date: Uint8Array, panza: (w: number, h: number) => C, o: { dpi?: number; standardFontDataUrl?: string; maxPagini?: number } = {}): Promise<PaginaRandata<C>[]> {
  const sarcina = pdfjs.getDocument({ data: date.slice(), isEvalSupported: false, useSystemFonts: true, ...(o.standardFontDataUrl ? { standardFontDataUrl: o.standardFontDataUrl } : {}) });
  const doc = await sarcina.promise;
  const out: PaginaRandata<C>[] = [];
  try {
    for (let n = 1; n <= Math.min(doc.numPages, o.maxPagini ?? 30); n++) {
      const pag = await doc.getPage(n);
      const v1 = pag.getViewport({ scale: 1 });
      const scara = Math.min((o.dpi ?? 200) / 72, MAX_LATURA / Math.max(v1.width, v1.height));
      const v = pag.getViewport({ scale: scara });
      const w = Math.round(v.width), h = Math.round(v.height);
      const c = panza(w, h);
      const g = c.getContext("2d") as { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void };
      g.fillStyle = "#fff";
      g.fillRect(0, 0, w, h);
      await pag.render({ canvasContext: g, canvas: c, viewport: v }).promise;
      const linii: LinieText[] = [];
      for (const it of (await pag.getTextContent()).items) {
        if (!it.str?.trim() || !it.transform) continue;
        const t = pdfjs.Util.transform(v.transform, it.transform);
        const inalt = Math.hypot(t[2], t[3]), x = t[4], y = t[5], lat = (it.width ?? 0) * scara;
        if (inalt < 1 || lat <= 0) continue;
        linii.push({ text: it.str, bbox: { x0: x, y0: y - inalt, x1: x + lat, y1: y + inalt * 0.25 } });
      }
      out.push({ w, h, imagine: c, linii, text: linii.reduce((s, l) => s + l.text.replace(/[^\p{L}\p{N}]/gu, "").length, 0) >= MIN_TEXT });
      pag.cleanup();
    }
  } finally {
    await sarcina.destroy();
  }
  return out;
}

/**
 * A PDF's pages drawn one after another to be looked at in the app (attack test 2026-10-29, A3): no text layer, each
 * page at most `latura` pixels on its longer side, handed to `pagina` as soon as it is drawn.
 */
export async function desenezPaginile<C extends PanzaPdf>(pdfjs: PdfJs, date: Uint8Array, panza: (w: number, h: number) => C, pagina: (c: C, n: number, total: number) => Promise<boolean | void> | boolean | void, o: { latura?: number; maxPagini?: number; standardFontDataUrl?: string } = {}): Promise<number> {
  const sarcina = pdfjs.getDocument({ data: date.slice(), isEvalSupported: false, useSystemFonts: true, ...(o.standardFontDataUrl ? { standardFontDataUrl: o.standardFontDataUrl } : {}) });
  const doc = await sarcina.promise;
  const total = Math.min(doc.numPages, o.maxPagini ?? 300);
  try {
    for (let n = 1; n <= total; n++) {
      const pag = await doc.getPage(n);
      const v1 = pag.getViewport({ scale: 1 });
      const v = pag.getViewport({ scale: (o.latura ?? 1800) / Math.max(v1.width, v1.height) });
      const c = panza(Math.round(v.width), Math.round(v.height));
      const g = c.getContext("2d") as { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void };
      g.fillStyle = "#fff";
      g.fillRect(0, 0, c.width, c.height);
      await pag.render({ canvasContext: g, canvas: c, viewport: v }).promise;
      pag.cleanup();
      // The caller stops it by answering false (the viewer was closed).
      if ((await pagina(c, n, total)) === false) break;
    }
  } finally {
    await sarcina.destroy();
  }
  return total;
}
