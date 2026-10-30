// The safe ID copy in a browser, before and beside the app (business plan v13 section 10: the first free web tool):
// photos of an ID card or passport (front, and the back if wanted) chosen on this device, what to hide blacked out,
// marked with who it is for, what for and the date (./copie-sigura.ts), saved as a one-page A4 PDF. Nothing is
// uploaded: the page makes no request after it loads. Without the app's OCR the <<< switch covers the band where ICAO
// 9303 puts the lines, which the preview shows; anything else is a box drawn by hand. Built into colshare-web/copie/c.js by
// scripts/acte.mjs.
import aplicatie from "./aplicatie.json";
import { marcaSvg } from "./sigiliu.ts";
import { pdfDinPagini } from "./pdf.ts";
import { A4, deseneazaCopie, foaieA4, fontEticheta, textMarcaj, zonaPoza, type Desen, type Zona } from "./copie-sigura.ts";
import { piciorHtml } from "./legal.ts";
import { data, limbaTelefonului, punLimba, t, type Cheie } from "./limba.ts";
import { invitatie } from "./lansare.ts";

punLimba(limbaTelefonului());
// The logo leads home, where the app is described (copy audit § 1.11).
document.getElementById("marca")!.innerHTML = `<a href="/">${marcaSvg(38, aplicatie.nume)}</a>`;
document.title = `${t("w.titlu")} · ${aplicatie.nume}`;
const el = document.getElementById("pagina")!;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const tt = (k: Cheie, v?: Record<string, string | number>) => esc(t(k, v));
const SCOPURI: Cheie[] = ["scop.chirie", "scop.munca", "scop.credit", "scop.viza", "scop.masina", "scop.hotel"];

/** Where the <<< lines are on a page of these proportions: the bottom of a card's back, of a passport's data page. */
const zonaMrz = (w: number, h: number): Zona => (Math.max(w, h) / Math.min(w, h) > 1.5 ? { x: 0, y: 0.6, w: 1, h: 0.4 } : { x: 0, y: 0.72, w: 1, h: 0.28 });

let imagini: ImageBitmap[] = [];
let manual: Zona[][] = [];
const ascund = { mrz: true, poza: false };
let desenez = false;
let trag: { pag: number; x: number; y: number; z: Zona } | undefined;
const decalaj = Math.random();

// Three ruled steps on the left (who for, what for, the ID and its boxes), the A4 sheet on the right, drawn as it will
// be saved and updated with every change (Colshare/design_handoff_colshare_identity, "Web tool /copie/").
el.innerHTML = `<div class="unealta-corp"><div class="unealta-st">
  <p class="sus">${tt("w.sus")}</p><h1>${tt("w.mare")}</h1><p class="intro">${tt("w.text")}</p>
  <ol class="pasi-w">
    <li><span class="nr">01</span><div><label class="pas-titlu" for="pentru">${tt("copie.pentru")}</label>
      <input id="pentru" maxlength="60" placeholder="${tt("copie.pentru.exemplu")}" autocomplete="off"></div></li>
    <li><span class="nr">02</span><div><label class="pas-titlu" for="scop">${tt("copie.scop")}</label>
      <div class="cipuri">${SCOPURI.map((k) => `<button type="button" class="cip" data-scop="${esc(t(k))}">${tt(k)}</button>`).join("")}</div>
      <input id="scop" maxlength="60" placeholder="${tt("copie.scop.exemplu")}" autocomplete="off">
      <label class="camp-text">${tt("copie.data")}<input id="data" maxlength="30" value="${esc(data(new Date().toISOString()))}"></label></div></li>
    <li><span class="nr">03</span><div><p class="pas-titlu">${tt("w.pas3")}</p>
      <div class="actiuni"><label class="buton plin ocru" id="aleg">${tt("w.aleg")}<input type="file" id="poza" accept="image/*" multiple hidden></label>
      <button class="buton contur" id="desenez" disabled>${tt("copie.desenez")}</button></div>
      <div id="lucru" hidden>
        <div class="cadru" id="pagini"></div>
        <p class="banda" id="indemn" hidden>${tt("copie.desenez.activ")}</p>
        <div class="comutatoare">
          <label class="comutator"><span><b>${tt("copie.mrz")}</b></span><input type="checkbox" role="switch" id="c-mrz" checked></label>
          <label class="comutator"><span><b>${tt("copie.poza")}</b></span><input type="checkbox" role="switch" id="c-poza"></label>
        </div>
        <div class="actiuni"><button class="buton mic text" id="anulez">${tt("copie.anulez")}</button></div>
        <p class="mic">${tt("copie.banci")}</p>
        <p class="banda rau" id="lipsa" hidden>${tt("copie.lipsa")}</p>
        <button class="buton plin mare" id="descarc">${tt("w.descarc")}</button>
      </div></div></li>
  </ol>
  ${invitatie("w.invit")}${piciorHtml(false)}</div>
  <aside class="unealta-dr"><canvas id="foaie" aria-label="${tt("copie.previzualizare")}"></canvas>
    <p class="eticheta">${tt("copie.linia")}</p><p class="linie-marcaj" id="linie"></p></aside></div>`;

/** Until a photo is chosen, the sheet shows a blank card, so the marking can be seen as it is typed. */
const gol = (() => {
  const c = document.createElement("canvas");
  c.width = 856;
  c.height = 540;
  const g = c.getContext("2d")!;
  g.fillStyle = "#d9d5cc";
  g.fillRect(0, 0, c.width, c.height);
  return c;
})();

/** The A4 sheet, as the download will be, at the preview's size. */
function foaieVie(): void {
  const c = $<HTMLCanvasElement>("foaie");
  const w = 800, k = w / A4.w;
  c.width = w;
  c.height = Math.round(A4.h * k);
  const g = c.getContext("2d")!;
  g.setTransform(k, 0, 0, k, 0, 0);
  const pagini = imagini.length ? imagini.map((_, i) => $<HTMLCanvasElement>(`p-${i}`)).map((x) => ({ img: x, w: x.width, h: x.height })) : (() => {
    const x = document.createElement("canvas");
    x.width = gol.width;
    x.height = gol.height;
    deseneazaCopie(x.getContext("2d") as unknown as Desen, gol, x.width, x.height, marcaj(), [], decalaj);
    return [{ img: x, w: x.width, h: x.height }];
  })();
  foaieA4(g as unknown as Desen, pagini);
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const valoare = (id: string) => $<HTMLInputElement>(id).value.trim();
const marcaj = () => ({ copie: t("copie.cuvant"), pentru: valoare("pentru") ? `${t("copie.pentru.marcaj")}: ${valoare("pentru")}` : "", scop: valoare("scop"), data: valoare("data") });

function negre(i: number): Zona[] {
  const img = imagini[i];
  return [...(ascund.mrz ? [zonaMrz(img.width, img.height)] : []), ...(ascund.poza ? [zonaPoza(img.width, img.height)] : []), ...manual[i], ...(trag?.pag === i ? [trag.z] : [])];
}

function deseneazaPagina(c: HTMLCanvasElement, i: number, max: number): void {
  const img = imagini[i];
  const k = Math.min(1, max / Math.max(img.width, img.height));
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  deseneazaCopie(c.getContext("2d") as unknown as Desen, img, c.width, c.height, marcaj(), negre(i), decalaj);
}

function arata(): void {
  $("linie").textContent = textMarcaj(marcaj());
  imagini.forEach((_, i) => deseneazaPagina($<HTMLCanvasElement>(`p-${i}`), i, 1100));
  for (const c of el.querySelectorAll("#pagini canvas")) c.classList.toggle("desenez", desenez);
  $("indemn").hidden = !desenez;
  $("desenez").classList.toggle("activ", desenez);
  for (const b of el.querySelectorAll<HTMLButtonElement>("[data-scop]")) b.classList.toggle("activ", b.dataset.scop === valoare("scop"));
  foaieVie();
}

$<HTMLInputElement>("poza").addEventListener("change", async (e) => {
  const f = [...((e.target as HTMLInputElement).files ?? [])].slice(0, 2);
  if (!f.length) return;
  for (const b of imagini) b.close();
  imagini = await Promise.all(f.map((x) => createImageBitmap(x, { imageOrientation: "from-image" })));
  manual = imagini.map(() => []);
  $("pagini").innerHTML = imagini.map((_, i) => `<canvas id="p-${i}" class="previzualizare" aria-label="${tt("copie.previzualizare")}"></canvas>`).join("");
  $("lucru").hidden = false;
  $("aleg").classList.replace("plin", "contur");
  $<HTMLButtonElement>("desenez").disabled = false;
  arata();
});
for (const b of el.querySelectorAll<HTMLButtonElement>("[data-scop]")) b.addEventListener("click", () => { $<HTMLInputElement>("scop").value = b.dataset.scop!; arata(); });
$<HTMLInputElement>("c-mrz").addEventListener("change", (e) => { ascund.mrz = (e.target as HTMLInputElement).checked; arata(); });
$<HTMLInputElement>("c-poza").addEventListener("change", (e) => { ascund.poza = (e.target as HTMLInputElement).checked; arata(); });
$("desenez").addEventListener("click", () => { desenez = !desenez; arata(); });
$("anulez").addEventListener("click", () => { const i = manual.map((m) => m.length > 0).lastIndexOf(true); if (i >= 0) manual[i].pop(); arata(); });
for (const id of ["pentru", "scop", "data"]) $(id).addEventListener("input", arata);

const punct = (c: HTMLCanvasElement, e: PointerEvent) => {
  const r = c.getBoundingClientRect();
  return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
};
el.addEventListener("pointerdown", (e) => {
  const c = e.target as HTMLCanvasElement;
  if (!desenez || !c.id?.startsWith("p-")) return;
  c.setPointerCapture(e.pointerId);
  const p = punct(c, e);
  trag = { pag: Number(c.id.slice(2)), ...p, z: { x: p.x, y: p.y, w: 0, h: 0 } };
});
el.addEventListener("pointermove", (e) => {
  const c = e.target as HTMLCanvasElement;
  if (!trag || !c.id?.startsWith("p-")) return;
  const p = punct(c, e);
  trag.z = { x: Math.min(trag.x, p.x), y: Math.min(trag.y, p.y), w: Math.abs(p.x - trag.x), h: Math.abs(p.y - trag.y) };
  deseneazaPagina(c, trag.pag, 1100);
});
el.addEventListener("pointerup", () => {
  if (trag && trag.z.w > 0.01 && trag.z.h > 0.01) { manual[trag.pag].push(trag.z); desenez = false; }
  trag = undefined;
  arata();
});

$("descarc").addEventListener("click", async () => {
  if (!imagini.length) return;
  $("lipsa").hidden = !!(valoare("pentru") || valoare("scop"));
  if (!$("lipsa").hidden) return;
  const pagini = imagini.map((_, i) => {
    const c = document.createElement("canvas");
    deseneazaPagina(c, i, 2000);
    return { img: c, w: c.width, h: c.height };
  });
  const foaie = document.createElement("canvas");
  foaie.width = A4.w;
  foaie.height = A4.h;
  foaieA4(foaie.getContext("2d") as unknown as Desen, pagini);
  const jpeg = await new Promise<Blob>((ok, rau) => foaie.toBlob((x) => (x ? ok(x) : rau(new Error("JPEG"))), "image/jpeg", 0.9));
  const pdf = pdfDinPagini([{ jpeg: new Uint8Array(await jpeg.arrayBuffer()), w: A4.w, h: A4.h }], t("copie.cuvant"));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([pdf as BlobPart], { type: "application/pdf" }));
  a.download = t("copie.fisier", { data: new Date().toISOString().slice(0, 10) });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
});

// The blank sheet and its marking line before any photo, again once the label's font is in.
arata();
void fontEticheta(t("copie.cuvant")).then(arata);
