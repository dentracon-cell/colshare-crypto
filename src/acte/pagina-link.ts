// The page a send link opens (<domain>/p/#<id>.<key>, colshare-web/p/): it reads the key from the fragment, which the browser
// never sends to a server, fetches the encrypted package after a tap, decrypts it here, offers each paper to save and
// tells the relay to delete it. Built into colshare-web/p/p.js by scripts/acte.mjs.
import { despacheteaza, type FisierPachet } from "./pachet.ts";
import { citesteAdresa, deschidLink, EroareRelay, relay } from "./link.ts";
import { deschidFataFirma, type FataFirma } from "./firma.ts";
import aplicatie from "./aplicatie.json";
import { sigiliuSvg } from "./sigiliu.ts";
import { montezScena, punLacat } from "./pagina-material.ts";
import { faraMiscare } from "./material.ts";
import { scenaLacat } from "./seif-lacat.ts";
import { piciorHtml } from "./legal.ts";
import { punLimba, limbaPaginii, t, type Cheie } from "./limba.ts";
import { invitatie } from "./lansare.ts";
import { imagineSigura } from "./marime-imagine.ts";
import { desenezPaginile, type PdfJs } from "./pdf-pagini.ts";

punLimba(limbaPaginii());
// One night scene above the paper carries the whole opening: the app's entrance lock waiting (a hand or the mouse turns its
// dial), dialled and sprung open as the papers come down, then the scene folded to a band.
const scena = montezScena();
let lacat = scenaLacat();
const el = document.getElementById("pagina")!;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const tt = (k: Cheie, v?: Record<string, string | number>) => esc(t(k, v));
/** A sentence with one of its values picked out in bold (the name), the rest escaped as usual. */
function cuNume(k: Cheie, v: Record<string, string>, camp: string): string {
  const [a, b = ""] = t(k, { ...v, [camp]: "\u0001" }).split("\u0001");
  return `${esc(a)}<b>${esc(v[camp])}</b>${esc(b)}`;
}
const invit = () => `${invitatie("p.invit")}${piciorHtml(true)}`;

const adresa = citesteAdresa(location.href);
// The key leaves the address bar (and the history) as soon as it is read.
if (location.hash) history.replaceState(null, "", location.pathname);
document.title = `${t("p.titlu")} · ${aplicatie.nume}`;

function arata(html: string) {
  el.innerHTML = html;
}
/**
 * What the scene shows (the seal and its words); `jos`: what the paper under it shows. A lock already in the scene
 * stays where it is and only the words round it change: put back, it faded in again and its tape restarted (motion
 * audit 2026-11-01, L3).
 */
function inScena(html: string, jos = invit()) {
  const c = scena.continut;
  if (lacat.el.parentElement === c && html.includes('class="loc-lacat"')) {
    const t = document.createElement("template");
    t.innerHTML = html;
    const loc = t.content.querySelector(".loc-lacat")!, inainte: Node[] = [], dupa: Node[] = [];
    let trecut = false;
    for (const n of Array.from(t.content.childNodes)) { if (n === loc) trecut = true; else (trecut ? dupa : inainte).push(n); }
    for (const n of Array.from(c.childNodes)) if (n !== lacat.el) n.remove();
    lacat.el.before(...inainte);
    lacat.el.after(...dupa);
  } else {
    c.innerHTML = html;
    punLacat(c, lacat);
  }
  arata(jos);
}

/** `dinNou`: tries the opening again (the key is still in memory: the address bar no longer has it). */
function eroare(e: unknown, dinNou?: () => void) {
  const cod = e instanceof EroareRelay ? e.cod : undefined;
  // A link used or gone is a fact, not an error: the mark says it (the halves parted, or an empty outline).
  scena.cifru(false);
  document.querySelector(".pagina-link")?.classList.remove("in-asteptare");
  // The lock leaves the scene: its frames and listeners stop, and a retry dials a fresh one.
  lacat.opreste();
  lacat = scenaLacat();
  if (cod === "deschis" || cod === "sters" || cod === "scos" || cod === "lipsa") {
    const deschis = cod === "deschis";
    inScena(`<span class="sigiliu-scena">${sigiliuSvg(deschis ? "deschis" : "expirat", { px: 132 })}</span>
      <h1>${tt(deschis ? "p.deschis.titlu" : "p.sters.titlu")}</h1><p class="scena-text">${tt(deschis ? "p.deschis.text" : cod === "sters" ? "p.sters" : cod === "scos" ? "p.scos" : "p.lipsa")}</p>`);
    return;
  }
  const k: Cheie = cod === "cheie" ? "p.cheie"
    : e instanceof EroareRelay && e.status === 0 ? "pg.retea" : cod === "rata" ? "pg.rata" : cod === "oprit" ? "pg.oprit" : "pg.server";
  inScena(`<span class="sigiliu-scena">${sigiliuSvg("intreg", { px: 132 })}</span><h1>${tt("p.titlu")}</h1><p class="banda rau" role="alert">${tt(k)}</p>
    ${dinNou && k !== "p.cheie" ? `<button class="buton-sigiliu" id="reincerc">${tt("pg.reincerc")}</button>` : ""}`);
  if (dinNou) document.getElementById("reincerc")?.addEventListener("click", dinNou);
}

/** The proof a safe copy carries in its PDF (./dovada.ts `CHEIE_PDF`), looked for as bytes: the check itself is /v/'s. */
const DOVADA = new TextEncoder().encode("/ColshareProof (");
function cuDovada(f: FisierPachet): boolean {
  if (f.tip !== "application/pdf") return false;
  const d = f.date;
  outer: for (let i = 0; i <= d.length - DOVADA.length; i++) {
    for (let j = 0; j < DOVADA.length; j++) if (d[i + j] !== DOVADA[j]) continue outer;
    return true;
  }
  return false;
}

const ICO: Record<string, string> = {
  lacat: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  sageata: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  jos: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  ochi: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  ceas: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  foi: '<path d="M8 3h8l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M4 7v12a3 3 0 0 0 3 3h9"/>',
};
const ico = (n: string) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICO[n]}</svg>`;

/** A size as people read it on a file. */
const marime = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(/\.0$/, "")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * The papers, out of their envelope: a docket line (how many, how large), then each a numbered tile with its picture or
 * kind, its name, its kind and size (a safe copy says where it is checked), View and Save; Save all under them. They
 * rise in one after the other, and a paper saved is ticked off on its tile.
 */
function lista(titlu: string | undefined, fisiere: FisierPachet[], cine = "") {
  const urls = fisiere.map((f) => URL.createObjectURL(new Blob([f.date as BlobPart], { type: f.tip })));
  // A safe copy says where it can be checked, under its name.
  const verific = (f: FisierPachet) => (cuDovada(f) ? `<small><a href="/v/" target="_blank" rel="noopener">${tt("p.verific")}</a></small>` : "");
  const fel = (f: FisierPachet) => (f.tip === "application/pdf" ? "PDF" : f.tip === "image/png" ? "PNG" : f.tip === "image/webp" ? "WEBP" : "JPG");
  // A picture shows itself on its tile; a PDF keeps the sheet with its kind. A picture whose header declares a huge size
  // (or says none) is never decoded on the page: no tile and no View, only Save (attack test 2026-10-29, H1).
  const poza = (f: FisierPachet) => f.tip.startsWith("image/") && imagineSigura(f.date);
  const chip = (f: FisierPachet, i: number) => (poza(f)
    ? `<span class="hartie-fel poza"><img src="${urls[i]}" alt=""><em>${fel(f)}</em></span>`
    : `<span class="hartie-fel">${fel(f)}</span>`);
  // One ochre button leads: Save all when there are several, each Save when there is one.
  const salvez = fisiere.length > 1 ? "buton-ton" : "buton-sigiliu mic";
  // The scene folds to the band the other link pages have ("colshare PAPERS"); the heading, who sent them, their note
  // and the papers are on the page below, left-aligned, with nothing drawn behind them (2026-10-31, "too much clutter").
  scena.cifru(false);
  lacat.opreste();
  scena.restrang(t("p.eticheta"));
  scena.continut.innerHTML = "";
  document.querySelector(".pagina-link")?.classList.remove("in-asteptare");
  const nr = (i: number) => String(i + 1).padStart(2, "0");
  const unul = fisiere.length === 1;
  arata(`<div class="p-deschis"><h1>${tt("p.titlu")}</h1>${cine}${titlu ? `<p class="nota">${tt("p.de-la", { titlu })}</p>` : ""}
    <p class="p-salveaza" role="note">${ico("ceas")}<span>${tt("p.salveaza")}</span></p>
    <ul class="hartii${unul ? " unul" : ""}">${fisiere.map((f, i) => `<li style="--i:${i}" data-hartie="${i}"><span class="hartie-nr" aria-hidden="true">${nr(i)}</span>${chip(f, i)}<span class="hartie-text"><b>${esc(f.nume)}</b><span class="hartie-meta">${fel(f)} · ${marime(f.date.length)}</span>${verific(f)}</span>
      <span class="hartie-act">${f.tip.startsWith("image/") && !poza(f) ? "" : `<button type="button" class="buton-ton" data-vad="${i}">${ico("ochi")}<span>${tt("p.vad")}</span></button>`}
      <a class="${salvez}" href="${urls[i]}" download="${esc(f.nume)}">${ico("jos")}<span>${tt("p.descarc")}</span></a></span></li>`).join("")}</ul>
    ${fisiere.length > 1 ? `<button class="buton-sigiliu" id="toate">${ico("jos")}${tt("p.toate")}</button>` : ""}</div>${invit()}`);
  // A paper saved is ticked off on its tile, so a long list shows what is still to save.
  const bifez = (a: HTMLAnchorElement) => {
    const li = a.closest("li");
    if (!li || li.classList.contains("salvat")) return;
    li.classList.add("salvat");
    a.querySelector("svg")!.outerHTML = ico("ok");
  };
  for (const a of el.querySelectorAll<HTMLAnchorElement>("a[download]")) a.addEventListener("click", () => bifez(a));
  for (const b of el.querySelectorAll<HTMLButtonElement>("[data-vad]")) {
    const i = Number(b.dataset.vad);
    b.addEventListener("click", () => vad(fisiere[i], urls[i], () => bifez(el.querySelector<HTMLAnchorElement>(`[data-hartie="${i}"] a[download]`)!), b));
  }
  // Measured again once the title font is in, since a fallback font is narrower.
  const titluH = el.querySelector<HTMLElement>(".p-deschis h1");
  potrivescTitlul(titluH);
  void document.fonts?.ready.then(() => potrivescTitlul(titluH));
  document.getElementById("toate")?.addEventListener("click", () => {
    for (const a of el.querySelectorAll<HTMLAnchorElement>("a[download]")) a.click();
  });
}

/** pdf.js, from the desk's files on this site, the first time a PDF is looked at here (as the ask page loads it). */
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
/** The most pages a PDF shows here; Save keeps the whole file. */
const PAGINI_VAD = 100;

/**
 * A paper looked at on this page, before it is saved. "View" used to open the file in a new tab, which a phone's
 * browser turns into a download for a PDF (Android's Chrome has no PDF reader) and an app's in-app browser may not open
 * at all. Now the page shows it over itself: a picture as it is, a PDF drawn page by page by pdf.js, nothing kept once
 * it closes. Save stays in its bar. If pdf.js cannot be loaded, the file opens in a new tab as before.
 */
function vad(f: FisierPachet, url: string, salvat: () => void, inapoi: HTMLElement) {
  const pdf = f.tip === "application/pdf";
  const v = document.createElement("div");
  v.className = "p-vad";
  v.setAttribute("role", "dialog");
  v.setAttribute("aria-modal", "true");
  v.setAttribute("aria-label", f.nume);
  v.innerHTML = `<header class="p-vad-cap"><b>${esc(f.nume)}</b><span class="p-vad-pag" aria-live="polite"></span>
    <a class="buton-ton" href="${url}" download="${esc(f.nume)}">${ico("jos")}<span>${tt("p.descarc")}</span></a>
    <button type="button" class="p-vad-inchid" aria-label="${tt("inchid")}">${ico("x")}</button></header>
    <div class="p-vad-pagini">${pdf ? `<p class="p-vad-lucrez">${tt("a.pdf.lucrez")}</p>` : `<img src="${url}" alt="${esc(f.nume)}">`}</div>`;
  document.body.append(v);
  document.documentElement.classList.add("p-vad-deschis");
  let deschis = true;
  // The phone's Back closes the viewer, not the page (the link is already used): the viewer is a step in the history
  // (attack test 2026-11-01, round 8, L8-3).
  history.pushState({ pVad: true }, "");
  const laInapoi = () => inchid(true);
  addEventListener("popstate", laInapoi);
  /** The PDF's pages as pictures, let go when the viewer closes. */
  const urluri: string[] = [];
  const inchid = (dinIstoric = false) => {
    if (!deschis) return;
    deschis = false;
    // The drawn pages go with the viewer: no picture of the paper stays in the page.
    for (const c of v.querySelectorAll("canvas")) c.width = c.height = 0;
    for (const u of urluri) URL.revokeObjectURL(u);
    v.remove();
    document.documentElement.classList.remove("p-vad-deschis");
    document.removeEventListener("keydown", tasta);
    removeEventListener("popstate", laInapoi);
    if (!dinIstoric && (history.state as { pVad?: boolean } | null)?.pVad) history.back();
    inapoi.focus();
  };
  const tasta = (e: KeyboardEvent) => { if (e.key === "Escape") inchid(); };
  // Each drawn page is kept as a JPEG and its canvas let go at once: a hundred live 1600 px canvases asked for about a
  // gigabyte, enough to have a phone's browser killed after the link was used (attack test 2026-11-01, round 8, M8-1).
  const paginaCaPoza = (c: HTMLCanvasElement, n: number, total: number) => new Promise<boolean | void>((ok) => {
    if (!deschis) { c.width = c.height = 0; ok(false); return; }
    c.toBlob((b) => {
      c.width = c.height = 0;
      if (!deschis) { ok(false); return; }
      if (n === 1) loc.textContent = "";
      if (b) {
        const u = URL.createObjectURL(b), img = document.createElement("img");
        urluri.push(u);
        img.decoding = "async";
        img.alt = t("pdf.pagina", { n, total });
        img.src = u;
        loc.append(img);
      }
      pag.textContent = t("pdf.pagina", { n, total });
      ok();
    }, "image/jpeg", 0.85);
  });
  document.addEventListener("keydown", tasta);
  v.querySelector(".p-vad-inchid")!.addEventListener("click", () => inchid());
  v.querySelector("a[download]")!.addEventListener("click", salvat);
  v.querySelector<HTMLElement>(".p-vad-inchid")!.focus();
  if (!pdf) return;
  const loc = v.querySelector<HTMLElement>(".p-vad-pagini")!, pag = v.querySelector<HTMLElement>(".p-vad-pag")!;
  void incarcPdfJs().then((js) => desenezPaginile(js, f.date, (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h }), paginaCaPoza, { latura: 1600, maxPagini: PAGINI_VAD })).catch(() => {
    if (!deschis) return;
    inchid();
    window.open(url, "_blank", "noopener");
  });
}

/**
 * The heading on one line (Cristian, 2026-11-01): on a narrow phone it is set smaller until it fits, down to 20 px,
 * and only a language too long even then wraps.
 */
function potrivescTitlul(h: HTMLElement | null) {
  if (!h) return;
  h.style.whiteSpace = "nowrap";
  h.style.fontSize = "";
  let px = parseFloat(getComputedStyle(h).fontSize);
  while (h.scrollWidth > h.clientWidth && px > 20) h.style.fontSize = `${(px -= 1)}px`;
  if (h.scrollWidth > h.clientWidth) h.style.whiteSpace = "";
}

if (!adresa || adresa.fel !== "link") {
  inScena(`<span class="sigiliu-scena">${sigiliuSvg("expirat", { px: 132 })}</span><h1>${tt("p.titlu")}</h1><p class="scena-text">${tt("p.fara-link")}</p>`);
} else {
  // Who sends and the note travel in the fragment with the key: shown before anything is fetched.
  const { de, nota } = adresa.fata;
  // Who sent it stays on the page once the papers are listed (UX audit 2026-10-21).
  let cine = "";
  const deschid = async () => {
    // The lock dials as the papers come down through the ciphertext field, a notch a sixth, then springs open: the bolt
    // gives, the seal parts along the slit and the list comes up. A retry gets a fresh lock (eroare makes one).
    scena.cifru(true);
    // The page under the scene is not shown while the papers come down: the fold then brings it in where it stays.
    document.querySelector(".pagina-link")?.classList.add("in-asteptare");
    let notch = 0;
    inScena(`<div class="loc-lacat"></div><p class="progres" id="progres">${tt("p.lucrez", { p: 0 })}</p><span class="bara-scena"><span id="bara"></span></span>`, "");
    try {
      const [pachet] = await Promise.all([deschidLink(relay(""), adresa.id, adresa.cheie, (p) => {
        const x = document.getElementById("progres");
        if (x) x.textContent = t("p.lucrez", { p: Math.round(p * 100) });
        const b = document.getElementById("bara");
        if (b) b.style.width = `${Math.round(p * 100)}%`;
        const n = Math.min(5, Math.floor(p * 6));
        if (n > notch) lacat.tasta((notch = n));
      }).then(despacheteaza), new Promise((ok) => setTimeout(ok, faraMiscare() ? 0 : 600))]);
      lacat.tasta(6);
      await lacat.deschide();
      lista(pachet.titlu, pachet.fisiere, cine);
    } catch (e) {
      eroare(e, () => void deschid());
    }
  };
  // Said as the sender's own words, never as the page's title: names are not checked (security audit 2026-10-20). A
  // firm's send (Colshare Business) names the firm as checked, from its certificate (./firma.ts deschidFataFirma).
  const fata = (firma?: FataFirma) => {
    // A firm's card shows only the firm's own signed note; a note with no name is not shown, since nothing would say
    // whose words they are (security audit 2026-10-25, L2).
    const n = firma ? firma.nota : de ? nota : undefined;
    cine = firma ? `<p class="spus verificat">${cuNume("p.firma", { firma: firma.firma.firma, cui: firma.firma.cui }, "firma")}</p>` : de ? `<p class="spus">${cuNume("p.de", { nume: de }, "nume")}</p>` : "";
    // The lock in the middle of the night scene, its tape running, until the tap that opens it.
    inScena(`<div class="loc-lacat"></div>${cine}<h1>${tt("p.titlu")}</h1>${n ? `<p class="nota">${tt("p.de-la", { titlu: n })}</p>` : ""}
      <p class="scena-text">${tt("p.text")}</p><button class="buton-sigiliu" id="deschid">${ico("lacat")}${tt("p.deschid")}${ico("sageata")}</button>`);
    // Only a tap opens it: a link preview that runs the page must not use up the one opening.
    document.getElementById("deschid")!.addEventListener("click", deschid);
  };
  // A link opened, deleted or expired says so (asking does not use up the opening), and a firm's card names the firm.
  // The relay's fresh certificate (renewals, revocations, verification) over the one frozen into the link.
  const info: Promise<{ firma?: FataFirma; e?: unknown }> = relay("")<{ p?: string; c?: string | null }>("link-info", { id: adresa.id })
    .then(async ({ p, c }) => ({ firma: await deschidFataFirma(p, adresa.id, adresa.cheie, undefined, undefined, c) }), (e) => ({ e }));
  const raspunde = (r: { firma?: FataFirma; e?: unknown }, primul: boolean) => {
    // Offline (status 0) the lock is still offered: the tap says what is wrong.
    if (r.e) { if (r.e instanceof EroareRelay && r.e.status !== 0) eroare(r.e); else if (primul) fata(); return; }
    if (primul) fata(r.firma);
    else if (r.firma && document.getElementById("deschid")) fata(r.firma);
  };
  // The answer is waited for a moment before anything is drawn, so the lock does not come up and give way a tenth of
  // a second later to "opened already" (2026-10-25); a slow relay gets the lock first, as before.
  void Promise.race([info, new Promise<null>((ok) => setTimeout(() => ok(null), 800))]).then((r) => {
    if (r) { raspunde(r, true); return; }
    fata();
    void info.then((x) => raspunde(x, false));
  });
}
