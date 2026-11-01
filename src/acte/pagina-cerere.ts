// The page an ask link opens (<domain>/a/#<id>.<public key>.<what is asked>, colshare-web/a/): the sender adds photos or PDFs
// from their phone, without the app; the browser shrinks photos to straight JPEG pages, packs everything, seals it to
// the asker's public key and sends it up. Nothing readable leaves the phone. Built into colshare-web/a/a.js by scripts/acte.mjs.
//
// One slot per paper asked (decisions.md 2026-10-21, "The ask page, one slot per paper"): each takes photos (front,
// back) and PDFs and is sent under the paper's name, so the asker gets "Buletin", not the phone's file name. For a
// firm's ask, a slot's photos become one PDF here, on the phone, a page each: firms file PDFs. A person's ask keeps
// the photos as pictures (the app reads ID cards from them).
import { BUCATA, citesteAdresa, curatNota, EroareRelay, MAX_BUCATI, relay, trimitInCerere } from "./link.ts";
import { lasaInUrma } from "./trecere.ts";
import { impacheteaza, type FisierPachet } from "./pachet.ts";
import { pdfDinPagini } from "../core/scanner/pdf.ts";
import aplicatie from "./aplicatie.json";
import { montezBanda, punLacat, sigiliuApasat } from "./pagina-material.ts";
import { scenaLacat } from "./seif-lacat.ts";
import { faraMiscare } from "./material.ts";
import { cifruFond } from "./cifru-fond.ts";
import { svgQr } from "../core/qr.ts";
import { piciorHtml } from "./legal.ts";
import { limbaCurenta, nr, numeCerut, punLimba, limbaPaginii, t, type Cheie } from "./limba.ts";
import { htmlTrusa } from "./truse-html.ts";
import { limbaTrusa, trusa } from "./truse.ts";
import { deschidCerereFirma, verificCertificat, type Certificat } from "./firma.ts";
import { invitatie } from "./lansare.ts";
import { editezNegru, jpegCuNegru, zoneDe } from "./editor-negru.ts";
import { desenezPaginile, type PdfJs } from "./pdf-pagini.ts";
import type { Zona } from "./copie-sigura.ts";

punLimba(limbaPaginii());
montezBanda(true);
// The link as opened, for the QR code that carries it to the phone (its key is in the fragment, as when it was shared).
const LINK = location.href;
/** A phone (a finger, a camera): the slots offer a photo; a computer (a mouse): they take files dropped on them. */
const TELEFON = matchMedia("(pointer: coarse)").matches;
const el = document.getElementById("pagina")!;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const tt = (k: Cheie, v?: Record<string, string | number>) => esc(t(k, v));
/** A paper's or a request's name as typed, shown with a capital first letter ("buletin" → "Buletin"). */
const mare = (s: string) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);
const invit = `${invitatie("a.invit")}${piciorHtml(true)}`;
const MAX = MAX_BUCATI * BUCATA - 4096;

const ICO: Record<string, string> = {
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  fisier: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>',
  ok: '<path d="M5 12l5 5L20 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  scut: '<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  lacat: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sageata: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  urc: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
  telefon: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  ascund: '<rect x="4" y="9" width="16" height="6" rx="1" fill="currentColor"/><path d="M3 5h18M3 19h18"/>',
};
const ico = (n: string) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICO[n]}</svg>`;

let adresa = citesteAdresa(location.href);
document.title = `${t("a.titlu")} · ${aplicatie.nume}`;
const r = relay("");
/** A firm's ask with a certificate that holds (./firma.ts): the firm is named as checked, not as typed. */
let firma: Certificat | undefined;

/**
 * What one slot holds: photos as JPEG pages (with a picture to show), PDFs as they are. A page with something hidden
 * keeps its original JPEG (`orig`), the boxes drawn and the code-lines switch, so it can be edited again; `date` is
 * what is sent, the black painted in.
 */
interface Piesa { tip: "jpeg" | "pdf"; nume: string; date: Uint8Array; w: number; h: number; url?: string; orig?: Blob; manual?: Zona[]; mrz?: boolean; ascunse?: number }
/** One slot per paper asked, then "something else". */
let sloturi: { nume: string; piese: Piesa[] }[] = [];
let altDeschis = false;
let numeTrimitator = "";
/** What the client writes to the firm with the papers (a firm's ask only: decisions.md 2026-10-28, "Notes on an ask"). */
let notaClient = "";
/**
 * A page being blacked out or a PDF being turned into pages: until it is done nothing is sent, added or removed, so the
 * original can't leave before its blacked-out picture replaces it (attack test 2026-10-30, N1 and N3).
 */
let ocupat = false;
/** A firm's ask (its short link): the firm reads a note sent with the papers; a person's ask has no field for one. */
const DE_LA_FIRMA = adresa?.fel === "cerere-firma";

/** A photo as a JPEG page, at most 2400 px on its long side; a PDF as it is. */
async function piesaDin(f: File): Promise<Piesa | undefined> {
  if (f.type === "application/pdf") return { tip: "pdf", nume: f.name, date: new Uint8Array(await f.arrayBuffer()), w: 0, h: 0 };
  if (!f.type.startsWith("image/")) return undefined;
  const b = await createImageBitmap(f, { imageOrientation: "from-image" });
  const k = Math.min(1, 2400 / Math.max(b.width, b.height));
  const c = document.createElement("canvas");
  c.width = Math.round(b.width * k);
  c.height = Math.round(b.height * k);
  c.getContext("2d")!.drawImage(b, 0, 0, c.width, c.height);
  b.close();
  const j = await new Promise<Blob>((ok, rau) => c.toBlob((x) => (x ? ok(x) : rau(new Error("JPEG"))), "image/jpeg", 0.88));
  return { tip: "jpeg", nume: f.name, date: new Uint8Array(await j.arrayBuffer()), w: c.width, h: c.height, url: URL.createObjectURL(j) };
}

/**
 * The files sent for the slots: a firm's slot's photos as one PDF named after the paper (its PDFs beside it); a
 * person's as pictures named after the paper ("Buletin", "Buletin 2").
 */
function fisiereDeTrimis(): FisierPachet[] {
  const out: FisierPachet[] = [];
  for (const s of sloturi) {
    const poze = s.piese.filter((p) => p.tip === "jpeg");
    const pdfuri = s.piese.filter((p) => p.tip === "pdf");
    const numar = (i: number, n: number) => (n > 1 ? `${s.nume} ${i + 1}` : s.nume);
    if (firma && poze.length) out.push({ nume: s.nume, tip: "application/pdf", date: pdfDinPagini(poze.map((p) => ({ jpeg: p.date, w: p.w, h: p.h })), s.nume) });
    else poze.forEach((p, i) => out.push({ nume: numar(i, poze.length), tip: "image/jpeg", date: p.date }));
    const fara = firma && poze.length ? 1 : 0;
    pdfuri.forEach((p, i) => out.push({ nume: numar(i + fara, pdfuri.length + fara), tip: "application/pdf", date: p.date }));
  }
  return out;
}

/** How many papers arrive, as fisiereDeTrimis makes them (a firm's photos in one slot are one PDF), without making them. */
const numarActe = () => sloturi.reduce((x, s) => {
  const poze = s.piese.filter((p) => p.tip === "jpeg").length;
  return x + (firma ? Math.min(poze, 1) : poze) + s.piese.length - poze;
}, 0);

function eroare(e: unknown): string {
  const cod = e instanceof EroareRelay ? e.cod : undefined;
  const k: Cheie = cod === "inchisa" ? "a.inchisa" : cod === "plina" ? "pg.plina" : cod === "rata" ? "pg.rata" : cod === "oprit" ? "pg.oprit"
    : e instanceof EroareRelay && e.status === 413 ? "pg.mare" : e instanceof EroareRelay && e.status === 0 ? "pg.retea" : "pg.server";
  return t(k);
}

const initiale = (s: string) => (s.trim().split(/\s+/).filter((x) => /\p{L}|\d/u.test(x)).slice(0, 2).map((x) => [...x][0]).join("") || "?").toUpperCase();

/** Who asks: a firm checked (its name, tax ID, the register), or the name typed, said as theirs. */
function cineCere(): string {
  if (!adresa || adresa.fel !== "cerere") return "";
  // The firm's letterhead, laid over the band's edge: its initials in a ring of the seal's ochre, its checked name.
  if (firma) {
    return `<div class="cine-cere firma"><span class="avatar-firma">${esc(initiale(firma.firma))}</span>
      <span class="cine-text"><b>${esc(firma.firma)}</b><small class="verificata">${ico("scut")}${tt("a.verificata", { cui: firma.cui })}</small></span></div>`;
  }
  return "";
}

/** On a computer: the same request on the phone, by its QR code, to photograph the papers there. */
function laTelefon(): string {
  if (TELEFON) return "";
  return `<div class="la-telefon"><span class="qr-mic">${svgQr(LINK, 140)}</span><span class="la-telefon-text"><b>${ico("telefon")}${tt("a.qr.titlu")}</b><small>${tt("a.qr.text")}</small></span></div>`;
}

/** A person's ask: the name they typed, said as theirs, in the same note as the warning (one note, not three lines). */
function atentie(): string {
  if (!adresa || adresa.fel !== "cerere" || firma) return "";
  return `<p class="banda">${adresa.text.de ? `${tt("a.cine", { nume: adresa.text.de })} ${tt("a.niciodata", { app: aplicatie.nume })}` : tt("a.atentie", { app: aplicatie.nume })}</p>`;
}

/** Slots filled at the last drawing: one just filled gets its tick with a small pop, once. */
let umplute = new Set<number>();

function slotHtml(s: { nume: string; piese: Piesa[] }, i: number): string {
  const n = s.piese.length;
  const pagini = s.piese.reduce((x, p) => x + (p.tip === "jpeg" ? 1 : 0), 0);
  // A page can have part of it hidden (./editor-negru.ts); a PDF is first turned into pages for that.
  const piese = s.piese.map((p, j) => `<span class="piesa">${p.url ? `<img src="${p.url}" alt="">` : `<span class="piesa-pdf">${ico("fisier")}<em>PDF</em></span>`}
    ${p.tip === "jpeg" ? `<button class="piesa-ascund" data-ascund="${i}:${j}" aria-label="${tt("a.ascund")}">${ico("ascund")}${p.ascunse ? p.ascunse : ""}</button>` : ""}
    <button class="piesa-x" data-scot="${i}:${j}" aria-label="${tt("a.sterg")}">${ico("x")}</button></span>`).join("");
  const areaPdf = s.piese.some((p) => p.tip === "pdf");
  const alege = `<input type="file" data-slot="${i}" accept="image/*,application/pdf" multiple hidden>`;
  // A phone photographs (the camera first) or chooses; a computer takes files dropped on the card, or chosen.
  const actiuni = TELEFON
    ? `<div class="slot-actiuni"><label class="buton-slot" tabindex="0" role="button">${ico("camera")}${tt(n ? "a.alta-poza" : "a.fotografiez")}<input type="file" data-slot="${i}" accept="image/*" capture="environment" hidden></label>
      <label class="buton-slot" tabindex="0" role="button">${ico("fisier")}${tt("a.aleg")}${alege}</label></div>`
    : `<label class="cadere${n ? " mica" : ""}" tabindex="0" role="button">${ico("urc")}<span>${tt("a.trage")} <u>${tt("a.trage.alege")}</u></span>${n ? "" : `<small>${tt("a.trage.tipuri")}</small>`}${alege}</label>`;
  return `<li class="slot${n ? " plin" : ""}${n && !umplute.has(i) ? " nou" : ""}" data-loc="${i}">
    <div class="slot-cap"><span class="slot-bifa">${n ? ico("ok") : i + 1}</span>
      <span class="slot-nume"><b>${esc(mare(s.nume))}</b>${n ? `<small>${pagini && firma ? tt(pagini === 1 ? "a.pagina" : "a.pagini", { n: pagini }) : tt(n === 1 ? "a.fisier" : "a.fisiere", { n })}</small>` : ""}</span></div>
    ${n ? `<div class="piese">${piese}</div>` : ""}
    ${n && !areaPdf ? `<p class="mic sfat-ascund">${tt("a.ascund.sfat")}</p>` : ""}
    ${areaPdf ? `<button class="buton-pagini" data-pagini="${i}">${ico("ascund")}${tt("a.pdf.pagini")}</button>` : ""}
    ${actiuni}
  </li>`;
}

/** Files into a slot (chosen, photographed or dropped), then the page drawn again. */
async function adaugInSlot(i: number, fisiere: Iterable<File>): Promise<void> {
  const s = sloturi[i];
  if (!s || ocupat) return;
  for (const f of fisiere) {
    const p = await piesaDin(f).catch(() => undefined);
    if (p) s.piese.push(p);
  }
  formular();
}

function formular(mesaj?: string) {
  if (!adresa || adresa.fel !== "cerere") return;
  const { titlu, ce } = adresa.text;
  // The list the ask follows (./truse.ts): what the law allows for this use, for the person asked.
  const trusaCerere = trusa(adresa.text.k);
  if (!sloturi.length) {
    sloturi = ce.length ? ce.map((x) => ({ nume: numeCerut(x), piese: [] })) : [{ nume: titlu || t("a.acte"), piese: [] }];
    if (ce.length) sloturi.push({ nume: t("a.alt"), piese: [] });
  }
  const ultim = ce.length ? sloturi.length - 1 : -1;
  const vizibile = sloturi.map((s, i) => ({ s, i })).filter(({ s, i }) => i !== ultim || altDeschis || s.piese.length);
  const total = numarActe();
  // A checked firm is named in the tab too, as on the page.
  if (firma) document.title = `${t("a.titlu.firma", { firma: firma.firma })} · ${aplicatie.nume}`;
  const gata = sloturi.slice(0, ce.length || 1).filter((s) => s.piese.length).length;
  // The name and the list come from whoever made the link: a person's said as theirs, with a warning above the upload
  // (anyone can make a link that names a bank; security audit 2026-10-20). A firm's is checked.
  // A letter on the left (who asks, what for, the safety note, the phone's QR on a computer), the papers on the right;
  // one column on a phone.
  el.innerHTML = `<div class="pg-cerere">
    <div class="cerere-scrisoare">
    ${cineCere()}
    <h1>${esc(firma ? (ce.length ? nr(ce.length, "a.cerut.unu", "a.cerut.n", { firma: firma.firma }) : t("a.titlu.firma", { firma: firma.firma })) : t("a.titlu"))}</h1>
    ${titlu ? `<p class="cerere-pentru">${tt("a.pentru", { titlu: mare(titlu) })}</p>` : ""}
    ${adresa.text.nota ? `<figure class="cerere-nota"><figcaption>${firma ? tt("a.nota.firma", { firma: firma.firma }) : tt("a.nota")}</figcaption><p>${esc(adresa.text.nota)}</p></figure>` : ""}
    <p class="cerere-sub">${firma ? tt("a.sub.firma") : tt("a.sub")}</p>
    ${trusaCerere ? `<details class="card card-trusa"><summary>${tt("trusa.urmeaza", { nume: trusaCerere.scurt[limbaTrusa(limbaCurenta())] })}</summary>${htmlTrusa(trusaCerere, 3)}</details>` : ""}
    ${atentie()}
    <p class="criptat">${ico("lacat")}${firma ? tt("a.criptat.firma", { firma: firma.firma }) : tt("a.criptat")}</p>
    ${laTelefon()}
    </div>
    <div class="cerere-acte">
    ${ce.length > 1 ? `<p class="cerere-progres"><span style="width:${Math.round((gata / ce.length) * 100)}%"></span></p><p class="cerere-numar">${tt("a.din", { n: gata, din: ce.length })}</p>` : ""}
    <ul class="sloturi">${vizibile.map(({ s, i }) => slotHtml(s, i)).join("")}</ul>
    ${ultim >= 0 && !altDeschis && !sloturi[ultim].piese.length ? `<button class="buton-text" id="alt">${ico("plus")}${tt("a.adaug.alt")}</button>` : ""}
    <p class="mic sfat">${tt("a.sfat")} <a href="/copie/" target="_blank" rel="noopener">${tt("a.sfat.link")}</a></p>
    ${firma ? "" : `<label class="camp-text">${tt("a.de")}<input id="de" maxlength="120" autocomplete="name" value="${esc(numeTrimitator)}"></label>`}
    ${DE_LA_FIRMA ? `<label class="camp-text">${firma ? tt("a.mesaj", { firma: firma.firma }) : tt("a.mesaj.gol")}<textarea id="mesaj" rows="3" maxlength="500" placeholder="${tt("a.mesaj.loc")}">${esc(notaClient)}</textarea></label>` : ""}
    ${mesaj ? `<p class="banda rau">${esc(mesaj)}</p>` : ""}
    <button class="buton-sigiliu" id="trimit"${total ? "" : " disabled"}>${ico("lacat")}<span>${total ? tt(total === 1 ? "a.trimit.unu" : "a.trimit.n", { n: total }) : tt("a.trimit")}</span>${ico("sageata")}</button>
    </div>
  </div>${invit}`;
  umplute = new Set(sloturi.map((s, i) => (s.piese.length ? i : -1)).filter((i) => i >= 0));
  if (ocupat) for (const x of el.querySelectorAll<HTMLButtonElement | HTMLInputElement>(".cerere-acte button, .cerere-acte input")) x.disabled = true;
  for (const x of el.querySelectorAll<HTMLInputElement>("input[data-slot]")) {
    x.addEventListener("change", () => void adaugInSlot(Number(x.dataset.slot), x.files ?? []));
  }
  // The file inputs are hidden in their labels: the labels take the keyboard, Enter or Space opening the chooser.
  for (const l of el.querySelectorAll<HTMLLabelElement>("label[role=button]")) {
    l.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      l.querySelector<HTMLInputElement>("input[type=file]")?.click();
    });
  }
  // Files dragged from the computer onto a paper's card go into that paper.
  for (const li of el.querySelectorAll<HTMLElement>(".slot[data-loc]")) {
    li.addEventListener("dragover", (e) => { e.preventDefault(); li.classList.add("peste"); });
    li.addEventListener("dragleave", (e) => { if (!li.contains(e.relatedTarget as Node)) li.classList.remove("peste"); });
    li.addEventListener("drop", (e) => {
      e.preventDefault();
      li.classList.remove("peste");
      if (e.dataTransfer?.files.length) void adaugInSlot(Number(li.dataset.loc), e.dataTransfer.files);
    });
  }
  for (const b of el.querySelectorAll<HTMLButtonElement>("[data-scot]")) {
    b.addEventListener("click", () => {
      if (ocupat) return;
      const [i, j] = b.dataset.scot!.split(":").map(Number);
      const [p] = sloturi[i].piese.splice(j, 1);
      if (p?.url) URL.revokeObjectURL(p.url);
      formular();
    });
  }
  for (const b of el.querySelectorAll<HTMLButtonElement>("[data-ascund]")) {
    b.addEventListener("click", () => {
      const [i, j] = b.dataset.ascund!.split(":").map(Number);
      void ascundIn(i, j);
    });
  }
  for (const b of el.querySelectorAll<HTMLButtonElement>("[data-pagini]")) b.addEventListener("click", () => void inPagini(Number(b.dataset.pagini)));
  document.getElementById("alt")?.addEventListener("click", () => { altDeschis = true; formular(); });
  // A firm's request has no name field: the firm named its client when it made the link.
  const de = document.getElementById("de") as HTMLInputElement | null;
  de?.addEventListener("input", () => { numeTrimitator = de.value; });
  const m = document.getElementById("mesaj") as HTMLTextAreaElement | null;
  m?.addEventListener("input", () => { notaClient = m.value; });
  document.getElementById("trimit")!.addEventListener("click", trimit);
}

/**
 * Part of a page hidden (decisions.md 2026-10-30, "Black out on the ask page"): the editor over its original picture,
 * then what is sent is drawn again with the black painted in. Nothing hidden leaves the device.
 */
async function ascundIn(i: number, j: number): Promise<void> {
  const p = sloturi[i]?.piese[j];
  if (!p || p.tip !== "jpeg" || ocupat) return;
  ocupat = true;
  formular();
  p.orig ??= new Blob([p.date as BlobPart], { type: "image/jpeg" });
  const img = await createImageBitmap(p.orig).catch(() => undefined);
  if (!img) { ocupat = false; formular(); return; }
  try {
    const r = await editezNegru(img, p.manual ?? [], p.mrz ?? false, {
      titlu: t("a.ascund.titlu"), text: t("a.ascund.text"), mrz: t("copie.mrz"), anulez: t("copie.anulez"), gata: t("a.ascund.gata"), renunt: t("a.ascund.renunt"),
      mareste: t("editor.mareste"), micsoreaza: t("editor.micsoreaza"), potrivesc: t("editor.potrivesc"),
    });
    if (!r) return;
    const zone = zoneDe(img, r.manual, r.mrz);
    const nou = zone.length ? await jpegCuNegru(img, zone) : { date: new Uint8Array(await p.orig.arrayBuffer()), w: img.width, h: img.height, blob: p.orig };
    if (p.url) URL.revokeObjectURL(p.url);
    Object.assign(p, { date: nou.date, w: nou.w, h: nou.h, url: URL.createObjectURL(nou.blob), manual: r.manual, mrz: r.mrz, ascunse: zone.length });
  } finally {
    img.close();
    ocupat = false;
    formular();
  }
}

/** pdf.js, from the desk's files on this site, the first time a PDF is turned into pages here. */
let pdfjs: Promise<PdfJs> | undefined;
function incarcPdfJs(): Promise<PdfJs> {
  const baza = new URL("/birou/pdf/", location.href).href;
  pdfjs ??= (import(/* @vite-ignore */ `${baza}pdf.min.mjs`) as Promise<PdfJs & { GlobalWorkerOptions: { workerSrc: string } }>).then((m) => {
    m.GlobalWorkerOptions.workerSrc = `${baza}pdf.worker.min.mjs`;
    return m;
  });
  pdfjs.catch(() => { pdfjs = undefined; });
  return pdfjs;
}
/** The most pages a PDF is turned into here. */
const PAGINI_PDF = 30;

/** A slot's PDFs turned into pages (pictures), each of which can then have part of it hidden. */
async function inPagini(i: number): Promise<void> {
  const s = sloturi[i];
  if (!s || ocupat) return;
  ocupat = true;
  formular(t("a.pdf.lucrez"));
  try {
    const piese: Piesa[] = [];
    for (const p of s.piese) {
      if (p.tip !== "pdf") { piese.push(p); continue; }
      const pagini: Piesa[] = [];
      const total = await desenezPaginile(await incarcPdfJs(), p.date, (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h }), async (c, n) => {
        const blob = await new Promise<Blob>((ok, rau) => c.toBlob((x) => (x ? ok(x) : rau(new Error("JPEG"))), "image/jpeg", 0.88));
        pagini.push({ tip: "jpeg", nume: `${p.nume} ${n}`, date: new Uint8Array(await blob.arrayBuffer()), w: c.width, h: c.height, url: URL.createObjectURL(blob) });
        c.width = c.height = 0;
      }, { latura: 2000, maxPagini: PAGINI_PDF + 1 });
      if (total > PAGINI_PDF) throw new Error("pagini");
      piese.push(...pagini);
    }
    s.piese = piese;
    ocupat = false;
    formular();
  } catch (e) {
    console.warn(e);
    ocupat = false;
    formular(t("a.pdf.eroare"));
  }
}

/** "Not sent yet: X, Y." with each paper a button back to its card. */
function lipsaHtml(lipsa: { nume: string; i: number }[]): string {
  const [a, b = ""] = t("a.lipsa", { lista: "\u0001" }).split("\u0001");
  return `${esc(a)}${lipsa.map(({ nume, i }) => `<button class="buton-legatura" data-lipsa="${i}">${esc(nume)}</button>`).join(", ")}${esc(b)}`;
}

/** Back to the form at one paper's card, lit for a moment. */
function laSlot(i: number): void {
  formular();
  const li = el.querySelector<HTMLElement>(`.slot[data-loc="${i}"]`);
  if (!li) return;
  li.scrollIntoView({ block: "center", behavior: faraMiscare() ? "auto" : "smooth" });
  li.classList.add("aratat");
  setTimeout(() => li.classList.remove("aratat"), 1600);
}

async function trimit() {
  if (!adresa || adresa.fel !== "cerere" || ocupat) return;
  const fisiere = fisiereDeTrimis();
  if (!fisiere.length) { formular(t("a.gol")); return; }
  const de = numeTrimitator.trim();
  const nota = DE_LA_FIRMA ? curatNota(notaClient) : "";
  const pachet = impacheteaza({ titlu: adresa.text.titlu, ...(de ? { de } : {}), ...(nota ? { nota } : {}), fisiere });
  if (pachet.length > MAX) { formular(t("pg.mare")); return; }
  // Sealing: the app's entrance lock on the night card, its tape running through the slit, dialled a notch a sixth as the
  // bytes go up.
  const lacat = scenaLacat();
  let notch = 0;
  el.innerHTML = `<div class="pg-cerere trimit-acum"><div class="loc-lacat"></div><p class="progres" id="progres">${tt("a.lucrez", { p: 0 })}</p>
    <p class="bara-progres"><span id="bara" style="width:0%"></span></p></div>`;
  punLacat(el, lacat);
  const opresteCifru = () => lacat.opreste();
  try {
    // A small send still lets the dial be seen turning before the card says it is sealed.
    const rabda = new Promise((ok) => setTimeout(ok, faraMiscare() ? 0 : 900));
    await trimitInCerere(r, adresa.id, adresa.publica, pachet, (p) => {
      const x = document.getElementById("progres");
      if (x) x.textContent = t("a.lucrez", { p: Math.round(p * 100) });
      const b = document.getElementById("bara");
      if (b) b.style.width = `${Math.round(p * 100)}%`;
      const n = Math.min(6, Math.floor(p * 6));
      if (n > notch) lacat.tasta((notch = n));
    });
    await rabda;
    const trimise = fisiere.map((f) => f.nume);
    // What was asked and not sent: said once, so "Send more" has a reason.
    const lipsa = adresa.text.ce.map((x, i) => ({ nume: mare(numeCerut(x)), i })).filter(({ i }) => !sloturi[i]?.piese.length);
    for (const s of sloturi) for (const p of s.piese) if (p.url) URL.revokeObjectURL(p.url);
    sloturi = [];
    altDeschis = false;
    notaClient = "";
    // Sealed and sent: on the same night card, the seal comes down whole on what went, over the field now still. The
    // sending card fades out under it instead of being swapped in one frame (motion audit 2026-11-01, L5).
    const carte = el.firstElementChild;
    if (carte && !faraMiscare()) lasaInUrma(carte, "trec-alaturi", 220);
    opresteCifru();
    el.innerHTML = `<div class="pg-cerere trimis">
      <section class="sigilat"><canvas class="cifru-trimit" aria-hidden="true"></canvas>
      ${sigiliuApasat(132)}
      <h1>${firma ? tt("a.gata.firma", { firma: firma.firma }) : tt("a.gata")}</h1>
      <ul class="trimise">${trimise.map((n) => `<li>${ico("fisier")}<span>${esc(mare(n))}</span></li>`).join("")}</ul>
      <p class="sigilat-text">${tt(firma ? "a.trimis.firma" : "a.trimis")}</p></section>
      ${lipsa.length ? `<p class="banda lipsa">${lipsaHtml(lipsa)}</p>` : ""}
      <button class="buton-ton" id="inca">${ico("plus")}${tt("a.inca")}</button></div>${invit}`;
    cifruFond(el.querySelector<HTMLCanvasElement>(".sigilat .cifru-trimit")!, { alfa: 0.09 });
    document.getElementById("inca")!.addEventListener("click", () => formular());
    for (const b of el.querySelectorAll<HTMLButtonElement>("[data-lipsa]")) b.addEventListener("click", () => laSlot(Number(b.dataset.lipsa)));
  } catch (e) {
    opresteCifru();
    formular(eroare(e));
  }
}

const inchisa = () => { el.innerHTML = `<div class="pg-cerere"><h1>${tt("a.titlu")}</h1><p class="banda rau">${tt("a.inchisa")}</p></div>${invit}`; };

async function pornesc(): Promise<void> {
  // A firm's short link (./firma.ts): what it asks comes from the relay, decrypted with the key in the fragment, and
  // the firm is checked before anything is shown.
  if (adresa?.fel === "cerere-firma") {
    el.innerHTML = `<div class="pg-cerere"><p class="progres">${tt("a.incarc")}</p></div>`;
    try {
      adresa = await deschidCerereFirma(r, adresa.id, adresa.cheie);
    } catch (e) {
      if (e instanceof EroareRelay && e.cod === "inchisa") return inchisa();
      el.innerHTML = `<div class="pg-cerere"><h1>${tt("a.titlu")}</h1><p class="banda rau">${esc(eroare(e))}</p></div>${invit}`;
      return;
    }
    if (adresa?.fel === "cerere") firma = await verificCertificat(adresa.certificat, adresa.publica);
  }
  if (!adresa || adresa.fel !== "cerere") {
    el.innerHTML = `<div class="pg-cerere"><h1>${tt("a.titlu")}</h1><p>${tt("a.fara-link")}</p></div>${invit}`;
    return;
  }
  // A long link's certificate checked on this device, and an ask closed or expired said before anything is added.
  // Both are waited for a moment before the form is drawn, so it does not come up and change at once into "closed"
  // or into the firm's form (2026-10-25); answers later than that change it as before.
  const cert = adresa.certificat && !firma ? verificCertificat(adresa.certificat, adresa.publica).then((c) => { firma = c; return c; }) : Promise.resolve(undefined);
  const info = r("cerere-info", { id: adresa.id }).then(() => undefined, (e: unknown) => e ?? new Error());
  const raspuns = (e: unknown) => {
    if (e instanceof EroareRelay && e.cod === "inchisa") inchisa();
    else formular(eroare(e));
  };
  const gata = await Promise.race([Promise.all([cert, info]).then(([, e]) => ({ e })), new Promise<null>((ok) => setTimeout(() => ok(null), 800))]);
  if (gata?.e) { raspuns(gata.e); return; }
  formular();
  if (gata) return;
  void cert.then((c) => { if (c) formular(); });
  void info.then((e) => { if (e) raspuns(e); });
}
void pornesc();
