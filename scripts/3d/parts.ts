/** Tiskové díly: figurky, podstavce, žetony a doplňky jako Manifold (mm).
 *
 *  Každý díl je už natočený tak, jak se tiskne: leží na podložce (z = 0),
 *  bez podpěr. Figurky se tisknou NA LEŽATO — silueta je v rovině XY,
 *  tloušťka figurky je osa Z. */

import type { CrossSection, Manifold } from "manifold-3d";
import { ANIMAL_DEFS } from "../../data/animals";
import { ITEMS } from "../../data/items";
import type { AnimalId, ItemId, ShapeId } from "../../data/types";
import { cubic, ellipse, roundRect, strokePolys, type Poly, type Pt } from "./geom";
import { digitOutline, heartOutline, roundCorners, shapeOutline } from "./shapes";
import { animalParts, animalSilhouette, buildProfile, ENGRAVE_MM, MIN_FEATURE_MM, type Parts, type Silhouette } from "./silhouette";
import { unionPolys, W } from "./wasm";

// ------------------------------------------------------------- rozměry

/** Tloušťka figurky (= výška tisku na ležato). */
export const FIGURE_DEPTH_MM = 6.5;
/** Čep pod zemní lištou, který zapadne do drážky v podstavci. */
export const TAB = { w: 10, h: 2.2, chamfer: 0.4 } as const;
/** Vůle drážky na každou stranu. */
export const SLOT_CLEARANCE_MM = 0.2;
export const BASE = { d: 26, h: 3, slotDepth: 2.4, emboss: 0.6, ringW: 1.2 } as const;
/** Výška, od které začíná plastický motiv podstavce — tady se mění barva (M600). */
export const BASE_COLOR_CHANGE_MM = BASE.h;
/** Rozmístění značky na podstavci: velikost tvaru a číslice, odsazení od středu. */
export const MOTIF = { shape: 6, digit: 6.2, dx: 3.4, y: 7.3 } as const;
export const TOKEN_MM = { size: 15.5, h: 3, rim: 0.6, rimW: 1.2 } as const;

const SEG = 96;

/** Manifold.extrude s posunem v z. */
const ext = (cs: CrossSection, h: number, z = 0): Manifold => cs.extrude(h).translate([0, 0, z]);

// ------------------------------------------------------------- figurky

function tabSection(): CrossSection {
  const { w, h, chamfer: c } = TAB;
  // lichoběžník se sraženými spodními rohy, ať čep sám najde drážku
  const poly: Poly = [
    [-w / 2, 0.6],
    [-w / 2, -h + c],
    [-w / 2 + c, -h],
    [w / 2 - c, -h],
    [w / 2, -h + c],
    [w / 2, 0.6],
  ];
  return unionPolys([poly]);
}

/** Figurka ze siluety: vytažení do tloušťky a rytiny z obou stran. */
export function figureFromSilhouette(sil: Silhouette, opts: { slot?: boolean; depth?: number } = {}): Manifold {
  const depth = opts.depth ?? FIGURE_DEPTH_MM;
  const outline = opts.slot ? sil.outline.add(tabSection()) : sil.outline;
  let m = ext(outline, depth);
  const cuts: Manifold[] = [];
  for (const k of ["low", "deep"] as const) {
    const e = sil.engrave[k];
    if (e.isEmpty()) continue;
    const d = ENGRAVE_MM[k];
    cuts.push(ext(e, d + 1, -1), ext(e, d + 1, depth - d));
  }
  if (cuts.length) m = m.subtract(W().Manifold.union(cuts));
  return m;
}

export function animalFigure(id: AnimalId, slot = false): Manifold {
  return figureFromSilhouette(animalSilhouette(id), { slot });
}

// ------------------------------------------------------------- podstavce

/** Značka hráče (tvar + číslice) jako 2D motiv na horní ploše podstavce.
 *  Motiv je dvakrát — vpředu a otočený vzadu —, ať se dá číst z obou stran
 *  stolu. Prostředek nechává volný pro drážku. */
export function markerMotif(shape: ShapeId, numeral: number, ring: boolean): CrossSection {
  const { CrossSection } = W();
  const R = BASE.d / 2;
  // Tvar i číslice se zmenšují, dokud od nich kroužek nemá aspoň 0,8 mm
  // (čtverec a horní roh číslice jsou k okraji blíž než kolečko).
  const free = CrossSection.circle(R - BASE.ringW - 0.8, SEG);
  const fit = (make: (size: number) => CrossSection, size: number, dx: number) => {
    let cs = make(size).translate(dx, -MOTIF.y);
    while (size > 3 && cs.subtract(free).area() > 1e-3) {
      size *= 0.97;
      cs = make(size).translate(dx, -MOTIF.y);
    }
    return cs.translate(0, MOTIF.y);
  };
  const glyphs = fit((z) => shapeOutline(shape, z, 0.5), MOTIF.shape, -MOTIF.dx).add(fit((z) => digitOutline(numeral, z), MOTIF.digit, MOTIF.dx));
  const front = glyphs.translate(0, -MOTIF.y);
  const back = glyphs.rotate(180).translate(0, MOTIF.y);
  let motif = front.add(back);
  if (ring) motif = motif.add(CrossSection.circle(R, SEG).subtract(CrossSection.circle(R - BASE.ringW, SEG)));
  return motif;
}

/** Drážka pro čep figurky (s vůlí). */
function slotCut(): Manifold {
  const c = SLOT_CLEARANCE_MM;
  const w = TAB.w + 2 * c;
  const d = FIGURE_DEPTH_MM + 2 * c;
  const box = roundCorners(W().CrossSection.square([w, d], true), 0.3);
  return ext(box, BASE.slotDepth + 1, BASE.h - BASE.slotDepth);
}

/** Kulatý podstavec s drážkou a plastickou značkou hráče. */
export function animalBase(id: AnimalId, ring = true): Manifold {
  const { Manifold } = W();
  const m = ANIMAL_DEFS[id].marker;
  const R = BASE.d / 2;
  // spodní hrana sražená 0,4 mm proti „sloní noze" první vrstvy
  const disc = Manifold.union([Manifold.cylinder(0.4, R - 0.4, R, SEG), Manifold.cylinder(BASE.h - 0.4, R, R, SEG).translate([0, 0, 0.4])]);
  const motif = ext(markerMotif(m.shape, m.numeral, ring), BASE.emboss, BASE.h);
  return disc.add(motif).subtract(slotCut());
}

/** Podlouhlý podstavec (stadion) pro skupinové figurky — husy, kolečko. */
export function stadiumBase(width: number, depth = 16): Manifold {
  const { CrossSection } = W();
  const plate = roundCorners(CrossSection.square([width, depth], true), depth / 2 - 0.01);
  const body = ext(plate.offset(-0.4, "Round", 2, 48), 0.4).add(ext(plate, BASE.h - 0.4, 0.4));
  const rim = plate.subtract(plate.offset(-BASE.ringW, "Round", 2, 48));
  return body.add(ext(rim, BASE.emboss, BASE.h)).subtract(slotCut());
}

// ------------------------------------------------------------- žetony

/** Plochý žeton daného tvaru. Výrobky mají vystouplý lem 0,6 mm — poznají
 *  se od surovin hmatem i bez barvy. */
export function token(shape: ShapeId, rim: boolean, size = TOKEN_MM.size): Manifold {
  const outline = shapeOutline(shape, size);
  let m = ext(outline, TOKEN_MM.h);
  if (rim) m = m.add(ext(outline.subtract(outline.offset(-TOKEN_MM.rimW, "Round", 2, 48)), TOKEN_MM.rim, TOKEN_MM.h));
  return m;
}

export const itemToken = (id: ItemId): Manifold => token(ITEMS[id].shape, ITEMS[id].kind === "product");

export function heartToken(width = 14): Manifold {
  return ext(heartOutline(width), TOKEN_MM.h);
}

/** Kostka Práce: 9 mm se sraženými hranami (obal tří kvádrů). */
export function workCube(size = 9, chamfer = 0.8): Manifold {
  const { Manifold } = W();
  const a = size;
  const b = size - 2 * chamfer;
  return Manifold.hull([
    Manifold.cube([a, a, b], true),
    Manifold.cube([a, b, a], true),
    Manifold.cube([b, a, a], true),
  ]).translate([0, 0, size / 2]);
}

// ------------------------------------------------------------- stojánek

/** Stojánek na jednu kartu (poker 63 × 88 mm), karta stojí v úhlu 70°.
 *  Profil je v rovině XZ (x = hloubka, z = výška), vytažený do šířky Y. */
export const CARD_HOLDER = { width: 50, depth: 30, height: 12, angle: 70, slotW: 1.4, floor: 2.5 } as const;

export function cardHolder(): Manifold {
  const { depth: D, height: Hh, angle, slotW, floor, width } = CARD_HOLDER;
  const body = roundCorners(
    unionPolys([
      [
        [0, 0],
        [D, 0],
        [D, Hh],
        [9, Hh],
        [0, 5],
      ],
    ]),
    1.2,
  );
  const a = (angle * Math.PI) / 180;
  const dir: [number, number] = [Math.cos(a), Math.sin(a)];
  // střed štěrbiny vychází na horní ploše v x = 13 mm
  const xb = 13 - (Hh - floor) / Math.tan(a);
  const len = 40;
  const n: [number, number] = [-dir[1] * (slotW / 2), dir[0] * (slotW / 2)];
  const p0: [number, number] = [xb, floor];
  const p1: [number, number] = [xb + dir[0] * len, floor + dir[1] * len];
  const slot = unionPolys([
    [
      [p0[0] + n[0], p0[1] + n[1]],
      [p1[0] + n[0], p1[1] + n[1]],
      [p1[0] - n[0], p1[1] - n[1]],
      [p0[0] - n[0], p0[1] - n[1]],
    ],
    ellipse(p0[0], p0[1], slotW / 2, slotW / 2, 0, 24),
  ]);
  const profile = body.subtract(slot);
  // profil (x, y) → (x, z); vytažení jde do −y, takže posun o šířku
  return profile.extrude(width).rotate([90, 0, 0]).translate([-D / 2, width / 2, 0]);
}

// ------------------------------------------------------------- doplňky

/** Kolečko (trakař) — boční silueta v mm, y dolů, kolo stojí na zemi. */
export function wheelbarrowParts(): Parts {
  const wheel = ellipse(9, -5, 5, 5);
  const tray: Poly = [
    [-10, -16],
    [13, -16],
    [8, -9],
    [-6, -9],
  ];
  return {
    solid: [
      wheel,
      tray,
      ...strokePolys(
        [
          [-6, -14],
          [-21, -19],
        ],
        2,
      ), // madlo
      ...strokePolys(
        [
          [-21, -19],
          [-24.5, -19.6],
        ],
        2.6,
      ), // držadlo
      ...strokePolys(
        [
          [-4, -10],
          [-6, -1],
        ],
        2,
      ), // nožka
      ...strokePolys(
        [
          [6, -10],
          [9, -5],
        ],
        2.2,
      ), // vidlice kola
    ],
    details: [
      { polys: [ellipse(9, -5, 1.6, 1.6)], mode: "area", depth: "deep" },
      { polys: [wheel], mode: "outline", depth: "low" },
      { polys: [roundRect(-7.5, -15, 18, 1, 0.5)], mode: "area", depth: "low" },
    ],
  };
}

/** Jedna husa (y dolů, nohy na y = 0). `graze` = hlava dole v trávě. */
function goose(dx: number, k: number, graze: boolean): Parts {
  const P = (pts: Poly): Poly => pts.map(([x, y]) => [dx + x * k, y * k]);
  const body = P(ellipse(0, -14, 12, 7.5, -0.18));
  const neck = graze
    ? [
        [8, -16],
        [13, -17],
        [17, -13],
        [19, -8],
      ]
    : [
        [7, -17],
        [10, -24],
        [8, -30],
        [10.5, -34],
      ];
  const head: Poly = graze ? ellipse(20.5, -6.5, 3.8, 3, 0.9) : ellipse(12.5, -35.5, 4, 3.1, 0.15);
  const beak: Poly = graze
    ? [
        [21, -4],
        [24.5, 0],
        [22.5, -3.6],
      ]
    : [
        [15.5, -37],
        [21, -35.4],
        [15.5, -34],
      ];
  const solid: Poly[] = [
    body,
    P([
      [-10, -16],
      [-17, -21],
      [-11, -11],
    ]), // ocas
    ...strokePolys(P(cubic(neck[0] as Pt, neck[1] as Pt, neck[2] as Pt, neck[3] as Pt)), 4.4 * k),
    P(head),
    P(beak),
    ...strokePolys(
      P([
        [-1.5, -8],
        [-1.5, 0],
      ]),
      1.6 * k,
    ),
    ...strokePolys(
      P([
        [2.5, -8],
        [3.5, 0],
      ]),
      1.6 * k,
    ),
    P(roundRect(-4, -1.4, 5.5, 1.4, 0.6)),
    P(roundRect(1.5, -1.4, 5.5, 1.4, 0.6)),
  ];
  const eye = graze ? ellipse(20, -7.4, 0.9, 0.9) : ellipse(12.8, -36.3, 0.9, 0.9);
  return {
    solid,
    details: [
      { polys: [P(ellipse(-2, -15.5, 8, 4.2, -0.25))], mode: "outline", depth: "low" },
      { polys: [P(eye)], mode: "area", depth: "deep" },
    ],
  };
}

export function geeseParts(): Parts {
  const a = goose(0, 1, false);
  const b = goose(-36, 0.92, true);
  return { solid: [...a.solid, ...b.solid], details: [...a.details, ...b.details] };
}

export const wheelbarrowSilhouette = () => buildProfile({ id: "kolecko", parts: wheelbarrowParts(), heightMm: 22 });
export const geeseSilhouette = () => buildProfile({ id: "husy", parts: geeseParts(), heightMm: 30 });

/** Lucinka — malá ovečka jako PLOCHÝ žeton 18 mm (doprovází se, nestojí).
 *  Kreslí se z Pogovy anatomie bez zemní lišty, rytiny jen nahoře. */
export function lucinkaSilhouette(): Silhouette {
  const parts = animalParts("pogo");
  const raw = unionPolys(parts.solid).bounds();
  return buildProfile({ id: "lucinka", parts, scale: 18 / (raw.max[0] - raw.min[0]), barMm: 0 });
}

export function lucinkaToken(): Manifold {
  const sil = lucinkaSilhouette();
  let m = ext(sil.outline, TOKEN_MM.h);
  const cuts: Manifold[] = [];
  for (const k of ["low", "deep"] as const) {
    if (!sil.engrave[k].isEmpty()) cuts.push(ext(sil.engrave[k], 1 + 0.4, TOKEN_MM.h - (k === "low" ? 0.4 : 0.8)));
  }
  if (cuts.length) m = m.subtract(W().Manifold.union(cuts));
  return m;
}

export { MIN_FEATURE_MM };
