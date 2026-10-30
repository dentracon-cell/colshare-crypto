// The page a People card opens in a browser (<domain>/o/#<public key>.<mailbox>.<token>.<name>, colshare-web/o/), on a phone
// without the app or on a computer: who gave the card, and the link to open with the app ("Add from a card"). Nothing
// is fetched or sent. Built into colshare-web/o/o.js by scripts/acte.mjs.
import aplicatie from "./aplicatie.json";
import { marcaSvg } from "./sigiliu.ts";
import { punLimba, limbaTelefonului, t, type Cheie } from "./limba.ts";
import { citesteCarte } from "./oameni.ts";
import { invitatie } from "./lansare.ts";
import { piciorHtml } from "./legal.ts";

punLimba(limbaTelefonului());
document.getElementById("marca")!.innerHTML = marcaSvg(32, aplicatie.nume);
const el = document.getElementById("pagina")!;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const tt = (k: Cheie, v?: Record<string, string | number>) => esc(t(k, v));

const adresa = location.href;
const carte = citesteCarte(adresa);
// The card's token leaves the address bar (and the history) once read; the button below still copies it.
if (location.hash) history.replaceState(null, "", location.pathname);
document.title = `${t("o.titlu")} · ${aplicatie.nume}`;


if (!carte) {
  el.innerHTML = `<h1>${tt("o.titlu")}</h1><p>${tt("o.fara-carte")}</p>${invitatie("a.invit")}${piciorHtml(true)}`;
} else {
  el.innerHTML = `<h1>${tt("o.titlu")}</h1><p class="titlu-pachet">${tt("o.de", { nume: carte.nume })}</p><p>${tt("o.text")}</p>
    <button class="buton plin mare" id="copiez">${tt("trimit.copiez")}</button>${invitatie("a.invit")}${piciorHtml(true)}`;
  document.getElementById("copiez")!.addEventListener("click", async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(adresa);
      b.textContent = t("trimit.copiat");
    } catch {
      prompt(t("trimit.copiez"), adresa);
    }
  });
}
