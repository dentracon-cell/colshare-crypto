// Colshare's PDFs: the shared writer (src/core/scanner/pdf.ts) with Colshare named as their producer, so a paper sent
// with Colshare doesn't say "topograpp" in its properties.
import { pdfDinPagini as scrie, type PaginaJpeg } from "../core/scanner/pdf.ts";

export { asezare, type PaginaJpeg } from "../core/scanner/pdf.ts";

export const pdfDinPagini = (pagini: PaginaJpeg[], titlu = "Act", info: Record<string, string> = {}): Uint8Array =>
  scrie(pagini, titlu, { Producer: "Colshare", Creator: "Colshare", ...info });
