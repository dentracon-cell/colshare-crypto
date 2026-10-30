// When Colshare is on Google Play, and the invitation to get it that the pages a link opens carry at their foot (/p/,
// /a/ from a person or a firm, /o/, /copie/; decisions.md 2026-10-21 "Where the app's download shows"). Small on
// purpose: the link pages load it without the home page's sources.
import aplicatie from "./aplicatie.json";
import { t, type Cheie } from "./limba.ts";

/**
 * "curand" until the app is on Google Play: the home page offers the free copy tool only, and the invitations link the
 * app's name to the home page (which says it is coming). "live": Play buttons on the home page and, on Android, a Play
 * link under each invitation.
 */
export const LANSARE: "curand" | "live" = "curand";

/** The app's page on Google Play. */
export const PLAY = `https://play.google.com/store/apps/details?id=${aplicatie.id}`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Android only: there is no iPhone app, so a Play link elsewhere would lead nowhere. */
export function peAndroid(ua = globalThis.navigator?.userAgent ?? ""): boolean {
  return /Android/i.test(ua);
}

/**
 * The invitation line: its sentence with the app's name linked to the home page; once the app is live and on Android,
 * "Get Colshare on Google Play" under it. `live` and `android` only for the tests.
 */
export function invitatie(cheie: Cheie, o: { live?: boolean; android?: boolean } = {}): string {
  const nume = esc(aplicatie.nume), text = esc(t(cheie, { app: aplicatie.nume }));
  const i = text.indexOf(nume);
  const fraza = i < 0 ? text : `${text.slice(0, i)}<a href="/">${nume}</a>${text.slice(i + nume.length)}`;
  const play = (o.live ?? LANSARE === "live") && (o.android ?? peAndroid())
    ? `<a class="invit-play" href="${PLAY}" target="_blank" rel="noopener">${esc(t("invit.play", { app: aplicatie.nume }))}</a>` : "";
  return `<p class="invit">${fraza}${play}</p>`;
}
