# colshare-crypto

The client-side security code of [Colshare](https://colshare.app) and Colshare Business: the encryption, the one-time
links, sealing documents to a firm, and redaction. It is published so that anyone can check what the apps actually do
with a document, instead of taking our word for it.

This is the same code that runs in the Colshare apps and on colshare.app, copied here unchanged. It is not a library
and is not meant to be installed. Read it, run its tests and try to break it.

## What the code does

**Send links that open once.** A document is encrypted in the browser or app with AES-256-GCM under a fresh 32-byte
key. The encrypted bytes go to the relay, and the link is `https://colshare.app/p/#<id>.<key>`. The key sits after the
`#`, which browsers never send to a server, so the relay only ever holds bytes it cannot open. Loading the link page
does not use the link up. It is opened, and then deleted by the relay, only when the recipient taps the open button.
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

## What is not here

- **The relay (server).** It stores encrypted chunks, enforces the one opening of a link, rate limits and expiry. Its
  side of the guarantee is "it only ever receives what this code sends", which you can check here. The tests use a
  small in-memory stand-in for it.
- **The apps' and the desk's interface**, payments, licensing and e-mail.
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

## Reporting a problem

Write to service@colshare.app (also listed in
[colshare.app/.well-known/security.txt](https://colshare.app/.well-known/security.txt)). Please don't open a public
issue for a vulnerability until it is fixed.

## Licence

[AGPL-3.0](LICENSE). Copyright © 2026 DTCONCIERGE S.R.L.
