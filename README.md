# colshare-crypto

The client-side security code of [Colshare](https://colshare.app) and Colshare Business: the encryption, the one-time
links, sealing documents to a firm, and redaction. It is published so that anyone can check what the apps actually do
with a document, instead of taking our word for it.

This is the same code that runs in the Colshare apps and on colshare.app, copied here unchanged. It is not a library
and is not meant to be installed. Read it, run its tests and try to break it.

It also holds the full source of colshare.app's link pages, the pages a link opens in your browser. You can build them
yourself and check that the site serves exactly that code (below).

## What the code does

**Send links that open once.** A document is encrypted in the browser or app with AES-256-GCM under a fresh 32-byte
key. The encrypted bytes go to the relay, and the link is `https://colshare.app/p/#<id>.<key>`. The key sits after the
`#`, which browsers never send to a server, so the relay only ever holds bytes it cannot open. Loading the link page
does not use the link up, and the relay serves the chunks only with a token derived from the key (`tokenLink`), so
a link's id alone can neither read it nor use it up. It is opened, and then deleted by the relay, only when the recipient taps the open button.
See `src/acte/link.ts`.

**Asks and firms.** Someone who asks for documents (a person, or a firm through Colshare Business) has a P-256 key pair,
and the ask link carries only the public key. The sender's browser seals each document to that key with an ephemeral
ECDH key, HKDF-SHA-256 and AES-256-GCM, with a context label per use, so one kind of sealed item never opens as
another. A firm's ask also carries a certificate signed with ECDSA P-256, so the client sees the firm's checked name
and tax ID. See `src/core/teren/lacat.ts`, `src/acte/firma.ts` and `src/acte/birou/legatura.ts` (pairing a firm's
phone and computer by QR code).

**Sending between people.** Each phone has a P-256 key pair and a mailbox on the relay. Envelopes are sealed to the
recipient's key and carry an HMAC under the two people's keys, so the recipient knows who sent them and the relay can't
replay an old one. See `src/acte/oameni.ts`.

**Redaction.** Numbers are found in the page's text (a PDF's text layer, or OCR of a photo) and proposed as boxes. The
person keeps or drops each box and can draw more. The output is a new file where every page is a picture with the
black painted into its pixels, so there is no text layer left to select or copy and nothing sits under a box. The
original is never changed. See `src/acte/innegrire.ts`, `src/acte/pdf-pagini.ts` and `src/acte/copie-sigura.ts`
(the watermark naming who a copy is for).

**Inert PDFs.** A PDF a client sends is stripped of anything that can act (scripts, launch actions, attached files,
forms, annotations) before a firm keeps it. See `src/acte/pdf-curat.ts`.

Everything uses the platform's Web Crypto API. There is no home-made cryptography.

## Check that colshare.app runs this code

When you open a Colshare link, your browser runs one of six scripts from colshare.app. This repo has everything they
are built from, and a script that builds them with the site's own settings and compares each byte with what the site
serves right now:

```bash
npm install
npm run pagini
```

| Page | Script | What it does |
|---|---|---|
| `colshare.app/p/` | `/p/p.js` | opens a send link |
| `colshare.app/a/` | `/a/a.js` | answers an ask for documents |
| `colshare.app/copie/` | `/copie/c.js` | makes a safe copy |
| `colshare.app/o/` | `/o/o.js` | shows a People card |
| `colshare.app/v/` | `/v/v.js` | checks a receipt |
| `colshare.app/acte/formular` | `/acte/formular.js` | the withdrawal, cancellation and report forms |

"same" on every line means the page your browser runs is this code, built with esbuild 0.28.2 (pinned in
`package.json`). `npm run pagini -- --scrie` also writes the built files to `dist/`, to read or diff them. If a line
says "DIFFERENT", the site changed after this repo was last updated, or something is wrong. Either way, please tell us.

You can also watch the key stay in your browser. Open a link with the developer tools' Network tab open: the requests
carry the link's id, never the part after the `#`.

The phone apps are not covered by this check yet. Their builds are not reproducible from this repo.

## What is not here

- **The relay (server).** It stores encrypted chunks, enforces the one opening of a link, rate limits and expiry. Its
  side of the guarantee is "it only ever receives what this code sends", which you can check here. The tests use a
  small in-memory stand-in for it.
- **The phone apps' and the Colshare Business desk's interface**, payments, licensing and e-mail. The link pages'
  interface is here.
- **The internal documents** that comments refer to (`decisions.md`, `docs/…`). They record why something was decided
  and are not published.

## Reading the code

Identifiers are Romanian and comments are English. A few words that come up everywhere:

| Word | Meaning |
|---|---|
| `cheie` | key |
| `sigilat`, `sigileaza` | sealed, seal |
| `pachet` | package (the documents of one send) |
| `cerere` | ask (a request for documents) |
| `lacat` | lock (sealing to a public key) |
| `firma` | firm |
| `oameni` | people |
| `legatura` | pairing of devices |
| `innegrire` | blacking out (redaction) |
| `copie sigura` | safe copy (watermarked, redacted) |
| `plic` | envelope |

## Running the tests

```bash
npm install
npm test
npm run typecheck
```

The tests check that a link opens only with its key, that a changed byte is refused, that the key and the document
never reach the relay, that a link opens once, that sealed items open only with the matching private key, and that a
redacted PDF has no text layer and none of the hidden numbers in its bytes. They run on Node with
[@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) in place of a browser canvas.

## Security tests

What we protect, from whom and where to look is in [THREAT-MODEL.md](THREAT-MODEL.md). What we tested, what we found and what we fixed is in [SECURITY-TESTS.md](SECURITY-TESTS.md). Those were self-tests,
not an independent audit.

## Reporting a problem

Write to service@colshare.app (also listed in
[colshare.app/.well-known/security.txt](https://colshare.app/.well-known/security.txt)). Please don't open a public
issue for a vulnerability until it is fixed.

## Licence

[AGPL-3.0](LICENSE). Copyright © 2026 DTCONCIERGE S.R.L.
