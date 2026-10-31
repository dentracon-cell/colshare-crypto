// The page a People card opens in a browser (<domain>/o/#<public key>.<mailbox>.<token>.<name>, colshare-web/o/), on a phone
// without the app or on a computer: who gave the card, and the link to open with the app ("Add from a card"). Nothing
// is fetched or sent. Built into colshare-web/o/o.js by scripts/acte.mjs.
import aplicatie from "./aplicatie.json";
import { punLimba, limbaTelefonului, t, type Cheie } from "./limba.ts";
import { citesteCarte } from "./oameni.ts";
import { svgQr } from "../core/qr.ts";
import { cuPlay, frazaInvitatie, invitatie, peAndroid, PLAY } from "./lansare.ts";
import { piciorHtml } from "./legal.ts";
import { montezBanda, sigiliuInFundal } from "./pagina-material.ts";

punLimba(limbaTelefonului());
// On a computer (a fine pointer), the card as a QR code, to carry it to the phone.
const peCalculator = matchMedia("(pointer: fine)").matches;
// The link pages' night band with the wordmark (as /p/ and /a/), so a card reads as Colshare's at a glance. On a
// computer the seal lies behind the page instead, around the QR code (below); a phone has no QR code, and a seal behind
// the words made them hard to read (2026-10-31), so there it stays in the band, as on /p/ and /a/.
// The page's own class first, so the band already has its phone height when it is drawn (the drawing takes the size
// it finds; keyed on the card's words, which come later, the seal was drawn tall and squeezed).
document.body.classList.add("pagina-om");
// What the page is stands in the band, at the right, balancing the wordmark and clear of the band's seal on a phone,
// not as a label over the heading (2026-10-31).
montezBanda(false, peCalculator, t("o.titlu"));
const el = document.getElementById("pagina")!;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const tt = (k: Cheie, v?: Record<string, string | number>) => esc(t(k, v));

/**
 * The card's link as an Android intent for the app alone: the card stays in the data (Android takes the spec after
 * the last #), and a phone without the app goes to Google Play once the app is there, to the home page before.
 */
function intentie(adresa: string, play: boolean): string {
  const u = new URL(adresa);
  const inapoi = play ? PLAY : `${u.origin}/`;
  return `intent://${u.host}${u.pathname}${u.hash}#Intent;scheme=https;package=${aplicatie.id};S.browser_fallback_url=${encodeURIComponent(inapoi)};end`;
}

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
  // app and never shows this page.
  const play = cuPlay();
  // One thing to do, then the other way, then what to do without the app (2026-10-31, "make the page more suitable"):
  // who gave the card is the heading; on an Android phone "Open in Colshare" hands the link to the app, since an in-app
  // browser (Messenger, Instagram) shows this page even where the app is installed; copying says where to paste.
  const deschid = peAndroid() && !peCalculator
    ? `<a class="buton-sigiliu" href="${esc(intentie(adresa, play))}">${tt("o.deschid")}</a>` : "";
  const cale = `${t("oameni.titlu")} › ${t("oameni.adaug")}`;
  // On a phone the steps share the screen's spare height, each gap up to a limit, so the card fills the screen instead
  // of stopping halfway (2026-10-31); elsewhere these are not shown.
  const loc = `<i class="o-loc" aria-hidden="true"></i>`;
  const lacat = `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
  // On a computer the page is wide (the band's wordmark moves with it) and the QR code stands beside the text, so the
  // whole card fits one screen without scrolling (2026-10-30); a narrow window stacks them as on a phone.
  if (peCalculator) el.closest(".pagina-link")?.classList.add("lata");
  // A phone that cannot have the app (an iPhone: Colshare is Android only) cannot add the card, so the page says so and
  // offers what works in its browser instead: papers sent to it open there, and an ask link lets it send papers
  // (2026-10-31, "there's no Colshare app for iPhone"). Its one button asks the card's owner for such a link.
  const faraAplicatie = !peCalculator && !peAndroid();
  const nume = { nume: carte.nume };
  const mijloc = faraAplicatie
    ? `<p class="o-ce">${tt("o.ios", nume)}</p>
    <ul class="o-ios"><li>${tt("o.ios-primesc", nume)}</li><li>${tt("o.ios-trimit", nume)}</li></ul>
    ${loc}<div class="o-actiuni"><button class="buton-sigiliu" id="cer">${tt("o.ios-cer")}</button></div>`
    : `<p class="o-ce">${tt("o.text")}</p>
    ${loc}<div class="o-actiuni">${deschid}<button class="buton-contur copiez" id="copiez">${tt("trimit.copiez")}</button>
    <p class="mic">${tt("o.lipesc", { cale })}</p></div>
    ${loc}<section class="o-fara-app"><h2>${tt("o.nu-am")}</h2><p>${frazaInvitatie("a.invit")}</p>
    ${play ? `<a class="buton-contur" href="${PLAY}" target="_blank" rel="noopener">${tt("invit.play")}</a>` : ""}
    <p class="mic">${tt("o.dupa")}</p></section>`;
  el.innerHTML = `<div class="o-carte"><div class="o-text"><h1>${esc(t("o.de", { nume: "%NUME%" })).replace("%NUME%", () => `<span class="o-nume">${esc(carte.nume)}</span>`)}</h1>
    ${mijloc}
    ${loc}<p class="o-server">${lacat}${tt("o.server")}</p></div>
    ${peCalculator ? `<div class="o-qr"><div class="qr" role="img" aria-label="${tt("o.qr")}">${svgQr(adresa, 220)}</div><p class="mic">${tt("o.qr")}</p></div>` : ""}</div>
    ${peCalculator
    // In a wide window the caption goes on the footer's line, under the code, level with the legal links (2026-10-30).
    ? `<div class="o-subsol">${piciorHtml(true)}<p class="o-qr-jos">${tt("o.qr")}</p></div>`
    : piciorHtml(true)}`;
  if (peCalculator) sigiliuInFundal(el.querySelector(".o-qr .qr"));
  // The message to the card's owner goes through the phone's share sheet (Messages, WhatsApp, Messenger); where there is
  // none, it is copied to paste in the chat the card came from.
  document.getElementById("cer")?.addEventListener("click", async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    const text = t("o.ios-mesaj");
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch (x) { if ((x as Error).name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(text);
      b.textContent = t("o.ios-copiat", nume);
    } catch {
      prompt(t("o.ios-cer"), text);
    }
  });
  document.getElementById("copiez")?.addEventListener("click", async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(adresa);
      b.textContent = t("trimit.copiat");
    } catch {
      prompt(t("trimit.copiez"), adresa);
    }
  });
}
