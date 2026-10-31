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
/** What the scene shows (the seal and its words); `jos`: what the paper under it shows. */
function inScena(html: string, jos = invit()) {
  scena.continut.innerHTML = html;
  punLacat(scena.continut, lacat);
  arata(jos);
}

/** `dinNou`: tries the opening again (the key is still in memory: the address bar no longer has it). */
function eroare(e: unknown, dinNou?: () => void) {
  const cod = e instanceof EroareRelay ? e.cod : undefined;
  // A link used or gone is a fact, not an error: the mark says it (the halves parted, or an empty outline).
  scena.cifru(false);
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
  scena.continut.innerHTML = "";
  scena.restrang(t("p.eticheta"));
  const nr = (i: number) => String(i + 1).padStart(2, "0");
  const unul = fisiere.length === 1;
  arata(`<div class="p-deschis"><h1>${tt("p.titlu")}</h1>${cine}${titlu ? `<p class="nota">${tt("p.de-la", { titlu })}</p>` : ""}
    <p class="p-salveaza" role="note">${ico("ceas")}<span>${tt("p.salveaza")}</span></p>
    <ul class="hartii${unul ? " unul" : ""}">${fisiere.map((f, i) => `<li style="--i:${i}" data-hartie="${i}"><span class="hartie-nr" aria-hidden="true">${nr(i)}</span>${chip(f, i)}<span class="hartie-text"><b>${esc(f.nume)}</b><span class="hartie-meta">${fel(f)} · ${marime(f.date.length)}</span>${verific(f)}</span>
      <span class="hartie-act">${f.tip.startsWith("image/") && !poza(f) ? "" : `<a class="buton-ton" href="${urls[i]}" target="_blank" rel="noopener">${ico("ochi")}<span>${tt("p.vad")}</span></a>`}
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
  document.getElementById("toate")?.addEventListener("click", () => {
    for (const a of el.querySelectorAll<HTMLAnchorElement>("a[download]")) a.click();
  });
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
