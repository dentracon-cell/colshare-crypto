// The lock on the dossiers' copy on the phone (docs/decisions.md 2026-10-15 "A lock on the dossiers on the phone"): when
// the surveyor puts it on, the phone makes a P-256 key pair, keeps the private key wrapped under a key that only the
// phone's fingerprint (a passkey's PRF output) or a PIN gives (src/teren/lacat.ts), and sends the public key to the
// program in a "lacat" envelope. The program sends the copy key sealed to that public key, so the copy key never rests
// on the phone in the clear: a lost phone, even read out, opens nothing without the fingerprint or the PIN. Web Crypto
// only: the program, the phone page and the tests use this same file.
//
// Sealed: the ephemeral P-256 public key (65 bytes, uncompressed) ‖ nonce (12) ‖ AES-256-GCM with the key
// HKDF-SHA-256(ECDH secret, salt = ephemeral key ‖ recipient's key, info "topograpp-lacat-v1").
import { b64url } from "./plic.ts";

/** A P-256 public key, raw and uncompressed. */
export const LUNGIME_PUBLICA = 65;
const INFO = new TextEncoder().encode("topograpp-lacat-v1");
const EC = { name: "ECDH", namedCurve: "P-256" } as const;

const lipeste = (...p: Uint8Array[]) => {
  const out = new Uint8Array(p.reduce((s, x) => s + x.length, 0));
  let i = 0;
  for (const x of p) { out.set(x, i); i += x.length; }
  return out;
};

export const estePublica = (b: Uint8Array) => b.length === LUNGIME_PUBLICA && b[0] === 4;

async function cheieAes(secret: ArrayBuffer, sare: Uint8Array, info: Uint8Array): Promise<CryptoKey> {
  const baza = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: sare as BufferSource, info: info as BufferSource }, baza, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

/**
 * `date` sealed to the phone's public key (the program's side): only the private key the lock guards opens it.
 * `info`: another use of the same sealing (the papers app's asks), so a sealed item of one use never opens as the other.
 */
export async function sigileazaPentruLacat(publica: Uint8Array, date: Uint8Array, info: Uint8Array = INFO): Promise<Uint8Array> {
  if (!estePublica(publica)) throw new Error("lacăt: cheie publică greșită");
  const destinatar = await crypto.subtle.importKey("raw", publica as BufferSource, EC, false, []);
  const efemera = await crypto.subtle.generateKey(EC, true, ["deriveBits"]) as CryptoKeyPair;
  const ef = new Uint8Array(await crypto.subtle.exportKey("raw", efemera.publicKey));
  const secret = await crypto.subtle.deriveBits({ name: "ECDH", public: destinatar }, efemera.privateKey, 256);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, await cheieAes(secret, lipeste(ef, publica), info), date as BufferSource);
  return lipeste(ef, nonce, new Uint8Array(ct));
}

/** Opens what was sealed to `publica` with its private key; undefined for anything else (another key, altered). */
export async function deschideCuLacat(privata: CryptoKey, publica: Uint8Array, sigilat: Uint8Array, info: Uint8Array = INFO): Promise<Uint8Array | undefined> {
  if (sigilat.length < LUNGIME_PUBLICA + 12 + 16) return undefined;
  try {
    const ef = sigilat.subarray(0, LUNGIME_PUBLICA);
    const expeditor = await crypto.subtle.importKey("raw", ef as BufferSource, EC, false, []);
    const secret = await crypto.subtle.deriveBits({ name: "ECDH", public: expeditor }, privata, 256);
    const k = await cheieAes(secret, lipeste(ef, publica), info);
    return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: sigilat.subarray(LUNGIME_PUBLICA, LUNGIME_PUBLICA + 12) as BufferSource }, k, sigilat.subarray(LUNGIME_PUBLICA + 12) as BufferSource));
  } catch {
    return undefined;
  }
}

/** A new key pair for a lock: the private key extractable once, to be wrapped. */
export async function perecheLacat(): Promise<{ privata: Uint8Array; publica: Uint8Array }> {
  const k = await crypto.subtle.generateKey(EC, true, ["deriveBits"]) as CryptoKeyPair;
  return {
    privata: new Uint8Array(await crypto.subtle.exportKey("pkcs8", k.privateKey)),
    publica: new Uint8Array(await crypto.subtle.exportKey("raw", k.publicKey)),
  };
}

/** The private key from its PKCS#8 bytes, not extractable again. */
export const importaPrivata = (pkcs8: Uint8Array) => crypto.subtle.importKey("pkcs8", pkcs8 as BufferSource, EC, false, ["deriveBits"]);

/**
 * A copy key's fingerprint, sent with it (22 characters): the phone sees the key changed without opening it (what it
 * kept of the copy goes). A hash of 32 random bytes: it tells nothing of the key.
 */
export async function amprentaCheiiCopiei(cheie: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", lipeste(new TextEncoder().encode("topograpp-copie-amprenta:"), cheie) as BufferSource);
  return b64url(new Uint8Array(h)).slice(0, 22);
}
