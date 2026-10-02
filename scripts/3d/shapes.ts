/** Ploché tvary pro tisk: tvary žetonů a značek (z `shapePath()` v
 *  `src/art/icons/Icons.tsx` — tytéž, které hra kreslí na obrazovce i na
 *  papír), srdíčko z `HeartIcon` a jednoduché číslice z tahů.
 *
 *  Všechno vrací CrossSection v mm, střed v počátku, osa y nahoru. */

import type { CrossSection } from "manifold-3d";
import type { ShapeId } from "../../data/types";
import { shapePath } from "../../src/art/icons/Icons";
import { pathToPolys, scale, strokePolys, type Mat, type Poly } from "./geom";
import { evenOdd, unionPolys } from "./wasm";

/** SVG má y dolů → převrátit. */
const flip = (k: number, ky = k): Mat => scale(k, -ky);

/** Zaoblení vypouklých rohů poloměrem r (morfologické otevření). */
export function roundCorners(cs: CrossSection, r: number): CrossSection {
  return cs.offset(-r, "Round", 2, 48).offset(r, "Round", 2, 48);
}

/** Tvar ze `shapePath()` vycentrovaný na střed rámečku. */
function rawShape(shape: ShapeId): CrossSection {
  const polys = pathToPolys(shapePath(shape, 10), 40);
  const cs = shape === "ring" ? evenOdd(polys, flip(1)) : unionPolys(polys, flip(1));
  const b = cs.bounds();
  return cs.translate(-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2);
}

/** Tvar o největším rozměru `size` mm. `bar` (Proutí) se kreslí jako
 *  zaoblená tyčinka 20 × 7 mm bez ohledu na `size` — ve hře je to tyčka
 *  přes celou šířku a v ruce se pozná podle délky. */
export function shapeOutline(shape: ShapeId, size: number, round = 0.8): CrossSection {
  let cs = rawShape(shape);
  const b = cs.bounds();
  const w = b.max[0] - b.min[0];
  const h = b.max[1] - b.min[1];
  if (shape === "bar") {
    const L = (size / 15.5) * 20;
    const H = (size / 15.5) * 7;
    cs = cs.scale([L / w, H / h]);
  } else {
    cs = cs.scale(size / Math.max(w, h));
  }
  return round > 0 ? roundCorners(cs, round) : cs;
}

/** Srdíčko — cesta opsaná z `HeartIcon` v `src/art/icons/Icons.tsx`. */
export const HEART_PATH = "M0 9 C -9 3 -11 -3 -7 -7 C -4 -10 -1 -8 0 -5 C 1 -8 4 -10 7 -7 C 11 -3 9 3 0 9 Z";

export function heartOutline(width: number): CrossSection {
  let cs = unionPolys(pathToPolys(HEART_PATH), flip(1));
  const b = cs.bounds();
  cs = cs.translate(-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2);
  return roundCorners(cs.scale(width / (b.max[0] - b.min[0])), 0.8);
}

// ------------------------------------------------------------- číslice

/** Číslice z tahů v mřížce 2 × 4 (x vpravo, y nahoru). Jen 1–6 — víc zvířat
 *  hra nemá. Šestka má spodní smyčku zavřenou, aby se po otočení podstavce
 *  nepletla s devítkou (ta ve hře není, ale hráč to neví). */
const DIGITS: Record<number, [number, number][][]> = {
  1: [
    [
      [0.3, 3.2],
      [1.2, 4],
      [1.2, 0],
    ],
    [
      [0.3, 0],
      [2.1, 0],
    ],
  ],
  2: [
    [
      [0, 3.3],
      [0.5, 4],
      [1.5, 4],
      [2, 3.3],
      [2, 2.5],
      [0, 0],
      [2, 0],
    ],
  ],
  3: [
    [
      [0, 4],
      [2, 4],
      [2, 0],
      [0, 0],
    ],
    [
      [0.7, 2],
      [2, 2],
    ],
  ],
  4: [
    [
      [1.5, 0],
      [1.5, 4],
      [0, 1.2],
      [2.1, 1.2],
    ],
  ],
  5: [
    [
      [2, 4],
      [0, 4],
      [0, 2.2],
      [1.5, 2.2],
      [2, 1.6],
      [2, 0.6],
      [1.5, 0],
      [0, 0],
    ],
  ],
  6: [
    [
      [1.9, 4],
      [0.6, 4],
      [0, 3.3],
      [0, 0.6],
      [0.6, 0],
      [1.4, 0],
      [2, 0.6],
      [2, 1.6],
      [1.4, 2.2],
      [0, 2.2],
    ],
  ],
};

/** Číslice vysoká `height` mm, tah `stroke` mm, vycentrovaná. */
export function digitOutline(n: number, height: number, stroke = 1.2): CrossSection {
  const strokes = DIGITS[n];
  if (!strokes) throw new Error(`Číslice ${n} není definovaná`);
  const u = (height - stroke) / 4;
  const polys: Poly[] = [];
  for (const line of strokes) polys.push(...strokePolys(line.map(([x, y]) => [(x - 1) * u, (y - 2) * u]), stroke));
  return unionPolys(polys);
}
