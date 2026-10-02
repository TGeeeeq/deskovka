/** Boční silueta zvířete pro 3D tisk — z TÝCHŽ čísel, ze kterých kreslí
 *  `src/art/karel/AnimalSvg.tsx` (tabulky v `src/art/karel/anatomy.ts`).
 *
 *  Skládá se stejně jako SVG: kyčle a nohy, ocas, trup, vlna / hříva, krk,
 *  hlava, čumák, uši nebo rohy — v klidovém postoji (žádná animace, žádná
 *  ozdoba ze šatníku, žádný stín). Detaily uvnitř obrysu, které ve hře nesou
 *  jinou barvu (oko, kroužek kolem oka, čumák, fleky, hříva, vnitřek uší,
 *  roh muflona), se do figurky z obou stran mělce vyryjí — silueta sama by
 *  krávu od ovečky v hlavě neodlišila. Bříško, odlesky a pusa se vynechávají.
 *
 *  Když se v AnimalSvg změní stavba hlavy nebo uší, musí se změnit i tady:
 *  tabulková čísla (BUILD, LEGS) se berou přímo, kreslicí konstanty uvnitř
 *  komponenty (poloha uší, poloměry čumáku…) jsou opsané a označené `// AnimalSvg`.
 */

import type { CrossSection } from "manifold-3d";
import { ANIMALS, ANIMAL_ORDER, BUILD, LEGS, PATTERNS, type AnimalId } from "../../src/art/karel/anatomy";
import {
  arcPoints,
  circle,
  cubic,
  ellipse,
  mul,
  quad,
  rotate,
  roundRect,
  scale,
  strokePolys,
  translate,
  applyPoly,
  type Mat,
  type Poly,
} from "./geom";
import { empty, unionPolys, W } from "./wasm";

/** Nejtenčí místo, které FDM tryskou 0,4 mm spolehlivě vytiskne (3 tahy). */
export const MIN_FEATURE_MM = 1.2;
/** Celková výška figurky včetně zemní lišty. */
export const FIGURE_HEIGHT_MM = 30;
/** Zemní lišta pod kopyty — figurka na ní stojí i bez podstavce. */
export const GROUND_BAR_MM = 2;

/** Detail, který se do figurky vyryje (z obou stran). `area` = vybrání celé
 *  plochy (flek, oko), `outline` = rýha po obvodu tvaru (čumák, roh).
 *  `clip` omezí detail na jiný tvar (fleky jsou v SVG oříznuté na trup). */
export type Detail = { polys: Poly[]; mode: "area" | "outline"; depth: "low" | "deep"; clip?: Poly[]; minus?: Poly[] };

export type Parts = { solid: Poly[]; details: Detail[] };

/** Ouško osla: kapka (`earPath` v AnimalSvg). */
function earPoly(rx: number, ry: number): Poly {
  const a = cubic([0, ry], [-rx, ry * 0.55], [-rx * 0.95, -ry * 0.55], [0, -ry]);
  const b = cubic([0, -ry], [rx * 0.95, -ry * 0.55], [rx, ry * 0.55], [0, ry]);
  return [...a, ...b.slice(1, -1)];
}

/** Všechna primitiva siluety a detailů v herních souřadnicích (y dolů). */
export function animalParts(id: AnimalId): Parts {
  const a = ANIMALS[id];
  const c = a.colors;
  const s = a.species;
  const b = BUILD[s];
  const solid: Poly[] = [];
  const details: Detail[] = [];
  const add = (m: Mat, ...ps: Poly[]) => solid.push(...ps.map((p) => applyPoly(m, p)));
  const detail = (m: Mat, mode: Detail["mode"], depth: Detail["depth"], polys: Poly[], extra: Partial<Detail> = {}) =>
    details.push({
      polys: polys.map((p) => applyPoly(m, p)),
      mode,
      depth,
      clip: extra.clip?.map((p) => applyPoly(m, p)),
      minus: extra.minus?.map((p) => applyPoly(m, p)),
    });
  const I: Mat = [1, 0, 0, 1, 0, 0];
  const body = ellipse(0, b.bodyY, b.bodyRX, b.bodyRY, 0, 120);

  // --- nohy s kyčlemi (všechny čtyři; vzdálený pár se v siluetě slije s bližším)
  for (const l of LEGS) {
    add(I, ellipse(l.x, b.legY + 1, b.legRX + 2.2, 7));
    add(I, roundRect(l.x - b.legRX, b.legY, b.legRX * 2, b.legLen, b.legRX));
    add(I, roundRect(l.x - 5.5, b.legY + b.legLen - 7, 11, 8, 3));
  }

  // --- ocas
  const T = mul(translate(b.tail[0], b.tail[1]), rotate(0.5));
  if (s === "prase") {
    // AnimalSvg: dvě kruhové spirálky, tah 5 (v siluetě je skoro celý schovaný v trupu — jako ve hře)
    add(T, ...strokePolys(arcPoints(0, -4, 5, 0, Math.PI * 1.5), 5));
    add(T, ...strokePolys(arcPoints(4, -10, 4, Math.PI, Math.PI * 2.6), 5));
  } else if (s === "ovce") {
    add(T, circle(0, 0, 8));
  } else {
    add(T, ...strokePolys(quad([0, -6], [-10, 8], [-6, 22]), 6));
    add(T, ellipse(-6, 24, 6, 9, -0.2));
  }

  // --- trup a fleky (fleky jsou v SVG oříznuté na trup — tady taky)
  add(I, body);
  if (c.pattern) detail(I, "area", "low", PATTERNS[c.pattern].map((sp) => ellipse(sp.x, sp.y, sp.rx, sp.ry, sp.rot)), { clip: [body] });

  // --- vlna ovce: deset koleček po obvodu trupu
  if (s === "ovce") {
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      add(I, circle(Math.cos(ang) * 36, -40 + Math.sin(ang) * 19, 13));
    }
  }

  // --- oslí hříva podél hřbetu s vroubky (tmavá — vybere se i jako plocha)
  if (s === "osel") {
    const top = b.bodyY - b.bodyRY;
    const M = rotate(-0.05, 6, top + 3);
    const mane = [ellipse(6, top + 3, 26, 5.5), ...[-16, -8, 0, 8, 16].map((dx) => quad([6 + dx - 3.4, top + 2], [6 + dx, top - 5.5], [6 + dx + 3.4, top + 2]))];
    add(M, ...mane);
    detail(M, "area", "low", mane);
  }

  // --- krk a hlava
  const H = translate(b.head[0], b.head[1]);
  if (b.neck) add(H, ellipse(b.neck[0], b.neck[1], b.neck[2], b.neck[3], b.neck[4]));
  if (s === "osel") {
    const neckMane = ellipse(-14, 0, 8, 18, 0.5); // AnimalSvg: hříva na krku
    add(H, neckMane);
  }
  const head = ellipse(6, -6, 18, 15, 0.15); // AnimalSvg: hlava
  add(H, head);
  if (s === "ovce") {
    const tuft = [circle(-4, -16, 9), circle(5, -19, 8), circle(13, -15, 7)]; // AnimalSvg: čupřina
    add(H, ...tuft);
    // obličej ovce má barvu čumáku, ne vlny — vybere se jako plocha
    detail(H, "area", "low", [head], { minus: tuft });
  }
  if (s === "prase") {
    const snout = ellipse(22, -4, 8, 7); // AnimalSvg: rypáček
    add(H, snout);
    detail(H, "outline", "low", [snout]);
    detail(H, "area", "low", [ellipse(24, -4, 2.2, 3), ellipse(19, -4, 2.2, 3)]);
    if (c.spots) detail(H, "area", "low", [ellipse(-3, -13, 6, 5, 0.3)]);
  } else {
    const muzzle = ellipse(16, -1, 11, 9, 0.15); // AnimalSvg: čumák
    add(H, muzzle);
    if (s !== "ovce") detail(H, "outline", "low", [muzzle]);
    detail(H, "area", "low", [ellipse(20, -4, 2, 2.6, 0.3), ...(s === "kráva" ? [ellipse(14, -3, 2, 2.6, 0.1)] : [])]);
  }

  // oko: kroužek osla a flek Květy mělce, samotné oko hlouběji
  if (c.eyePatch) detail(H, "area", "low", [ellipse(6, -10, 7.5, 9, 0.1)]);
  if (c.eyeRing) detail(H, "area", "low", [ellipse(6, -10, 6.5, 7.5)]);
  detail(H, "area", "deep", [ellipse(6, -10, 3.4, 4.2)]);

  // --- uši a rohy
  if (s === "osel") {
    for (const e of [
      { dx: -2, rot: -0.35 },
      { dx: 6, rot: 0.25 },
    ]) {
      const E = mul(H, mul(translate(e.dx, -16), rotate(e.rot)));
      add(mul(E, translate(0, -16)), earPoly(6, 17));
      detail(mul(E, translate(0, -14)), "area", "low", [earPoly(3, 11)]);
    }
  } else if (s === "muflon") {
    const R = mul(H, translate(-2, -13));
    const horn = strokePolys(arcPoints(-4, -2, 12, -0.4, Math.PI * 1.25), 11);
    add(R, ...horn);
    add(H, ellipse(-8, -10, 6, 4, -0.4));
    // Střed spirály leží uvnitř obrysu hlavy, takže by se v siluetě ztratil.
    // Roh má ve hře jinou barvu než hlava — tady se celý vybere a zavitek
    // kolem nevybraného středu je pak vidět z obou stran.
    detail(R, "area", "low", horn);
  } else if (s === "kráva") {
    if (!c.noHorns) {
      const R = mul(H, translate(0, -16));
      add(R, ...strokePolys(quad([-4, 0], [-9, -8], [-6, -12]), 5));
      add(R, ...strokePolys(quad([8, -1], [13, -9], [10, -13]), 5));
    }
    add(H, ellipse(2, -16, 8, 5));
    if (c.forelock) add(H, ellipse(-3, -13, 3, 4.5, -0.3), ellipse(3, -12.5, 3, 5, 0.1), ellipse(8, -13, 2.6, 4, 0.4));
    add(H, ellipse(-10, -12, 8, 5, -0.5));
    detail(H, "area", "low", [ellipse(-11, -12, 4, 2.6, -0.5)]);
  } else if (s === "ovce") {
    add(H, ellipse(-8, -10, 7, 4, -0.6), ellipse(14, -13, 6, 3.6, 0.5));
  } else {
    for (const e of [
      { dx: -2, rot: -0.5 },
      { dx: 10, rot: 0.3 },
    ]) {
      const E = mul(H, mul(translate(e.dx, -14), rotate(e.rot)));
      add(E, [
        [-6, 2],
        [6, 2],
        [0, -12],
      ]);
      detail(E, "area", "low", [
        [
          [-3, 1],
          [3, 1],
          [0, -7],
        ],
      ]);
    }
  }
  return { solid, details };
}

// ------------------------------------------------------------- tloušťka

/** Ztenčí-a-zase-vrátí (morfologické otevření) — co v něm zmizí, je užší než 2r. */
export function opening(cs: CrossSection, r: number): CrossSection {
  return cs.offset(-r, "Round", 2, 48).offset(r, "Round", 2, 48);
}

/** Zesílí všechny části užší než `minW` (ocásky, uši, špičky rohů) na `minW`.
 *  Tlusté části se nemění: zbytek po otevření se nafoukne o r a přidá se
 *  zpátky k původnímu tvaru. */
export function enforceMinWidth(cs: CrossSection, minW = MIN_FEATURE_MM): CrossSection {
  const r = minW / 2;
  // Zbytek po otevření obsahuje i drobné třísky ve vrcholech mnohoúhelníku
  // (oblouk se aproksimuje úsečkami). Nafouknuté by udělaly z hladké hrany
  // vroubky, proto se berou jen kusy, které jsou skutečně tvar (> 0,01 mm²).
  const thin = cs
    .subtract(opening(cs, r))
    .decompose()
    .filter((p) => p.area() > 0.01);
  if (!thin.length) return cs;
  const { CrossSection: CS } = W();
  return cs.add(CS.union(thin).offset(r, "Round", 2, 48)).simplify(0.01);
}

/** Největší souvislý kus tvaru (mm²), který je užší než `minW`.
 *  Ostrý roh (třeba spodní hrana zemní lišty) dá kousek do ~0,1 mm²,
 *  skutečně tenký výběžek (ocásek, ouško) je dlouhý a vyjde mnohem víc.
 *  Kvůli aproksimaci oblouků nikdy nevyjde přesně nula; test hlídá práh. */
export function thinArea(cs: CrossSection, minW = MIN_FEATURE_MM): number {
  const rest = cs.subtract(opening(cs, minW / 2 - 0.02));
  return Math.max(0, ...rest.decompose().map((p) => p.area()));
}

// ------------------------------------------------------------- silueta v mm

/** Hloubka rytin z každé strany figurky (mm). */
export const ENGRAVE_MM = { low: 0.4, deep: 0.8 } as const;
/** Šířka rýhy po obvodu (čumák, roh). Pod 0,6 mm ji slicer zahodí. */
export const GROOVE_MM = 0.7;

export type Silhouette = {
  id: string;
  /** Obrys včetně zemní lišty; y = 0 je spodek lišty, osa y nahoru, mm. */
  outline: CrossSection;
  /** Rytiny podle hloubky, už oříznuté dovnitř obrysu. */
  engrave: Record<"low" | "deep", CrossSection>;
  /** mm na herní jednotku */
  scale: number;
  /** x rozsah zemní lišty (mm) */
  bar: [number, number];
};

/** Převod z herních jednotek do mm: měřítko a otočení osy y. */
const toMm = (s: number): Mat => scale(s, -s);

const rawHeight = (parts: Parts) => {
  const r = unionPolys(parts.solid).bounds();
  return r.max[1] - r.min[1];
};

let sharedScale: number | null = null;
/** Společné měřítko všech šesti zvířat (mm na herní jednotku).
 *  Schválně JEDNO pro všechny: Avala a Květa jsou tatáž kráva (liší se jen
 *  růžky), takže musí vyjít stejně velké, a Karel je o uši vyšší než ostatní
 *  stejně jako ve hře. Měřítko je zvolené tak, aby PRŮMĚRNÁ výška figurky
 *  (včetně zemní lišty) vyšla `FIGURE_HEIGHT_MM`. */
export function figureScale(): number {
  if (sharedScale !== null) return sharedScale;
  const hs = ANIMAL_ORDER.map((id) => rawHeight(animalParts(id)));
  const mean = hs.reduce((x, y) => x + y, 0) / hs.length;
  sharedScale = (FIGURE_HEIGHT_MM - GROUND_BAR_MM) / mean;
  return sharedScale;
}

export type ProfileInput = {
  id: string;
  parts: Parts;
  /** buď pevné měřítko (mm/jednotku)… */
  scale?: number;
  /** …nebo cílová výška včetně lišty */
  heightMm?: number;
  /** výška zemní lišty; 0 = bez lišty (plochý žeton) */
  barMm?: number;
  minW?: number;
};

/** Obecný postup pro libovolnou boční siluetu: sjednotit primitiva,
 *  změnit měřítko, přidat zemní lištu, zesílit tenká místa, oříznout
 *  spodek do roviny a připravit rytiny. */
export function buildProfile({ id, parts, scale: sIn, heightMm, barMm = GROUND_BAR_MM, minW = MIN_FEATURE_MM }: ProfileInput): Silhouette {
  const { CrossSection } = W();
  const s = sIn ?? ((heightMm ?? FIGURE_HEIGHT_MM) - barMm) / rawHeight(parts);
  const m0 = toMm(s);
  const bb = unionPolys(parts.solid, m0).bounds();

  // Lišta: pod tím, co se dotýká země (spodních 0,5 mm siluety).
  const place = (cx: number): Mat => mul(translate(-cx, barMm - bb.min[1]), m0);
  let body = unionPolys(parts.solid, place(0));
  let x0 = bb.min[0];
  let x1 = bb.max[0];
  if (barMm > 0) {
    const foot = body.intersect(CrossSection.square([1000, barMm + 0.5]).translate(-500, 0)).bounds();
    x0 = foot.min[0] - 1.2;
    x1 = foot.max[0] + 1.2;
  }
  const cx = (x0 + x1) / 2;
  const m = place(cx);
  body = unionPolys(parts.solid, m);
  let outline = barMm > 0 ? body.add(unionPolys([roundRect(x0 - cx, 0, x1 - x0, barMm + 0.6, 0.8)])) : body;
  outline = enforceMinWidth(outline, minW);
  // spodek lišty musí být rovina — zesílení by jinak vystrčilo bouli pod zem
  if (barMm > 0) outline = outline.intersect(CrossSection.square([1000, 1000]).translate(-500, 0));

  const inner = outline.offset(-0.6, "Round", 2, 48);
  const engrave = { low: empty(), deep: empty() };
  for (const d of parts.details) {
    let cs = unionPolys(d.polys, m);
    if (d.mode === "outline") cs = cs.offset(GROOVE_MM / 2, "Round", 2, 48).subtract(cs.offset(-GROOVE_MM / 2, "Round", 2, 48));
    if (d.clip) cs = cs.intersect(unionPolys(d.clip, m));
    if (d.minus) cs = cs.subtract(unionPolys(d.minus, m));
    engrave[d.depth] = engrave[d.depth].add(cs);
  }
  // Rytina nikdy nesahá až na okraj — zůstane lem 0,6 mm a obrys drží tvar.
  // Mělká plocha, která by vyšla užší než rýha, se zahodí (slicer by ji stejně nevytiskl).
  engrave.low = opening(engrave.low.intersect(inner), 0.25);
  engrave.deep = engrave.deep.intersect(inner);
  return { id, outline, engrave, scale: s, bar: [x0 - cx, x1 - cx] };
}

export function animalSilhouette(id: AnimalId): Silhouette {
  return buildProfile({ id, parts: animalParts(id), scale: figureScale() });
}

// ------------------------------------------------------------- SVG náhled

/** SVG pro kontrolu očima: obrys, rytiny a mřížka po 5 mm. */
export function silhouetteSvg(sil: Silhouette, label = sil.id): string {
  const b = sil.outline.bounds();
  const pad = 4;
  const x0 = Math.floor(b.min[0] - pad);
  const y0 = Math.floor(b.min[1] - pad);
  const w = Math.ceil(b.max[0] + pad) - x0;
  const h = Math.ceil(b.max[1] + pad) - y0 + 6;
  const d = (cs: CrossSection) =>
    cs
      .toPolygons()
      .map((p) => "M" + p.map(([x, y]) => `${x.toFixed(3)} ${(-y).toFixed(3)}`).join(" L") + " Z")
      .join(" ");
  const grid: string[] = [];
  for (let x = Math.ceil(x0 / 5) * 5; x <= x0 + w; x += 5) grid.push(`<line x1="${x}" y1="${-(y0 + h)}" x2="${x}" y2="${-y0}" />`);
  for (let y = Math.ceil(y0 / 5) * 5; y <= y0 + h; y += 5) grid.push(`<line x1="${x0}" y1="${-y}" x2="${x0 + w}" y2="${-y}" />`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${-(y0 + h)} ${w} ${h}" width="${w * 12}" height="${h * 12}">
  <rect x="${x0}" y="${-(y0 + h)}" width="${w}" height="${h}" fill="#faf6ee" />
  <g stroke="#e3dccd" stroke-width="0.08">${grid.join("")}</g>
  <path d="${d(sil.outline)}" fill="#6b5a48" fill-rule="evenodd" />
  <path d="${d(sil.engrave.low)}" fill="#a8957e" fill-rule="evenodd" />
  <path d="${d(sil.engrave.deep)}" fill="#efe7da" fill-rule="evenodd" />
  <text x="${x0 + 1}" y="${-(y0 + h) + 4}" font-size="3" font-family="sans-serif" fill="#3d3326">${label} · ${(b.max[0] - b.min[0]).toFixed(1)} × ${(b.max[1] - b.min[1]).toFixed(1)} mm</text>
</svg>
`;
}

