// One paper, one PDF: its pages, photographed and straightened on the phone, each a JPEG on an A4 page (portrait or
// landscape as the page is), as a scanner app makes them. The office reads it as any dropped scan.
// Written by hand, not with pdf-lib: a PDF of JPEG pages is a few objects, and the phone page should not carry a
// 400 KB library over a village's mobile data. The JPEG goes in as it is (DCTDecode), not re-encoded.

export interface PaginaJpeg {
  jpeg: Uint8Array;
  w: number;
  h: number;
}

/** A4 in points. */
const A4 = { scurt: 595.28, lung: 841.89 };

const n2 = (x: number) => (Math.round(x * 100) / 100).toString();

/** A PDF text string: ASCII as it is, anything else as UTF-16BE hex with its byte order mark. */
const textPdf = (s: string) =>
  /^[\x20-\x7e]*$/.test(s) && !/[()\\]/.test(s)
    ? `(${s})`
    : `<FEFF${[...s].flatMap((ch) => {
      const c = ch.codePointAt(0)!;
      return c > 0xffff ? [0xd800 + ((c - 0x10000) >> 10), 0xdc00 + ((c - 0x10000) & 0x3ff)] : [c];
    }).map((u) => u.toString(16).padStart(4, "0")).join("").toUpperCase()}>`;

/**
 * Where a page's picture (w × h pixels) sits on its A4 page, in points from the bottom left: the page's size, and the
 * picture's corner and size (fills the page of its orientation, keeping its proportions, centred).
 */
export function asezare(pw: number, ph: number): { latime: number; inaltime: number; x: number; y: number; w: number; h: number } {
  const latime = pw > ph ? A4.lung : A4.scurt, inaltime = pw > ph ? A4.scurt : A4.lung;
  const k = Math.min(latime / pw, inaltime / ph);
  const w = pw * k, h = ph * k;
  return { latime, inaltime, x: (latime - w) / 2, y: (inaltime - h) / 2, w, h };
}

/**
 * The pages as one PDF; each fills an A4 page of its orientation, keeping its proportions, centred. `info`: more entries
 * of the information dictionary (the papers app's /ColshareProof, src/acte/dovada.ts).
 */
export function pdfDinPagini(pagini: PaginaJpeg[], titlu = "Act", info: Record<string, string> = {}): Uint8Array {
  if (!pagini.length) throw new Error("Nu ai fotografiat niciun act.");
  const enc = new TextEncoder();
  const parti: Uint8Array[] = [];
  const offsets: number[] = [];
  let lungime = 0;
  const scrie = (b: Uint8Array | string) => {
    const u = typeof b === "string" ? enc.encode(b) : b;
    parti.push(u);
    lungime += u.length;
  };
  // Objects: 1 catalog, 2 pages, 3 info, then per page: page, image, content.
  const obiect = (nr: number, corp: () => void) => {
    offsets[nr] = lungime;
    scrie(`${nr} 0 obj\n`);
    corp();
    scrie("\nendobj\n");
  };
  scrie("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const nrPagina = (i: number) => 4 + i * 3;
  obiect(1, () => scrie("<< /Type /Catalog /Pages 2 0 R >>"));
  obiect(2, () => scrie(`<< /Type /Pages /Count ${pagini.length} /Kids [${pagini.map((_, i) => `${nrPagina(i)} 0 R`).join(" ")}] >>`));
  // The producer stays "topograpp" unless the caller names its own (Colshare does): the desk program recognises papers
  // from its field phone by it (src/ui/idPicture.ts).
  const { Producer = "topograpp", Creator = "topograpp", ...alte } = info;
  obiect(3, () => scrie(`<< /Title ${textPdf(titlu)} /Producer ${textPdf(Producer)} /Creator ${textPdf(Creator)}${Object.entries(alte).map(([k, v]) => ` /${k} ${textPdf(v)}`).join("")} >>`));
  pagini.forEach((p, i) => {
    const [pg, im, ct] = [nrPagina(i), nrPagina(i) + 1, nrPagina(i) + 2];
    const { latime, inaltime, x, y, w, h } = asezare(p.w, p.h);
    const desen = `q ${n2(w)} 0 0 ${n2(h)} ${n2(x)} ${n2(y)} cm /Im0 Do Q`;
    obiect(pg, () => scrie(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n2(latime)} ${n2(inaltime)}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>`));
    obiect(im, () => {
      scrie(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      scrie(p.jpeg);
      scrie("\nendstream");
    });
    obiect(ct, () => scrie(`<< /Length ${desen.length} >>\nstream\n${desen}\nendstream`));
  });
  const nObiecte = 3 + pagini.length * 3 + 1;
  const xref = lungime;
  scrie(`xref\n0 ${nObiecte}\n0000000000 65535 f \n`);
  for (let i = 1; i < nObiecte; i++) scrie(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  scrie(`trailer\n<< /Size ${nObiecte} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(lungime);
  let o = 0;
  for (const u of parti) { out.set(u, o); o += u.length; }
  return out;
}
