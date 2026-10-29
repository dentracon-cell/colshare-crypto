// A PDF a client sent, made inert before a firm keeps it (security audit 2026-10-25, B6): a request link is meant to
// be shared, so anyone holding one can send a PDF that runs JavaScript, launches a program or carries files when a
// clerk opens it in their own reader. The desk's viewer draws pages only; a download, the ZIP and the single PDF are
// opened elsewhere. What acts is taken out: the document's opening and page actions, its named scripts and attached
// files, its form, and every annotation (links and widgets are where actions sit). Pages, pictures and text stay.
import { PDFDocument, PDFName } from "pdf-lib";

/** What in a PDF's bytes can act, or hide where a plain read of the bytes doesn't see it (object streams, names in hex). */
const ACTIVE = /\/(JavaScript|JS|OpenAction|AA|Launch|EmbeddedFiles?|RichMedia|XFA|SubmitForm|ImportData|GoToR|GoToE|ObjStm|AcroForm|Annots)\b|\/[A-Za-z]*#[0-9A-Fa-f]{2}/;

/** A PDF that pdf-lib can't read and nothing could draw: it is not handed out as it came (second round, C2). */
export class PdfNecitit extends Error {}

/** A page drawn as a picture, for a PDF pdf-lib can't read. */
export interface PozaPagina { jpeg: Uint8Array; w: number; h: number }

/**
 * The PDF without what acts; the same bytes when nothing in it can act (a safe copy's proof still checks). One that can
 * act is rebuilt: its pages copied into a new document, without their annotations and actions, so nothing the old
 * document carried around them (bookmarks with actions, named scripts, attached files, its form) comes along (security
 * audit 2026-10-25, second round, C2: bookmarks kept their JavaScript). One pdf-lib can't read is drawn as pictures by
 * `poze` when given; without it, or when that fails too, PdfNecitit is thrown.
 */
export async function curatPdf(b: Uint8Array, poze?: (b: Uint8Array) => Promise<PozaPagina[]>): Promise<Uint8Array> {
  if (!ACTIVE.test(new TextDecoder("latin1").decode(b))) return b;
  let curat: Uint8Array;
  try {
    curat = await refac(b);
  } catch {
    // pdf-lib reads some broken files without a word and fails only on their pages: either way, pictures or nothing.
    return await caPoze(b, poze);
  }
  return curat;
}

async function refac(b: Uint8Array): Promise<Uint8Array> {
  const sursa = await PDFDocument.load(b, { ignoreEncryption: true, updateMetadata: false });
  const doc = await PDFDocument.create({ updateMetadata: false });
  // Taken off the pages before they are copied, so nothing they pointed at is copied into the new file.
  for (const p of sursa.getPages()) for (const k of ["Annots", "AA"]) p.node.delete(PDFName.of(k));
  for (const p of await doc.copyPages(sursa, sursa.getPageIndices())) doc.addPage(p);
  if (!doc.getPageCount()) throw new PdfNecitit("No pages.");
  return await doc.save({ useObjectStreams: false });
}

async function caPoze(b: Uint8Array, poze?: (b: Uint8Array) => Promise<PozaPagina[]>): Promise<Uint8Array> {
  const pagini = poze ? await poze(b).catch(() => []) : [];
  if (!pagini.length) throw new PdfNecitit("This PDF can't be read.");
  const doc = await PDFDocument.create();
  for (const p of pagini) {
    const img = await doc.embedJpg(p.jpeg);
    doc.addPage([p.w, p.h]).drawImage(img, { x: 0, y: 0, width: p.w, height: p.h });
  }
  return await doc.save();
}
