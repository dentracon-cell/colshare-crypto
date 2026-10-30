# Threat model

What Colshare protects, from whom, what it assumes, and where an audit should look. Written for security reviewers.
The code paths named here are in this repository unless marked otherwise.

## What Colshare is

Colshare is an Android app and a set of web pages for sending personal documents (ID cards, passports, contracts,
statements) so that no one in between can read them. Colshare Business lets a firm, such as an accountant or a
surveyor, ask clients for documents and receive them on the firm's own devices. There are no user accounts, no phone
numbers and no e-mail addresses for people. The server is a relay for encrypted bytes.

## Assets

- **Document contents and file names,** in transit and on the relay.
- **The keys** that open them: a link's key, an ask's private key, a person's key pair, a firm's key ring and its
  recovery key.
- **Who sends to whom:** the relay sees random ids and sizes, and does not learn names or documents.
- **The integrity of what is shown as checked:** a firm's verified name, a contact marked "checked", a receipt's
  "signature holds".
- **Documents at rest on the phone,** in an encrypted store behind a fingerprint, PIN or passphrase.

## Adversaries

| Adversary | Can | Must not be able to |
|---|---|---|
| **The relay or anyone who controls it** (Colshare's server, a compromised host, a rogue employee, a legal order to the host) | Read and change everything it stores, refuse or delay service, answer with anything | Read any document, file name or key. Swap a firm's key, a contact's key or a firm certificate without it showing. Open a link it only knows the id of. |
| **A network attacker** | See and change traffic | Anything beyond what the relay can (TLS is assumed, but not relied on for confidentiality) |
| **Someone who gets a link** (forwarded chat, browser history, shoulder) | Open it if it is still unopened | Open it after the intended recipient did. Use it up knowing only its id. |
| **A malicious document** (a client sends a crafted PDF or image) | Be opened by the firm's desk | Run code, freeze the desk, leak through PDF actions. |
| **Another app on the same phone** | Read shared storage, overlay screens | Read documents or photos, see the app in the recents preview, tap through an overlay. |
| **A person with the phone** who knows its screen PIN | Enrol a new fingerprint | Open Colshare with that new fingerprint without the backup PIN. |
| **A former employee of a firm** | Keep their old device and copies | Rejoin, remove the owner, read new documents after the key change. |

## Trust assumptions

- The phone's OS and Android Keystore are not compromised. Root malware on the phone is out of scope.
- Web Crypto (browser and Android WebView) is correct. There is no home-made cryptography.
- The page code a browser runs is the code in this repository. `npm run pagini` checks this for the six link pages.
  The Android apps are not yet reproducible from this repository.
- **A first key exchange is only as good as its channel.** A card scanned off a screen, or a link sent through
  another app, does not pass through the relay. A key that arrives through the relay (a People greeting) is shown as
  unchecked until the user scans the other phone's key code or compares the safety code.
- Users compare the safety code or scan the key code before trusting an unchecked contact. The app marks the
  difference, but does not force it.

## Design in one page

- **Send links:** AES-256-GCM under a fresh 32-byte key. The link is `colshare.app/p/#<id>.<key>`, and the key sits after
  the `#`, which browsers never send. Downloads need a token derived from the key (`tokenLink`), and the relay keeps
  only its hash. The last chunk is served once, under compare-and-swap, and deleted as it is served. (`src/acte/link.ts`)
- **Asks and firms:** each ask has a P-256 key pair, and the link carries only the public key. Items are sealed with
  ephemeral ECDH, HKDF-SHA-256 and AES-256-GCM, with a separate context label for each use
  (`src/core/teren/lacat.ts`). A firm's ask carries a certificate signed by colshare.app with ECDSA P-256 (`src/acte/firma.ts`).
- **A firm's key ring:** one P-256 key per generation, sealed to each device. Each generation is signed by the one
  before it, a device never replaces a generation it holds, and a new device's first ring is signed by the device
  that invited it. Removing a device rotates the generation. A firm has an owner who alone adds people and removes
  others' devices.
- **People:** each phone has a P-256 key pair and a mailbox. Envelopes are sealed to the recipient, carry an HMAC under
  the two static keys' ECDH, and bind the relay item and time against replay (`src/acte/oameni.ts`). The safety code
  is 30 digits, from PBKDF2-SHA-256 at 200,000 rounds per key.
- **Receipts and safe copies:** ECDSA statements in a QR code, plus a file proof over every picture's SHA-256. A firm
  receipt's PDF carries the firm's certificate (`src/acte/dovada.ts`).
- **Redaction:** the output is rebuilt as pictures with the black painted in, so no text layer is left
  (`src/acte/innegrire.ts`). Received PDFs are cleaned of active content (`src/acte/pdf-curat.ts`). Received pictures are
  size-checked by their header before decoding (`src/acte/marime-imagine.ts`).

## Scope for an audit

**In this repository (public):** everything under `src/`, and the six link pages it builds. Priority order:

1. The firm key ring and its chaining, device invitation and approval (`firma.ts`, `birou/legatura.ts`)
2. Sealing and opening (`core/teren/lacat.ts`, `core/teren/plic.ts`, `link.ts`)
3. People: envelopes, replay protection, the safety code, checking by scan (`oameni.ts`)
4. Receipts and file proofs (`dovada.ts`)
5. Redaction and PDF cleaning (`innegrire.ts`, `pdf-pagini.ts`, `pdf-curat.ts`, `copie-sigura.ts`)
6. The link pages as a whole (`pagina-*.ts`): XSS, what reaches the server, key handling in the browser

**Available privately on request:** the relay and firm API (Node on Vercel, Upstash Redis), the Android apps (Capacitor
with Java plugins for the Keystore, the camera, file sharing and background sending), and the Colshare Business desk.
We would give an auditor read access.

**Out of scope:** the phone's OS, the browser, Google Play, the hosting provider's own security, and payments (Stripe).

## Known and accepted

The findings we chose to keep, and why, are in [SECURITY-TESTS.md](SECURITY-TESTS.md). The main ones: a link sent by
e-mail through Colshare passes its key through our server, and an invitation link works like a password until it is
approved (it expires after 15 minutes, and only the first device to answer can use it).

## Reporting

See the README's "Reporting a problem", or https://colshare.app/.well-known/security.txt.
