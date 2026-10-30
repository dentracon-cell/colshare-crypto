// The pages of the three forms (colshare-web/acte/retragere/, reziliere/, semnalare/; ./formular.ts): withdraw from the
// subscription, cancel it, report a link or an ask. Each sends what it asks for to our inbox through POST /api/contact
// and then shows what was sent and when, to keep. The report sends only the link's identifier: whatever is pasted,
// the key never leaves this page. Built into colshare-web/acte/formular.js by scripts/acte.mjs.
import aplicatie from "./aplicatie.json";
import { marcaSvg } from "./sigiliu.ts";
import { comandaDin, idDinLink, mesajFormular, type CampuriFormular, type FelFormular } from "./formular.ts";
import { EMAIL_SUPORT, piciorHtml, RAMBURSARE_INTEGRALA } from "./legal.ts";
import { LIMBI, limbaCurenta, limbaTelefonului, LOCALE, punLimba, t, type Cheie, type Limba } from "./limba.ts";

const l = new URLSearchParams(location.search).get("l");
punLimba(l && l in LIMBI ? l as Limba : limbaTelefonului());
const fel = (document.getElementById("pagina")!.dataset.fel ?? "retragere") as FelFormular;
document.getElementById("marca")!.innerHTML = marcaSvg(32, aplicatie.nume);
const el = document.getElementById("pagina")!;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const tt = (k: Cheie, v?: Record<string, string | number>) => esc(t(k, v));

const TITLU: Record<FelFormular, Cheie> = { retragere: "f.retragere.titlu", reziliere: "f.reziliere.titlu", semnalare: "f.semnalare.titlu" };
const BUTON: Record<FelFormular, Cheie> = { retragere: "f.retragere.buton", reziliere: "f.reziliere.buton", semnalare: "f.semnalare.buton" };
document.title = t(TITLU[fel]);

const camp = (nume: string, eticheta: Cheie, atribute: string, ajutor?: string) =>
  `<label>${tt(eticheta)}<input name="${nume}" ${atribute}>${ajutor ? `<small class="mic">${ajutor}</small>` : ""}<span class="eroare" data-pentru="${nume}"></span></label>`;
const textarea = (nume: string, eticheta: Cheie) =>
  `<label>${tt(eticheta)}<textarea name="${nume}" rows="4" maxlength="3000"></textarea><span class="eroare" data-pentru="${nume}"></span></label>`;
const capcana = '<input name="nu_completa" tabindex="-1" autocomplete="off" aria-hidden="true" class="capcana">';
const comanda = () => camp("comanda", "f.comanda", 'autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="GPA.1234-5678-9012-34567"', tt("f.comanda.ajutor"));
const comune = () => `${camp("nume", "f.nume", 'autocomplete="name" maxlength="120"')}${camp("email", "f.email", 'type="email" autocomplete="email" maxlength="120"')}`;

function formular(): string {
  if (fel === "retragere") {
    return `<p>${tt(RAMBURSARE_INTEGRALA ? "f.retragere.text" : "f.retragere.text.partial")}</p>
      <form class="formular" novalidate>${comune()}${comanda()}<p class="regula">${tt("f.retragere.declar")}</p>${capcana}
      <button class="buton plin mare">${tt(BUTON[fel])}</button></form>`;
  }
  if (fel === "reziliere") {
    return `<p>${tt("f.reziliere.text")}</p>
      <form class="formular" novalidate>${comune()}${comanda()}
      <fieldset class="alegeri"><legend>${tt("f.reziliere.fel")}</legend>
        <label class="rand"><input type="radio" name="cand" value="ordinar" checked>${tt("f.reziliere.ordinar")}</label>
        <label class="rand"><input type="radio" name="cand" value="extra">${tt("f.reziliere.extra")}</label></fieldset>
      <div id="motiv-extra" hidden>${textarea("motiv", "f.reziliere.motiv")}</div>${capcana}
      <button class="buton plin mare">${tt(BUTON[fel])}</button></form>`;
  }
  return `<p>${tt("f.semnalare.text")}</p>
    <form class="formular" novalidate>${camp("link", "f.semnalare.link", 'autocomplete="off" spellcheck="false" maxlength="2000"', tt("f.semnalare.link.ajutor"))}
    <p class="mic" id="id-trimis" hidden></p>
    ${textarea("motiv", "f.semnalare.motiv")}
    <label class="rand"><input type="checkbox" name="copii">${tt("f.semnalare.copii")}</label>${comune()}
    <label class="rand"><input type="checkbox" name="bunaCredinta">${tt("f.semnalare.buna-credinta")}</label><span class="eroare" data-pentru="bunaCredinta"></span>${capcana}
    <button class="buton plin mare">${tt(BUTON[fel])}</button></form>`;
}

el.innerHTML = `<h1>${tt(TITLU[fel])}</h1>${formular()}<p class="mic">${tt("f.alternativ", { email: EMAIL_SUPORT })}</p>${piciorHtml(false)}`;
const form = el.querySelector("form")!;
const v = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "";

// The report shows, as it is typed, the only part that will leave the page.
const linkCamp = form.elements.namedItem("link") as HTMLInputElement | null;
linkCamp?.addEventListener("input", () => {
  const x = idDinLink(linkCamp.value);
  const p = document.getElementById("id-trimis")!;
  p.hidden = !x;
  if (x) p.textContent = t("f.semnalare.id", { id: x.id });
});
form.addEventListener("change", () => {
  const m = document.getElementById("motiv-extra");
  if (m) m.hidden = form.querySelector<HTMLInputElement>("input[name=cand]:checked")?.value !== "extra";
});

function spune(camp: string, k?: Cheie): void {
  const x = form.querySelector<HTMLElement>(`.eroare[data-pentru="${camp}"]`);
  if (x) x.textContent = k ? t(k) : "";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The fields checked here, each with its message; undefined while one is wrong. */
function campuri(): CampuriFormular | undefined {
  for (const x of form.querySelectorAll<HTMLElement>(".eroare")) x.textContent = "";
  let bun = true;
  const lipsa = (n: string, k: Cheie = "f.lipsa") => { spune(n, k); bun = false; };
  const c: CampuriFormular = { nume: v("nume").trim(), email: v("email").trim() };
  // A report of an offence against children may leave out the name and the address (DSA art. 16(2)).
  const optional = fel === "semnalare" && (form.elements.namedItem("copii") as HTMLInputElement).checked;
  if (optional) c.copii = true;
  if (!c.nume && !optional) lipsa("nume");
  if (!c.email && !optional) lipsa("email");
  else if (c.email && !EMAIL.test(c.email)) lipsa("email", "f.email.gresit");
  if (fel !== "semnalare") {
    // Optional: without it we find the order by the e-mail address (the law asks only for what identifies the contract).
    c.comanda = comandaDin(v("comanda"));
    if (v("comanda").trim() && !c.comanda) lipsa("comanda", "f.comanda.gresita");
  }
  if (fel === "reziliere") {
    c.cand = form.querySelector<HTMLInputElement>("input[name=cand]:checked")?.value === "extra" ? "extra" : "ordinar";
    if (c.cand === "extra") { c.motiv = v("motiv").trim(); if (!c.motiv) lipsa("motiv"); }
  }
  if (fel === "semnalare") {
    c.link = idDinLink(v("link"));
    if (!c.link) lipsa("link", v("link").trim() ? "f.semnalare.id-gresit" : "f.lipsa");
    c.motiv = v("motiv").trim();
    if (!c.motiv) lipsa("motiv");
    c.bunaCredinta = (form.elements.namedItem("bunaCredinta") as HTMLInputElement).checked;
    if (!c.bunaCredinta) lipsa("bunaCredinta");
  }
  return bun ? c : undefined;
}

/** The moment of receipt in one zone, named, as the acknowledgement e-mail states it (contact.js oraPrimirii). */
const ZONA = "Europe/Bucharest";
const oraPrimirii = (d: Date) => `${d.toLocaleString(LOCALE[limbaCurenta()], { dateStyle: "long", timeStyle: "short", timeZone: ZONA })} (${ZONA})`;

/** `confirmat` false: the server took the message but the acknowledgement e-mail did not go out at once. */
function gata(c: CampuriFormular, cand: Date, confirmat: boolean): void {
  const ora = oraPrimirii(cand);
  const randuri = ([["f.nume", c.nume], ["f.email", c.email]] as [Cheie, string][]).filter(([, x]) => x);
  if (c.comanda) randuri.push(["f.comanda", c.comanda]);
  if (fel === "reziliere") randuri.push(["f.reziliere.fel", t(c.cand === "extra" ? "f.reziliere.extra" : "f.reziliere.ordinar")]);
  if (c.motiv) randuri.push([fel === "semnalare" ? "f.semnalare.motiv" : "f.reziliere.motiv", c.motiv]);
  if (c.link) randuri.push(["f.semnalare.link", c.link.id]);
  const urmeaza: Cheie = !c.email ? "f.semnalare.fara-raspuns" : !confirmat ? "f.confirm.tarziu" : fel !== "semnalare" ? "f.confirm.email" : "f.semnalare.urmeaza";
  el.innerHTML = `<h1>${tt(TITLU[fel])}</h1>
    <p class="banda ok">${tt(fel === "retragere" ? "f.retragere.gata" : fel === "reziliere" ? "f.reziliere.gata" : "f.semnalare.gata", { cand: ora })}</p>
    ${fel === "retragere" ? `<p class="regula">${tt("f.retragere.declar")}</p>` : ""}
    <h2>${tt("f.trimis-ce")}</h2><ul class="campuri">${randuri.map(([k, x]) => `<li><span class="eticheta">${tt(k)}</span><span class="valoare">${esc(x)}</span></li>`).join("")}</ul>
    <p>${tt(urmeaza, { email: c.email })}</p><p class="mic">${tt("f.pastreaza")}</p>
    <button class="buton contur" id="tiparesc">${tt("f.tiparesc")}</button>${piciorHtml(false)}`;
  document.getElementById("tiparesc")!.addEventListener("click", () => print());
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const c = campuri();
  if (!c) { form.querySelector<HTMLElement>(".eroare:not(:empty)")?.closest("label")?.scrollIntoView({ block: "center" }); return; }
  const buton = form.querySelector<HTMLButtonElement>("button.plin")!;
  buton.disabled = true;
  buton.textContent = t("f.trimit");
  const cand = new Date();
  const corp = { ...mesajFormular(fel, c, { aplicatia: aplicatie.nume, limba: limbaCurenta(), cand }), nu_completa: v("nu_completa") };
  let k: Cheie | undefined;
  try {
    const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corp) });
    const j = await r.json().catch(() => ({})) as { primit?: boolean; confirmat?: boolean; ora?: string; camp?: string };
    // The server's clock, the one the e-mail states; the page's own only when the server gave none.
    const primit = j.ora && !Number.isNaN(Date.parse(j.ora)) ? new Date(j.ora) : cand;
    if (r.ok && j.primit) { gata(c, primit, j.confirmat !== false); scrollTo(0, 0); return; }
    if (r.status === 400 && j.camp === "email") spune("email", "f.email.gresit");
    else k = r.status === 429 ? "f.rata" : "f.eroare";
  } catch {
    k = "f.eroare";
  }
  buton.disabled = false;
  buton.textContent = t(BUTON[fel]);
  if (k) {
    const p = document.createElement("p");
    p.className = "banda rau";
    p.textContent = t(k, { email: EMAIL_SUPORT });
    form.querySelector(".banda.rau")?.remove();
    buton.before(p);
  }
});
