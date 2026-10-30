// A QR code for a short text (the phone's address of the dossier, about 50 characters): byte mode, error correction
// level M, versions 1–15 (a People card in the papers app is about 200–400 bytes), written here to need no library. ISO/IEC 18004: Reed–Solomon over GF(256) with the
// polynomial 0x11D, the finder, timing and alignment patterns, format and version information; mask 0–7 by the lowest
// penalty, as a reader expects nothing else.

// [data codewords per block, number of blocks] by version, level M; EC codewords per block.
const BLOCURI_M: { ec: number; grupuri: [number, number][] }[] = [
  { ec: 10, grupuri: [[16, 1]] }, { ec: 16, grupuri: [[28, 1]] }, { ec: 26, grupuri: [[44, 1]] }, { ec: 18, grupuri: [[32, 2]] },
  { ec: 24, grupuri: [[43, 2]] }, { ec: 16, grupuri: [[27, 4]] }, { ec: 18, grupuri: [[31, 4]] }, { ec: 22, grupuri: [[38, 2], [39, 2]] },
  { ec: 22, grupuri: [[36, 3], [37, 2]] }, { ec: 26, grupuri: [[43, 4], [44, 1]] }, { ec: 30, grupuri: [[50, 1], [51, 4]] },
  { ec: 22, grupuri: [[36, 6], [37, 2]] }, { ec: 22, grupuri: [[37, 8], [38, 1]] }, { ec: 24, grupuri: [[40, 4], [41, 5]] },
  { ec: 24, grupuri: [[41, 5], [42, 5]] },
];
const ALINIERE: number[][] = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70]];

// GF(256) with x^8 + x^4 + x^3 + x^2 + 1.
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const mul = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function corectie(date: number[], n: number): number[] {
  let gen = [1];
  for (let i = 0; i < n; i++) {
    const g: number[] = Array.from({ length: gen.length + 1 }, () => 0);
    gen.forEach((c, j) => { g[j] ^= c; g[j + 1] ^= mul(c, EXP[i]); });
    gen = g;
  }
  const rest = [...date, ...Array.from({ length: n }, () => 0)];
  for (let i = 0; i < date.length; i++) {
    const c = rest[i];
    if (c) gen.forEach((g, j) => { rest[i + j] ^= mul(g, c); });
  }
  return rest.slice(date.length);
}

/** The QR code of `text` as rows of dark (true) modules, without the quiet zone. */
export function codQr(text: string, masca?: number): boolean[][] {
  const bytes = [...new TextEncoder().encode(text)];
  // The smallest version whose data holds the mode (4 bits), the count (8 bits to version 9, 16 from 10) and the bytes.
  const v = BLOCURI_M.findIndex((b, i) => b.grupuri.reduce((s, [d, n]) => s + d * n, 0) * 8 >= 4 + (i < 9 ? 8 : 16) + bytes.length * 8) + 1;
  if (v < 1 || v > BLOCURI_M.length) throw new Error("Textul e prea lung pentru codul QR.");
  const { ec, grupuri } = BLOCURI_M[v - 1];
  const capacitate = grupuri.reduce((s, [d, n]) => s + d * n, 0);
  // The bit stream: mode 0100 (byte), the count (8 bits up to version 9, 16 from 10), the bytes, the terminator, padding.
  const biti: number[] = [];
  const pune = (val: number, n: number) => { for (let i = n - 1; i >= 0; i--) biti.push((val >> i) & 1); };
  pune(4, 4); pune(bytes.length, v < 10 ? 8 : 16); bytes.forEach((b) => pune(b, 8));
  pune(0, Math.min(4, capacitate * 8 - biti.length));
  while (biti.length % 8) biti.push(0);
  const date: number[] = [];
  for (let i = 0; i < biti.length; i += 8) date.push(parseInt(biti.slice(i, i + 8).join(""), 2));
  for (let p = 0; date.length < capacitate; p++) date.push(p % 2 ? 0x11 : 0xec);
  // Blocks, their correction, interleaved.
  const blocuri: number[][] = [];
  let k = 0;
  for (const [d, n] of grupuri) for (let i = 0; i < n; i++) { blocuri.push(date.slice(k, k + d)); k += d; }
  const ecs = blocuri.map((b) => corectie(b, ec));
  const sir: number[] = [];
  for (let i = 0; i < Math.max(...blocuri.map((b) => b.length)); i++) for (const b of blocuri) if (i < b.length) sir.push(b[i]);
  for (let i = 0; i < ec; i++) for (const e of ecs) sir.push(e[i]);

  const n = 17 + 4 * v;
  const m: (boolean | null)[][] = Array.from({ length: n }, () => Array.from({ length: n }, (): boolean | null => null));
  const rezervat: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => false));
  const set = (r: number, c: number, val: boolean) => { if (r >= 0 && c >= 0 && r < n && c < n) { m[r][c] = val; rezervat[r][c] = true; } };
  const finder = (r0: number, c0: number) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      set(r0 + r, c0 + c, inside && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)));
    }
  };
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
  for (let i = 8; i < n - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const al = ALINIERE[v - 1];
  for (const r of al) for (const c of al) {
    if ((r === 6 && c === 6) || (r === 6 && c === al.at(-1)) || (r === al.at(-1) && c === 6)) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
  }
  set(n - 8, 8, true); // the dark module
  // Room for the format information (and the version's, from 7).
  for (let i = 0; i < 9; i++) { if (!rezervat[8][i]) set(8, i, false); if (!rezervat[i][8]) set(i, 8, false); }
  for (let i = 0; i < 8; i++) { set(8, n - 1 - i, false); set(n - 1 - i, 8, false); }
  if (v >= 7) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { set(n - 11 + j, i, false); set(i, n - 11 + j, false); }

  // The codewords in the zigzag, two columns at a time from the right, skipping the timing column.
  const toti = sir.flatMap((b) => Array.from({ length: 8 }, (_, i) => ((b >> (7 - i)) & 1) === 1));
  let idx = 0;
  for (let c = n - 1; c > 0; c -= 2) {
    if (c === 6) c--;
    for (let i = 0; i < n; i++) {
      const r = ((c + 1) & 2) === 0 ? n - 1 - i : i;
      for (const cc of [c, c - 1]) if (!rezervat[r][cc]) m[r][cc] = idx < toti.length ? toti[idx++] : false;
    }
  }

  const MASTI: ((r: number, c: number) => boolean)[] = [
    (r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (_r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];
  const bch = (val: number, gen: number, lung: number) => {
    let x = val << lung;
    const grad = (y: number) => 31 - Math.clz32(y);
    while (grad(x) >= grad(gen) && x) x ^= gen << (grad(x) - grad(gen));
    return (val << lung) | x;
  };
  const cuMasca = (k: number) => {
    const q = m.map((row, r) => row.map((x, c) => (rezervat[r][c] ? !!x : !!x !== MASTI[k](r, c))));
    // Format: level M (00), the mask, BCH(15,5), XOR 101010000010010.
    const f = bch((0b00 << 3) | k, 0b10100110111, 10) ^ 0b101010000010010;
    const bit = (i: number) => ((f >> i) & 1) === 1;
    // First copy around the top-left finder: down column 8, then along row 8 leftwards.
    for (let i = 0; i <= 5; i++) q[i][8] = bit(i);
    q[7][8] = bit(6); q[8][8] = bit(7); q[8][7] = bit(8);
    for (let i = 9; i < 15; i++) q[8][14 - i] = bit(i);
    // Second copy: along row 8 by the top-right finder, then up column 8 by the bottom-left one.
    for (let i = 0; i < 8; i++) q[8][n - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) q[n - 15 + i][8] = bit(i);
    if (v >= 7) {
      const vi = bch(v, 0b1111100100101, 12);
      for (let i = 0; i < 18; i++) { const b = ((vi >> i) & 1) === 1; q[n - 11 + (i % 3)][Math.floor(i / 3)] = b; q[Math.floor(i / 3)][n - 11 + (i % 3)] = b; }
    }
    return q;
  };
  const penalitate = (q: boolean[][]) => {
    let p = 0;
    for (const linii of [q, q[0].map((_, c) => q.map((row) => row[c]))]) {
      for (const row of linii) { let run = 1; for (let i = 1; i <= row.length; i++) { if (i < row.length && row[i] === row[i - 1]) run++; else { if (run >= 5) p += run - 2; run = 1; } } }
    }
    for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) { const x = q[r][c]; if (x === q[r][c + 1] && x === q[r + 1][c] && x === q[r + 1][c + 1]) p += 3; }
    const negre = q.flat().filter(Boolean).length;
    return p + Math.floor(Math.abs((negre * 100) / (n * n) - 50) / 5) * 10;
  };
  if (masca !== undefined) return cuMasca(masca);
  let best = cuMasca(0), bestP = penalitate(best);
  for (let k = 1; k < 8; k++) { const q = cuMasca(k), pp = penalitate(q); if (pp < bestP) { best = q; bestP = pp; } }
  return best;
}

/** The code as an SVG, with its quiet zone of four modules. */
export function svgQr(text: string, latime = 220): string {
  const q = codQr(text), n = q.length + 8;
  const d = q.flatMap((row, r) => row.map((x, c) => (x ? `M${c + 4} ${r + 4}h1v1h-1z` : ""))).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${latime}" height="${latime}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
