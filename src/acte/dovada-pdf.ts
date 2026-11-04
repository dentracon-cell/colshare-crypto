// A safe copy's proof found in its PDF's bytes, for the send link's page (./pagina-link.ts), which loads ./dovada.ts only
// to check the file before it offers /v/ already checking that statement.

/**
 * The proof as ./dovada.ts verificFisier reads it (`CHEIE_PDF` "ColshareProof", the statement, the file signature, an
 * optional certificate): the same pattern, so both read the same statement whatever else the file carries (attack round
 * 19, M1).
 */
const DOVADA = /\/ColshareProof \(([A-Za-z0-9_.-]+)~([A-Za-z0-9_-]{86})(?:~([A-Za-z0-9_.-]{20,1300}))?\)/;
/** The marker alone: a PDF that carries it is offered the check, even when its proof can't be read. */
const SEMN = new TextEncoder().encode("/ColshareProof (");

/**
 * A safe copy's signed statement ("<statement>.<key>.<signature>", ./dovada.ts verific). "" for a marked copy whose
 * proof can't be read; undefined for any other file. Only a hint: the link page prefills /v/ with it after the file's
 * own check holds (user test 2026-11-04, L15; attack round 19, M1).
 */
export function dovadaDin(f: { tip: string; date: Uint8Array }): string | undefined {
  if (f.tip !== "application/pdf") return undefined;
  const d = f.date;
  let are = false;
  outer: for (let i = 0; i <= d.length - SEMN.length; i++) {
    for (let j = 0; j < SEMN.length; j++) if (d[i + j] !== SEMN[j]) continue outer;
    are = true;
    break;
  }
  if (!are) return undefined;
  return DOVADA.exec(new TextDecoder("latin1").decode(d))?.[1] ?? "";
}
