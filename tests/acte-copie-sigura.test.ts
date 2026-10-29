// The safe ID copy (src/acte/copie-sigura.ts): what is blacked out leaves nothing of the original in the pixels, the
// marking reaches every part of the picture (no corner can be cut off clean), and the known places sit where ICAO
// 9303 puts them.
import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { A4, deseneazaCopie, foaieA4, textMarcaj, zonaPoza, type Desen } from "../src/acte/copie-sigura.ts";

const M = { copie: "KOPIE", pentru: "Für: Anna Weber", scop: "Wohnung Hauptstraße 12", data: "19.10.2026" };

/** A page all of one green, the colour nothing of the marking uses. */
function sursa(w: number, h: number) {
  const c = createCanvas(w, h);
  const g = c.getContext("2d");
  g.fillStyle = "#00ff00";
  g.fillRect(0, 0, w, h);
  return c;
}

function copie(w: number, h: number, negre = [{ x: 0.1, y: 0.5, w: 0.5, h: 0.3 }]) {
  const c = createCanvas(w, h);
  deseneazaCopie(c.getContext("2d") as unknown as Desen, sursa(w, h) as unknown as CanvasImageSource, w, h, M, negre);
  return c.getContext("2d").getImageData(0, 0, w, h).data;
}

const verde = (d: Uint8ClampedArray, i: number) => d[i + 1] > 150 && d[i] < 100 && d[i + 2] < 100;
/** The page exactly as it was: the marking is light (a third), so any change of the pure green counts as marked. */
const neatins = (d: Uint8ClampedArray, i: number) => d[i] < 8 && d[i + 1] > 247 && d[i + 2] < 8;

describe("copia sigură", () => {
  it("leaves nothing of a blacked-out area", () => {
    const w = 856, h = 540, d = copie(w, h);
    for (let y = Math.ceil(h * 0.5); y < Math.floor(h * 0.8); y += 3) {
      for (let x = Math.ceil(w * 0.1); x < Math.floor(w * 0.6); x += 3) expect(verde(d, (y * w + x) * 4), `${x},${y}`).toBe(false);
    }
  });

  it("marks every part of the picture: no tile of it is left untouched", () => {
    const w = 856, h = 540, d = copie(w, h, []);
    const tile = 120;
    for (let ty = 0; ty + tile <= h; ty += tile) {
      for (let tx = 0; tx + tile <= w; tx += tile) {
        let atins = 0;
        for (let y = ty; y < ty + tile; y += 2) for (let x = tx; x < tx + tile; x += 2) if (!neatins(d, (y * w + x) * 4)) atins++;
        expect(atins, `tile ${tx},${ty}`).toBeGreaterThan(20);
      }
    }
  });

  it("says it plainly: the line, and a solid label in the corner", () => {
    expect(textMarcaj(M)).toBe("KOPIE · Für: Anna Weber · Wohnung Hauptstraße 12 · 19.10.2026");
    expect(textMarcaj({ copie: "COPY", pentru: "", scop: "Rental", data: " " })).toBe("COPY · Rental");
    expect(textMarcaj({ copie: "COPY", pentru: "x".repeat(200), scop: "", data: "" }).length).toBe(100);
    const w = 856, h = 540, d = copie(w, h, []);
    // The label's dark box near the top-right corner.
    const i = (Math.round(h * 0.04) * w + (w - 30)) * 4;
    expect(d[i] + d[i + 1] + d[i + 2]).toBeLessThan(120);
  });

  it("puts the photo's box on the left, on a card and on a passport page", () => {
    for (const [w, h] of [[856, 540], [1250, 880]]) {
      const z = zonaPoza(w, h);
      expect(z.x + z.w).toBeLessThan(0.4);
    }
  });

  it("puts front and back on one A4 sheet, each whole, one under the other", () => {
    const c = createCanvas(A4.w, A4.h);
    const fata = sursa(856, 540), spate = sursa(856, 540);
    foaieA4(c.getContext("2d") as unknown as Desen, [{ img: fata as unknown as CanvasImageSource, w: 856, h: 540 }, { img: spate as unknown as CanvasImageSource, w: 856, h: 540 }]);
    const d = c.getContext("2d").getImageData(0, 0, A4.w, A4.h).data;
    const coloana = Math.round(A4.w / 2);
    let verzi = 0, schimbari = 0, prev = false;
    for (let y = 0; y < A4.h; y += 2) { const v = verde(d, (y * A4.w + coloana) * 4); if (v) verzi++; if (v !== prev) schimbari++; prev = v; }
    // Two green blocks down the middle: four edges.
    expect(schimbari).toBe(4);
    expect(verzi).toBeGreaterThan(A4.h * 0.2);
  });
});
