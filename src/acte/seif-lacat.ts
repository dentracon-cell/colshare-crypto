// The lock screen's stage (docs/decisions.md 2026-10-22, "the app's lock"): colshare.app's entrance lock, drawn in the
// free space between the title and the PIN. The cut seal large, the dial round it (a guilloche rosette, a ring of
// microtext, a scale 0–90), the slit at -27° full of cipher, and the cipher tape winding round the seal. Typing the PIN
// dials it, a notch a digit, right then left as on a safe; a finger circling the seal, or tilting the phone, turns it;
// a wrong PIN shakes the lock and the dial runs back; the right one spins it open, the bolt gives, the seal parts and
// the papers come up. Every layer is drawn once on a canvas and turned by transform; only the tape is drawn each frame.
// app.ts mounts the same element at each redraw, so the lock keeps its state while the screen changes around it.
// The bands, as shares of the seal's size D (the seal's ring is 0.46 D), are colshare-web/home/intro.js tipar()'s.

import { sigiliuSvg } from "./sigiliu.ts";

const UNGHI = (27 * Math.PI) / 180;
const U = { x: Math.cos(UNGHI), y: -Math.sin(UNGHI) };
const N = { x: Math.sin(UNGHI), y: Math.cos(UNGHI) };
const OCRU = "226,165,43", OVAZ = "236,232,223";
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const hash = (n: number) => { const t = Math.sin(n) * 43758.5453; return t - Math.floor(t); };
/** The tape's characters: base64 in no order, as ciphertext reads. */
const SIR = Array.from({ length: 997 }, (_, i) => B64[Math.floor(hash(i * 3.3 + 0.7) * 64)]).join("");
/** The dial's hundred marks; its outer edge (the numbers) at RX of the seal's size. */
const PAS = 3.6, RX = 0.9;
/** From the right PIN: the dial settles and the bolt gives; the seal starts to part; the papers come up as the halves
 * leave, not once they are gone (an empty screen stood between them, 2026-10-25) (ms). At 920 ms the halves (650 ms
 * from 520) were cut at 61% of their way; at 1100 they are nearly out, and what replaces the lock fades in over them
 * (motion audit 2026-11-01, A2). */
const ZAVOR = 450, PARTE = 520, GATA = 1100;
/** The phone's reduced motion, or the app's own Settings › Less motion (html.putina-miscare). */
const liniste = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("putina-miscare");

export interface ScenaLacat {
  readonly el: HTMLElement;
  /** Fits the stage to its place: after each mount, and as the keyboard shrinks it. */
  potriveste(): void;
  /** The PIN's length now: each digit typed turns the dial a notch, right then left; a digit erased turns it back. */
  tasta(n: number): void;
  /** A wrong PIN: the lock shakes and the dial runs back to where it was. */
  refuz(): void;
  /**
   * The PIN being checked (`true`): the dial runs on by itself, so the tap shows at once and nothing stands still while
   * the key is worked out; `false` stops it (a cancelled fingerprint). refuz() and deschide() stop it too.
   */
  asteapta(da: boolean): void;
  /** The right PIN: spins open, the bolt gives, the seal parts; resolves when the papers can come up. */
  deschide(): Promise<void>;
  /** Stops its frames and listeners (the lock screen is gone). */
  opreste(): void;
  /** Turns the dial by `grade` as a hand would (the desk's lock turns it a little now and then while it waits). */
  impinge(grade: number): void;
  /** Called as the dial starts turning fast (a digit typed, a hand, a nudge): the desk's field answers with a wave. */
  laRotire?: () => void;
  /** Where the slit, with its tape, leaves the stage on the right: in the page's pixels, or undefined before it is laid out. */
  iesire(): { x: number; y: number } | undefined;
}

/** How fast the dial must turn (degrees a frame) to count as turning, and how soon after one turn another may be told. */
const ROTIRE_PRAG = 0.6, ROTIRE_PAUZA = 420;

interface Banda { c: HTMLCanvasElement; x: CanvasRenderingContext2D; cale: [number, number, number][]; z: number; ox: number; oy: number; L: number; fond: HTMLCanvasElement | null }

/** A notch of the combination for the n-th digit: 8 to 16 marks, right for odd digits, left for even ones. */
const notch = (i: number) => (i % 2 ? 1 : -1) * (8 + ((i * 5) % 9)) * PAS;

export function scenaLacat(): ScenaLacat {
  const el = document.createElement("div");
  el.className = "seif-scena";
  el.setAttribute("aria-hidden", "true");
  const misca = !liniste();
  let W = 0, H = 0, D = 0, cx = 0, cy = 0, px = 0, py = 0, dpr = 1, Rw = 0, randuri = 1;
  let roti: HTMLCanvasElement[] = [], inele: HTMLCanvasElement[] = [], benzi: Banda[] = [];
  // The dial: where a hand or the tilt put it, the combination typed, and the angle drawn.
  let mana = 0, inclinare = 0, comb = 0, tastat = 0, unghi = 0, inel = 0, k = 0.22;
  let curge = 0, unghiB = 0, ultim = 0, cadru = 0, oprit = false, g0: number | null = null;
  let seRoteste = false, ultimaRotire = -Infinity, asteptand = false, amanare: "nu" | "asteapta" | "gata" = "nu";
  const font = (p: number) => `500 ${p}px "Martian Mono", ui-monospace, monospace`;

  const panza = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] => {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr));
    const x = c.getContext("2d");
    if (x) { x.scale(dpr, dpr); x.lineWidth = 0.7; }
    return [c, x];
  };
  const pune = <T extends HTMLElement>(e: T, st: Partial<CSSStyleDeclaration>): T => { Object.assign(e.style, st); return e; };

  // ------------------------------------------------------------------ drawing (once per size)
  const banda = (x: CanvasRenderingContext2D, o: number, r0: number, a: number, kk: number, n: number, culoare: string, alfa: number) => {
    x.strokeStyle = `rgba(${culoare},${alfa})`;
    const pasi = kk * 40;
    for (let i = 0; i < n; i++) {
      const f = (i * 2 * Math.PI) / n;
      x.beginPath();
      for (let s = 0; s <= pasi; s++) {
        const t = (s / pasi) * 2 * Math.PI, r = r0 + a * Math.sin(kk * t + f) + a * 0.22 * Math.sin(3 * kk * t - 2 * f);
        if (s) x.lineTo(o + r * Math.cos(t), o + r * Math.sin(t)); else x.moveTo(o + r * Math.cos(t), o + r * Math.sin(t));
      }
      x.stroke();
    }
  };
  const cerc = (x: CanvasRenderingContext2D, o: number, r: number, culoare: string, alfa: number) => {
    x.strokeStyle = `rgba(${culoare},${alfa})`; x.beginPath(); x.arc(o, o, r, 0, 2 * Math.PI); x.stroke();
  };
  const pecerc = (x: CanvasRenderingContext2D, o: number, r: number, t: number, ch: string) => {
    x.save(); x.translate(o + r * Math.cos(t), o + r * Math.sin(t)); x.rotate(t + Math.PI / 2); x.fillText(ch, 0, 0); x.restore();
  };
  const micro = (x: CanvasRenderingContext2D, o: number, r: number, text: string, alfa: number) => {
    x.font = font(Math.max(5.5, D * 0.017)); x.fillStyle = `rgba(${OVAZ},${alfa})`; x.textAlign = "center"; x.textBaseline = "middle";
    const n = Math.floor((2 * Math.PI * r) / (x.measureText("M").width * 1.3));
    for (let i = 0; i < n; i++) pecerc(x, o, r, (i / n) * 2 * Math.PI - Math.PI / 2, text[i % text.length]);
  };
  const gradatii = (x: CanvasRenderingContext2D, o: number) => {
    x.font = font(Math.max(6, D * 0.024)); x.fillStyle = `rgba(${OCRU},0.32)`; x.textAlign = "center"; x.textBaseline = "middle";
    for (let i = 0; i < 100; i++) {
      const t = (i / 100) * 2 * Math.PI - Math.PI / 2, lung = i % 10 === 0, r1 = 0.805 * D, r2 = (lung ? 0.84 : 0.822) * D;
      x.strokeStyle = `rgba(${OCRU},${lung ? 0.34 : 0.16})`;
      x.beginPath(); x.moveTo(o + r1 * Math.cos(t), o + r1 * Math.sin(t)); x.lineTo(o + r2 * Math.cos(t), o + r2 * Math.sin(t)); x.stroke();
      if (lung) pecerc(x, o, 0.862 * D, t, String(i));
    }
  };
  /** The tape's path, sampled [x, y, distance]: from the slit (semn +1 right, -1 left) into the band round the seal. */
  const cale = (semn: number): [number, number, number][] => {
    const ecran = (u: number, v: number): [number, number] => [cx + u * U.x + v * N.x, cy + u * U.y + v * N.y];
    const pts: [number, number][] = [], vSlit = -0.04 * D - semn * 4;
    const f0 = ((semn > 0 ? -40 : 140) * Math.PI) / 180, f1 = f0 - (150 * Math.PI) / 180;
    const P = (f: number): [number, number] => [Rw * Math.cos(f), Rw * Math.sin(f)], T = (f: number) => [Math.sin(f), -Math.cos(f)];
    const S = [semn * 2.3 * Rw, vSlit], A = P(f0), tA = T(f0);
    const c1 = [S[0] - semn * 0.9 * Rw, S[1]], c2 = [A[0] - tA[0] * 0.7 * Rw, A[1] - tA[1] * 0.7 * Rw];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, m = 1 - t;
      pts.push([m ** 3 * S[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t ** 3 * A[0], m ** 3 * S[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t ** 3 * A[1]]);
    }
    for (let i = 1; i <= 90; i++) pts.push(P(f0 + ((f1 - f0) * i) / 90));
    let L = 0, prev: [number, number] | null = null;
    return pts.map(([u, v]) => {
      const [x, y] = ecran(u, v);
      if (prev) L += Math.hypot(x - prev[0], y - prev[1]);
      prev = [x, y];
      return [x, y, L];
    });
  };

  function construieste(): void {
    el.textContent = "";
    roti = []; inele = []; benzi = [];
    dpr = Math.min(devicePixelRatio || 1, 2);
    // As large as the place allows: the dial's numbers inside it, never wider than the seal reads well.
    D = Math.min(340, Math.min(W, H) / (2 * RX));
    cx = W / 2; cy = H / 2; px = cx - 0.04 * D * N.x; py = cy - 0.04 * D * N.y;
    Rw = 0.52 * D; randuri = 0.1 * D >= 30 ? 2 : 1;
    const G = Math.min(9, D * 0.05), L = W + H;
    const punct = (a: number, b: number) => `${px + a * U.x + b * N.x}px ${py + a * U.y + b * N.y}px`;

    // The slit between the halves: rows of cipher drifting along the cut, on night.
    const fanta = pune(document.createElement("div"), { left: `${px - L}px`, top: `${py - G}px`, width: `${2 * L}px`, height: `${2 * G}px` });
    fanta.className = "seif-fanta";
    const rand = document.createElement("span");
    rand.textContent = Array.from({ length: 600 }, (_, i) => B64[Math.floor(hash(i + 0.25) * 64)]).join("");
    fanta.append(rand);
    el.append(fanta);

    // The dial (microtext, scale, numbers) and the rosette, each drawn once; each half turns its own copy.
    const Rd = RX * D + 4, Ri = 0.76 * D;
    const [cDisc, xDisc] = panza(2 * Rd, 2 * Rd), [cIn, xIn] = panza(2 * Ri, 2 * Ri);
    if (xDisc && xIn) {
      micro(xDisc, Rd, 0.77 * D, "COLSHARE · CIPHER · OBFUSCATION · LOCK · AES-256 · ", 0.2);
      cerc(xDisc, Rd, 0.795 * D, OVAZ, 0.08);
      gradatii(xDisc, Rd);
      banda(xIn, Ri, 0.67 * D, 0.05 * D, 18, 28, OCRU, 0.12);
      cerc(xIn, Ri, 0.6 * D, OCRU, 0.18); cerc(xIn, Ri, 0.74 * D, OCRU, 0.18);
    }
    const copie = (c: HTMLCanvasElement) => {
      const k2 = document.createElement("canvas"); k2.width = c.width; k2.height = c.height; k2.getContext("2d")?.drawImage(c, 0, 0); return k2;
    };
    const sq = (c: HTMLCanvasElement, R: number, cls: string) => { c.className = cls; return pune(c, { left: `${cx - R}px`, top: `${cy - R}px`, width: `${2 * R}px`, height: `${2 * R}px` }); };

    for (const [i, semn] of [[0, -1], [1, 1]] as const) {
      const j = document.createElement("div");
      j.className = `seif-jum ${semn < 0 ? "sus" : "jos"}`;
      j.style.clipPath = `polygon(${punct(-L, 0)}, ${punct(L, 0)}, ${punct(L, semn * L)}, ${punct(-L, semn * L)})`;
      // At rest each half stands a little off the cut (the slit); opened, it leaves along the slit's normal.
      j.style.setProperty("--ya", `${(semn * G) / N.y}px`);
      const dep = Math.hypot(W, H) * 0.9;
      j.style.setProperty("--x", `${semn * N.x * dep}px`); j.style.setProperty("--y", `${semn * N.y * dep}px`);
      if (xDisc && xIn) {
        const d = sq(i ? copie(cDisc) : cDisc, Rd, "seif-disc"), n = sq(i ? copie(cIn) : cIn, Ri, "seif-inel");
        roti.push(d); inele.push(n);
        j.append(d, n);
      }
      // The tape, over the rings: a canvas the size of its path, its dark strip drawn once.
      const p = cale(semn < 0 ? 1 : -1), m = 12;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      x0 -= m; y0 -= m; x1 += m; y1 += m;
      const [c, x] = panza(x1 - x0, y1 - y0);
      if (x) {
        c.className = "seif-banda";
        pune(c, { left: `${x0}px`, top: `${y0}px`, width: `${x1 - x0}px`, height: `${y1 - y0}px` });
        j.append(c);
        const Lp = p[p.length - 1][2], lat = randuri * 11 + 6;
        const fade = (s: number) => Math.max(0, Math.min(1, s / (0.08 * Lp)) * Math.min(1, (Lp - s) / (0.25 * Lp)));
        const [fond, xf] = panza(x1 - x0, y1 - y0);
        if (xf) {
          for (let q = 1; q < p.length; q++) {
            const [xa, ya, sa] = p[q - 1], [xb, yb, sb] = p[q], f = fade((sa + sb) / 2), ds = sb - sa || 1;
            if (f <= 0) continue;
            const tx = (xb - xa) / ds, ty = (yb - ya) / ds, ax = xa - x0 - tx * 0.6, ay = ya - y0 - ty * 0.6, bx = xb - x0 + tx * 0.6, by = yb - y0 + ty * 0.6;
            xf.globalAlpha = 0.94 * f; xf.strokeStyle = "#0a0b0b"; xf.lineWidth = lat;
            xf.beginPath(); xf.moveTo(ax, ay); xf.lineTo(bx, by); xf.stroke();
            xf.globalAlpha = 0.4 * f; xf.strokeStyle = `rgb(${OCRU})`; xf.lineWidth = 0.8;
            for (const e of [-lat / 2, lat / 2]) { xf.beginPath(); xf.moveTo(ax - ty * e, ay + tx * e); xf.lineTo(bx - ty * e, by + tx * e); xf.stroke(); }
          }
          xf.globalAlpha = 1;
        }
        // The upper half's tape runs right to left: its characters turned half a turn read upright.
        benzi.push({ c, x, cale: p, z: semn < 0 ? -1 : 1, ox: x0, oy: y0, L: Lp, fond: xf ? fond : null });
      }
      // The seal, its ring 0.46 D across (sigiliu.ts draws D units px wide, the ring half of it).
      const s = pune(document.createElement("div"), { left: `${cx}px`, top: `${cy}px` });
      s.className = "seif-sigiliu";
      s.innerHTML = sigiliuSvg("taiat", { px: 0.92 * D });
      // The cut's lit edge on this half.
      const mg = pune(document.createElement("i"), { left: `${px - L}px`, top: `${py - 1}px`, width: `${2 * L}px` });
      mg.className = "seif-margine";
      j.append(s, mg);
      el.append(j);
    }
    // The shockwave as the bolt gives: two rings over everything.
    for (let i = 0; i < 2; i++) {
      el.append(pune(document.createElement("i"), { left: `${cx - 0.46 * D}px`, top: `${cy - 0.46 * D}px`, width: `${0.92 * D}px`, height: `${0.92 * D}px` }));
      (el.lastChild as HTMLElement).className = "seif-unda";
    }
    roteste();
    deseneazaBenzi();
  }

  // ------------------------------------------------------------------ each frame
  function roteste(): void {
    for (const d of roti) d.style.transform = `rotate(${unghi.toFixed(2)}deg)`;
    for (const n of inele) n.style.transform = `rotate(${inel.toFixed(2)}deg)`;
  }
  function deseneazaBenzi(): void {
    const pasLit = 7.4, sp = ((curge % pasLit) + pasLit) % pasLit, prim = Math.floor(curge / pasLit);
    const CUL = [`rgb(${OCRU})`, `rgb(${OVAZ})`], ALFA = [0.62, 0.34];
    for (const { c, x, cale: p, z, ox, oy, L, fond } of benzi) {
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
      if (fond) x.drawImage(fond, 0, 0);
      x.font = font(randuri === 2 ? 10 : 8.5); x.textAlign = "center"; x.textBaseline = "middle";
      for (let r = 0; r < randuri; r++) {
        x.fillStyle = CUL[r];
        const o = randuri === 2 ? (r ? 5.5 : -5.5) : 0;
        let q = 0;
        for (let n = 0; ; n++) {
          const s = n * pasLit + sp;
          if (s > L) break;
          while (q < p.length - 2 && p[q + 1][2] < s) q++;
          const [xa, ya, sa] = p[q], [xb, yb, sb] = p[q + 1], ds = sb - sa || 1, t = (s - sa) / ds, tx = (xb - xa) / ds, ty = (yb - ya) / ds;
          x.globalAlpha = ALFA[r] * Math.max(0, Math.min(1, s / (0.12 * L)) * Math.min(1, (L - s) / (0.3 * L)));
          const X = xa + (xb - xa) * t - ty * o - ox, Y = ya + (yb - ya) * t + tx * o - oy;
          x.setTransform(z * dpr * tx, z * dpr * ty, -z * dpr * ty, z * dpr * tx, dpr * X, dpr * Y);
          x.fillText(SIR[(((n - prim + r * 331) % SIR.length) + SIR.length) % SIR.length], 0, 0);
        }
      }
      x.globalAlpha = 1;
    }
  }
  function pas(acum: number): void {
    cadru = 0;
    if (oprit || !el.isConnected) return;
    const dt = ultim ? Math.min(0.05, (acum - ultim) / 1000) : 0;
    ultim = acum;
    // Checking the PIN: a quarter turn a second, notch by notch.
    if (asteptand) mana += 90 * dt;
    // The dial follows its target from mark to mark (a spring to the nearest mark), the rosette the other way.
    const q = Math.round((mana + inclinare + comb) / PAS) * PAS;
    const inainte = unghi;
    unghi += (q - unghi) * k; inel += (-0.6 * q - inel) * k * 0.8;
    roteste();
    // The dial picking up speed is told once a turn (the numbers racing past), not every frame of it.
    const repede = Math.abs(unghi - inainte) > ROTIRE_PRAG;
    if (repede && !seRoteste && acum - ultimaRotire > ROTIRE_PAUZA) { ultimaRotire = acum; scena.laRotire?.(); }
    seRoteste = repede;
    // The tape runs on slowly; the dial pulls it (turned against it, it winds faster).
    curge += 22 * dt - ((unghi - unghiB) * Math.PI * Rw) / 180;
    unghiB = unghi;
    deseneazaBenzi();
    if (!document.hidden) cadru = requestAnimationFrame(pas);
  }
  const porneste = () => { if (misca && !oprit && !cadru && !document.hidden) { ultim = 0; cadru = requestAnimationFrame(pas); } };

  // ------------------------------------------------------------------ the hand, the tilt
  let anterior: number | null = null, apasat = false;
  const unghiPunct = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return (Math.atan2(e.clientY - r.top - cy, e.clientX - r.left - cx) * 180) / Math.PI; };
  el.addEventListener("pointerdown", (e) => { apasat = true; anterior = unghiPunct(e); el.setPointerCapture?.(e.pointerId); });
  el.addEventListener("pointermove", (e) => {
    if (!apasat && e.pointerType === "touch") return;
    const a = unghiPunct(e);
    if (anterior !== null) { let d = a - anterior; if (d > 180) d -= 360; if (d < -180) d += 360; mana += d; }
    anterior = a;
  }, { passive: true });
  const ridic = () => { apasat = false; anterior = null; };
  el.addEventListener("pointerup", ridic);
  el.addEventListener("pointercancel", ridic);
  el.addEventListener("pointerleave", () => { if (!apasat) anterior = null; });
  const inclina = (e: DeviceOrientationEvent) => {
    if (e.gamma == null) return;
    if (g0 === null) g0 = e.gamma;
    inclinare = Math.max(-60, Math.min(60, e.gamma - g0)) * 3;
  };
  const vizibil = () => { if (!document.hidden) porneste(); };
  if (misca) { addEventListener("deviceorientation", inclina, { passive: true }); document.addEventListener("visibilitychange", vizibil); }
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => scena.potriveste()) : null;
  ro?.observe(el);
  // The dial's letters are drawn once: drawn again when the fonts have come.
  void document.fonts?.ready.then(() => { if (!oprit && W && H) construieste(); });

  const scena: ScenaLacat = {
    el,
    potriveste() {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      if (Math.abs(w - W) > 1 || Math.abs(h - H) > 1) {
        // The first drawing waits until the screen around it has been painted, then the dial fades in: drawing it
        // takes a phone a few hundred milliseconds, which held the whole screen back (motion audit 2026-11-01, A3).
        if (!W && misca && amanare !== "gata") {
          if (amanare === "nu") requestAnimationFrame(() => setTimeout(() => { amanare = "gata"; if (!oprit) scena.potriveste(); }));
          amanare = "asteapta";
          return;
        }
        W = w; H = h; construieste();
        el.classList.add("desenat");
      }
      porneste();
    },
    tasta(n) {
      while (tastat < n) comb += notch(++tastat);
      while (tastat > n) comb -= notch(tastat--);
      porneste();
    },
    asteapta(da) {
      asteptand = da;
      porneste();
    },
    refuz() {
      asteptand = false;
      tastat = 0; comb = 0;
      el.classList.remove("refuz");
      void el.offsetWidth;
      el.classList.add("refuz");
      porneste();
    },
    deschide() {
      asteptand = false;
      el.closest(".bun, .lacat-pun")?.classList.add("deschide");
      if (!misca) return Promise.resolve();
      return new Promise<void>((gata) => {
        // Two thirds of a turn, easing in and out, settling on its mark as the bolt gives.
        const de = comb, t0 = performance.now();
        k = 0.35;
        el.classList.add("incuie");
        const spin = (acum: number) => {
          const s = Math.min(1, (acum - t0) / ZAVOR), e = s < 0.5 ? 4 * s ** 3 : 1 - (2 - 2 * s) ** 3 / 2;
          comb = de + 240 * e;
          if (s < 1 && !oprit) requestAnimationFrame(spin);
        };
        requestAnimationFrame(spin);
        porneste();
        setTimeout(() => el.classList.add("clanc"), ZAVOR);
        setTimeout(() => el.classList.add("deschis"), PARTE);
        setTimeout(gata, GATA);
      });
    },
    impinge(grade) {
      mana += grade;
      porneste();
    },
    iesire() {
      if (!W || !H) return undefined;
      // The slit's line through (px, py) along U, where it crosses the stage's right edge.
      const r = el.getBoundingClientRect();
      return { x: r.left + W, y: r.top + py + ((W - px) / U.x) * U.y };
    },
    opreste() {
      oprit = true;
      if (cadru) cancelAnimationFrame(cadru);
      cadru = 0;
      ro?.disconnect();
      removeEventListener("deviceorientation", inclina);
      document.removeEventListener("visibilitychange", vizibil);
    },
  };
  return scena;
}
