// Builds colshare.app's link pages from the sources in this repo, with the same settings the site's build uses, and
// compares each with the file colshare.app serves. Every byte must match: then the page your browser runs is this code.
// It lives in topograf as scripts/colshare-pagini.mjs and is published as scripts/pagini.mjs (scripts/colshare-crypto.mjs).
//   npm run pagini              build and compare with the live site
//   npm run pagini -- --scrie   also write the built files to dist/ (to read or diff them)
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const SITE = "https://colshare.app";

/** Each page's source and the address colshare.app serves it at. */
export const PAGINI = [
  ["src/acte/pagina-link.ts", "/p/p.js", "opening a send link"],
  ["src/acte/pagina-cerere.ts", "/a/a.js", "answering an ask"],
  ["src/acte/pagina-copie.ts", "/copie/c.js", "making a safe copy"],
  ["src/acte/pagina-om.ts", "/o/o.js", "a People card"],
  ["src/acte/pagina-dovada.ts", "/v/v.js", "checking a receipt"],
  ["src/acte/pagina-formular.ts", "/acte/formular.js", "the withdrawal, cancellation and report forms"],
];

/** The site's build settings (its scripts/acte.mjs), unchanged. */
const SETARI = {
  bundle: true, format: "esm", platform: "browser", target: ["es2022", "chrome100", "safari16"], minify: true, write: false,
  legalComments: "none", charset: "utf8",
  banner: { js: "// Generat de scripts/acte.mjs din src/acte: nu se editează.\n/* eslint-disable */" },
};

export async function construiesc(sursa) {
  return (await build({ ...SETARI, entryPoints: [join(root, sursa)], logLevel: "silent" })).outputFiles[0].text;
}

const sha = (s) => createHash("sha256").update(s).digest("hex");

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const scrie = process.argv.includes("--scrie");
  let rau = 0;
  for (const [sursa, adresa, ce] of PAGINI) {
    const local = await construiesc(sursa);
    if (scrie) {
      mkdirSync(join(root, "dist", adresa, ".."), { recursive: true });
      writeFileSync(join(root, "dist", adresa), local);
    }
    // No cache: the file as the site serves it now.
    const r = await fetch(SITE + adresa, { cache: "no-store" });
    const live = r.ok ? await r.text() : undefined;
    const ok = live === local;
    if (!ok) rau++;
    console.log(`${ok ? "same     " : "DIFFERENT"} ${adresa.padEnd(20)} ${sha(local).slice(0, 16)}  ${live === undefined ? `(site answered ${r.status})` : ok ? "" : `live ${sha(live).slice(0, 16)}`}  ${ce}`);
  }
  console.log(rau ? `\n${rau} page(s) differ from what colshare.app serves.` : "\nEvery page colshare.app serves is built from this code.");
  process.exit(rau ? 1 : 0);
}
