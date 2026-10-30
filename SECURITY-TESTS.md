# Security tests

What we tested, what we found and what we did about it. This is a summary: it says what each problem was and how it
was fixed, not how to exploit it.

**These are self-tests, not an independent audit.** They were run by AI agents, the same kind of tools that wrote much
of the code, directed by the developer. An independent review will follow when Colshare can pay for one, and its
report will be published here.

## 29 October 2026: three rounds of attack tests

Agents attacked a local copy of the whole service (server, link pages, apps and the Colshare Business desk) the way a
bad actor would. The live site got harmless outside checks only, and no real data was touched. Each finding was
checked against the code before it was listed. Everything fixed was fixed the same day or the next, and the fixes are
covered by tests.

### Round 1: links, mailboxes, the firm API, hostile input, limits, e-mail and payments

Nothing Critical or High. What held up under attack:

- A link opens once, even with two downloads racing for its last piece (25 out of 25 runs).
- Nobody reads an ask, a mailbox or another firm's documents without its key.
- Forged, replayed or reused signed requests are refused, and so are requests from a removed device.
- Forged or replayed payment notifications are refused, and prices can't be changed.
- No outside text reaches a page unescaped. Cross-site requests are refused.
- The live site has a strict content security policy, and no source code, secrets or source maps can be reached.

| Problem | Severity | Status |
|---|---|---|
| A stranger with an ask's link could block it for a few hours | Medium | Fixed |
| A few networks could fill the shared hourly upload limit for everyone | Medium | Fixed |
| A PDF the cleaner couldn't read could be passed on from the desk uncleaned | Medium | Fixed |
| "Send by e-mail" could send Colshare-branded mail to any address | Medium-Low | Fixed (limits per sender) |
| Rate limits read the caller's address from a header only our host guarantees | Low | Fixed: tied to the host's own header |
| PDF bookmarks and web links survived the cleaner | Low | Fixed |
| Hidden text-direction marks weren't stripped from file names and titles | Low | Fixed |
| An approval could add a device even when its signed statement was refused | Low | Fixed |
| Anyone who saw a pairing code could spoil it | Low | Fixed |
| Two small display and error-code issues | Low | Fixed |

### Round 2: hostile files, and handing a departed colleague's documents over

| Problem | Severity | Status |
|---|---|---|
| An image declaring huge dimensions could freeze the desk | High | Fixed (header checked before decoding, 60 MP cap) |
| A PDF with thousands of pages could freeze the desk | High | Fixed (300-page cap) |
| A hand-over link showed the firm's staff list to whoever held it | Medium | Fixed |
| A PDF with a giant page could crash a download | Medium | Fixed |
| A hand-over link kept working after its receiver was removed | Low | Fixed |
| Anyone with a hand-over link could put junk into the receiver's inbox | Low | Fixed |
| Any device could mark any person as leaving (their consent was still needed to hand over) | Low | Fixed (rate limited) |

### Round 3: the cryptographic protocol, the Android apps, e-mail and domains

| Problem | Severity | Status |
|---|---|---|
| Someone able to write to our server's storage could hand a firm's desk a forged key, so a client's answer could be opened | **Critical** | Fixed: every key generation is signed by the one before it, and a new device only joins with the inviting device's approval |
| A removed device that knew the licence key could rejoin until the next key change | Medium | Fixed: rejoining needs the firm's recovery key |
| The safety code didn't cover the key a colleague's new device brings | Medium | Fixed |
| No DMARC on our domains, so forged mail "from" us wasn't refused | Medium | Fixed |
| Camera photos went to app storage other apps could read on Android 7 to 10 | Medium | Fixed: photos stay in the app's private storage |
| A fingerprint added to the phone could open Colshare | Medium | Fixed: a new fingerprint needs a backup PIN first |
| Decrypted PDFs were opened in another app's viewer | Medium | Fixed: PDFs open inside the app, another app only when asked |
| Shared files were kept without asking | Low | Fixed: kept only after "Keep" |
| Five smaller Android items (files sent to the Business app, links taken from other sites, pairing by link without asking, taps through screen overlays, the field app's missing page policy and recents preview) | Low | Fixed |
| Four smaller protocol items (old keys in the journal, replay window, safety code strength, receipt digest length) | Low | Fixed |

What held up in round 3: elliptic-curve points are validated, every sealing context has its own key label, nonces are
random, secrets are compared in constant time, the backup file uses PBKDF2 at 600,000 rounds, Android backups are off,
release builds aren't debuggable and carry no secrets, and there's no cleartext traffic.

The Android fixes reach phones with the apps' first public versions, which were in Google Play review on 30 October
2026.

## Also fixed: one-time links

A commenter pointed out that a link's key stays in chat and browser histories, so "opens once" must mean the server
deletes the file. It always did, but after the first download of the last piece the rest stayed up to 15 minutes
while the page confirmed the opening, and someone else holding the link could fetch it in that time. Now the download
that takes the last piece deletes everything before it returns.

## Also fixed: who signed a firm's receipt

A forged "firm receipt" could show "the signature holds" on the receipt-check page under any firm's name, because the
page checked that the receipt wasn't changed, not who the firm was. Since 30 October, a firm's receipt PDF carries
the firm's certificate, signed by Colshare. The check page names the firm as checked only when that certificate is
for the exact key the receipt is signed with and was valid on the receipt's day. From the QR code alone, which has no
room for the certificate, the firm's name is marked "not checked". The check still runs entirely in your browser.

## Also fixed: a link's id alone

Every request for a link carries its id, so the id can show up in places like hosting logs. Before 30 October, anyone
who had only the id could download the link's encrypted chunks and use the link up, so the real recipient would find
it already opened. Now a link only downloads with a token derived from its key, which never leaves the browser, and
the server keeps only a fingerprint of that token. A wrong or missing key is refused, and the link stays for the right
one.

## Kept on purpose

These were found and left as they are, for the reasons given.

- **The order page tells whether a tax ID already has a licence.** The buyer must know that before paying. The
  answer is cached so it can't be used to flood the business register with lookups.
- **An invitation link works like a password until it is approved.** The approving device names the new device and
  warns against approving a code someone asked you to scan.
- **A link sent by e-mail through Colshare passes its key through our server** on its way to the recipient. It is
  stated in the privacy notice. Send the link yourself to avoid it.
- **Any device in a firm can remove any other, the owner's included.** Small firms share admin work. Removal rotates
  the keys, and handing someone's documents over still needs their consent.
- **A wildcard DNS record points unused subdomains at our host.** It's the host's default record and can't be
  deleted. Another account can't take a subdomain without proving it owns the domain.

## Reporting a problem

See the README's "Reporting a problem", or https://colshare.app/.well-known/security.txt.
