// The check page (<domain>/v/#<statement>.<key>.<signature>, colshare-web/v/): what a safe copy's or a receipt's QR code says
// and whether its signature holds, and, for a file chosen here, whether its pictures are exactly the ones signed
// (./dovada.ts). Everything is checked in this browser: nothing is fetched or sent after the page loads. It says what
// a check proves and what it does not. Built into colshare-web/v/v.js by scripts/acte.mjs.
import aplicatie from "./aplicatie.json";
import { codCheie, verific, verificFisier, type DovadaCitita } from "./dovada.ts";
import { campuriDeclaratie } from "./dovada-text.ts";
import { piciorHtml } from "./legal.ts";
import { data, limbaTelefonului, punLimba, t, type Cheie } from "./limba.ts";
import { marcaSvg } from "./sigiliu.ts";

punLimba(limbaTelefonului());
document.getElementById("marca")!.innerHTML = marcaSvg(32, aplicatie.nume);
document.title = `${t("v.titlu")} · ${aplicatie.nume}`;
const el = document.getElementById("pagina")!;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const tt = (k: Cheie, v?: Record<string, string | number>) => esc(t(k, v));

async function rezultat(v: DovadaCitita): Promise<string> {
  return `<div class="card"><p class="titlu-pachet">${tt(v.d.fel === "copie" ? "dovada.titlu.copie" : v.d.fel === "primire" ? "dovada.titlu.primire" : v.d.fel === "trimitere" ? "dovada.titlu.trimitere" : "dovada.titlu.chitanta")}</p>
    <p class="banda ${v.tine ? "ok" : "rau"}" role="status">${tt(v.tine ? "dovada.tine" : "dovada.nu-tine")}</p>
    ${v.tine && (v.d.fel === "primire" || v.d.fel === "trimitere") ? `<p class="mic">${tt("dovada.firma-nedovedita")}</p>` : ""}
    ${v.tine ? "" : `<p class="eticheta nedovedit-titlu">${tt("dovada.nedovedit")}</p>`}
    <ul class="campuri${v.tine ? "" : " nedovedit"}">${campuriDeclaratie(v.d).map(([k, x]) => `<li><span class="eticheta">${esc(k)}</span><span class="valoare">${esc(x)}</span></li>`).join("")}</ul>
    <p class="mic">${tt("dovada.cheie", { cod: await codCheie(v.publica) })}</p></div>`;
}

async function arata(): Promise<void> {
  const v = location.hash ? await verific(location.hash) : undefined;
  el.innerHTML = `<h1>${tt("v.titlu")}</h1><p>${tt("v.text")}</p>
    ${v ? await rezultat(v) : `<p class="banda">${tt("v.fara")}</p>`}
    <h2>${tt("v.fisier")}</h2>
    <label class="buton contur">${tt("v.fisier.alege")}<input type="file" id="fisier" accept="application/pdf,.pdf" hidden></label>
    <div id="fisier-rezultat" aria-live="polite"></div>
    <h2>${tt("v.limite")}</h2>
    <ul class="limite"><li>${tt("v.limita.cuvinte")}</li><li>${tt("v.limita.hartie")}</li><li>${tt("v.limita.cine")}</li><li>${tt("v.limita.dupa")}</li></ul>
    ${piciorHtml(false)}`;
  document.getElementById("fisier")!.addEventListener("change", async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    const out = document.getElementById("fisier-rezultat")!;
    if (!f) return;
    const r = await verificFisier(new Uint8Array(await f.arrayBuffer()));
    out.innerHTML = r.stare === "fara" ? `<p class="banda rau">${tt("v.fisier.fara")}</p>`
      : `<p class="banda ${r.stare === "bun" ? "ok" : "rau"}">${r.stare === "bun" ? tt("v.fisier.bun", { data: data(r.dovada.d.data) }) : tt("v.fisier.schimbat")}</p>${r.dovada.dovada === v?.dovada ? "" : await rezultat(r.dovada)}`;
  });
}

void arata();
addEventListener("hashchange", () => void arata());
