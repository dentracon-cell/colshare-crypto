// The page a People card opens in a browser (<domain>/o/#<public key>.<mailbox>.<token>.<name>, colshare-web/o/), on a phone
// without the app or on a computer: who gave the card, and the link to open with the app ("Add from a card"). Nothing
// is fetched or sent. Built into colshare-web/o/o.js by scripts/acte.mjs.
import aplicatie from "./aplicatie.json";
import { punLimba, limbaTelefonului, t, type Cheie } from "./limba.ts";
import { citesteCarte } from "./oameni.ts";
import { svgQr } from "../core/qr.ts";
import { cuPlay, frazaInvitatie, invitatie, PLAY } from "./lansare.ts";
import { piciorHtml } from "./legal.ts";
import { montezBanda } from "./pagina-material.ts";

punLimba(limbaTelefonului());
// The link pages' night band with the wordmark (as /p/ and /a/), so a card reads as Colshare's at a glance.
montezBanda();
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
  // The card doubles as an invitation (2026-10-30): who gave it and what Colshare is come first; on an Android phone,
  // once the app is on Google Play, getting it is the one thing to do, since a phone that has it opens the link in the
  // app and never shows this page. On a computer (a fine pointer), the card as a QR code, to carry it to the phone.
  const peCalculator = matchMedia("(pointer: fine)").matches;
  const play = cuPlay();
  const copiez = `<button class="buton-ton copiez" id="copiez">${tt("trimit.copiez")}</button>`;
  // On a computer the page is wide (the band's wordmark moves with it) and the QR code stands beside the text, so the
  // whole card fits one screen without scrolling (2026-10-30); a narrow window stacks them as on a phone.
  if (peCalculator) el.closest(".pagina-link")?.classList.add("lata");
  el.innerHTML = `<div class="o-carte"><div class="o-text"><h1>${tt("o.titlu")}</h1><p class="titlu-pachet">${tt("o.de", { nume: carte.nume })}</p>
    <p class="o-invit">${frazaInvitatie("a.invit")}</p>
    ${play ? `<a class="buton-sigiliu" href="${PLAY}" target="_blank" rel="noopener">${tt("invit.play")}</a><p class="mic">${tt("o.dupa")}</p>` : ""}
    <p>${tt("o.text")}</p>
    ${copiez}${play ? "" : `<p class="mic">${tt("o.dupa")}</p>`}</div>
    ${peCalculator ? `<div class="o-qr"><div class="qr" role="img" aria-label="${tt("o.qr")}">${svgQr(adresa, 220)}</div><p class="mic">${tt("o.qr")}</p></div>` : ""}</div>${piciorHtml(true)}`;
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
