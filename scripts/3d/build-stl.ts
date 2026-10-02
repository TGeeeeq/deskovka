/** `npm run models` — vygeneruje všechny STL pro 3D tisk do `out/3d/`.
 *
 *  Figurky, podstavce, žetony, doplňky a tiskové desky 220 × 220 mm.
 *  Popis souborů, nastavení sliceru a počty kusů: `docs/3D.md`. */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Manifold } from "manifold-3d";
import { ANIMAL_DEFS, ANIMAL_IDS } from "../../data/animals";
import { ITEMS } from "../../data/items";
import type { ItemId } from "../../data/types";
import {
  animalBase,
  BASE,
  cardHolder,
  figureFromSilhouette,
  geeseSilhouette,
  heartToken,
  itemToken,
  lucinkaSilhouette,
  lucinkaToken,
  markerMotif,
  stadiumBase,
  wheelbarrowSilhouette,
  workCube,
} from "./parts";
import { animalSilhouette, silhouetteSvg, thinArea } from "./silhouette";
import { copies, plate, writeStl } from "./stl";
import { getWasm, W } from "./wasm";

const OUT = "out/3d";

/** Počty mimo `data/items.ts` (tam jsou jen suroviny a výrobky). */
const EXTRA_COUNTS = { srdicka: 30, prace: 20, stojanky: 4 } as const;

type Row = { file: string; volume: number; bbox: [number, number, number]; tris: number };
const rows: Row[] = [];

function save(name: string, m: Manifold) {
  const path = join(OUT, name);
  writeStl(path, m, name);
  const b = m.boundingBox();
  rows.push({
    file: name,
    volume: m.volume(),
    bbox: [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]].map((v) => Math.round(v * 10) / 10) as [number, number, number],
    tris: m.numTri(),
  });
}

/** Odhad času tisku (min) a hmotnosti (g, PLA). Jen ORIENTAČNÍ — malé díly
 *  tiskne slicer pomaleji (minimální čas vrstvy), skutečný čas řekne slicer.
 *  `fill` = podíl objemu, který se opravdu vytiskne (stěny + výplň). */
function profileOf(file: string): { layer: number; fill: number } {
  if (/-figure|figurky|doplnky/.test(file)) return { layer: 0.12, fill: 0.75 };
  if (/stojan/.test(file)) return { layer: 0.2, fill: 0.35 };
  if (/prace/.test(file)) return { layer: 0.2, fill: 0.6 };
  return { layer: 0.2, fill: 0.9 };
}

function estimate(volume: number, file: string) {
  const { layer, fill } = profileOf(file);
  const rate = layer <= 0.16 ? 60 : 120; // mm³/min u drobných dílů (vč. přejezdů a chlazení)
  const v = volume * fill;
  return { layer, min: Math.round(3 + v / rate), g: Math.round((v / 1000) * 1.24 * 10) / 10 };
}

async function main() {
  await getWasm();
  mkdirSync(join(OUT, "plates"), { recursive: true });
  const t0 = performance.now();

  // --- figurky a podstavce
  const figs: Manifold[] = [];
  const figsSlot: Manifold[] = [];
  const bases: Manifold[] = [];
  for (const id of ANIMAL_IDS) {
    const sil = animalSilhouette(id);
    const thin = thinArea(sil.outline);
    if (thin > 0.15) throw new Error(`${id}: tenké místo ${thin.toFixed(3)} mm² — zesílení selhalo`);
    writeFileSync(join(OUT, `${id}-silhouette.svg`), silhouetteSvg(sil, ANIMAL_DEFS[id].name));
    const f = figureFromSilhouette(sil);
    const fs = figureFromSilhouette(sil, { slot: true });
    const base = animalBase(id, true);
    save(`${id}-figure.stl`, f);
    save(`${id}-figure-slot.stl`, fs);
    save(`${id}-base.stl`, base);
    save(`${id}-base-bez-kruhu.stl`, animalBase(id, false));
    writeFileSync(join(OUT, `${id}-base-top.svg`), motifSvg(id));
    figs.push(f);
    figsSlot.push(fs);
    bases.push(base);
  }

  // --- žetony
  const tokens = {} as Record<ItemId, Manifold>;
  for (const id of Object.keys(ITEMS) as ItemId[]) {
    tokens[id] = itemToken(id);
    save(`${id}-token.stl`, tokens[id]);
  }

  // --- doplňky
  const heart = heartToken(14);
  const cube = workCube(9, 0.8);
  const holder = cardHolder();
  const kolecko = wheelbarrowSilhouette();
  const husy = geeseSilhouette();
  const lucinka = lucinkaToken();
  writeFileSync(join(OUT, "kolecko-silhouette.svg"), silhouetteSvg(kolecko, "Kolečko"));
  writeFileSync(join(OUT, "husy-silhouette.svg"), silhouetteSvg(husy, "Husy"));
  writeFileSync(join(OUT, "lucinka-silhouette.svg"), silhouetteSvg(lucinkaSilhouette(), "Lucinka"));
  const koleckoSlot = figureFromSilhouette(kolecko, { slot: true });
  const husySlot = figureFromSilhouette(husy, { slot: true });
  const koleckoBase = stadiumBase(30);
  const husyBase = stadiumBase(Math.ceil(husy.bar[1] - husy.bar[0]) + 6);
  save("srdicko-token.stl", heart);
  save("prace-kostka.stl", cube);
  save("stojanek-na-kartu.stl", holder);
  save("kolecko-figure.stl", figureFromSilhouette(kolecko));
  save("kolecko-figure-slot.stl", koleckoSlot);
  save("kolecko-base.stl", koleckoBase);
  save("husy-figure.stl", figureFromSilhouette(husy));
  save("husy-figure-slot.stl", husySlot);
  save("husy-base.stl", husyBase);
  save("lucinka-token.stl", lucinka);

  // --- tiskové desky 220 × 220 mm
  save("plates/figurky-plate.stl", plate(figsSlot));
  save("plates/figurky-bez-podstavce-plate.stl", plate(figs));
  save("plates/podstavce-plate.stl", plate(bases));
  for (const id of Object.keys(ITEMS) as ItemId[]) save(`plates/${id}-plate.stl`, plate(copies(tokens[id], ITEMS[id].tokens)));
  save("plates/srdicka-plate.stl", plate(copies(heart, EXTRA_COUNTS.srdicka)));
  save("plates/prace-plate.stl", plate(copies(cube, EXTRA_COUNTS.prace)));
  save("plates/stojanky-plate.stl", plate(copies(holder, EXTRA_COUNTS.stojanky)));
  save("plates/doplnky-plate.stl", plate([husySlot, husyBase, koleckoSlot, koleckoBase, lucinka]));

  // --- souhrn
  const summary = rows.map((r) => ({ ...r, volume: Math.round(r.volume), odhad: estimate(r.volume, r.file) }));
  writeFileSync(join(OUT, "souhrn.json"), JSON.stringify({ vygenerovano: new Date().toISOString(), baseColorChangeMm: BASE.h, soubory: summary }, null, 2));
  const wide = 34;
  console.log(`${"soubor".padEnd(wide)} ${"rozměr mm".padEnd(18)} ${"objem".padStart(7)}  odhad`);
  for (const r of summary) {
    console.log(
      `${r.file.padEnd(wide)} ${r.bbox.join("×").padEnd(18)} ${String(r.volume).padStart(6)}³  ~${r.odhad.min} min, ~${r.odhad.g} g (vrstva ${r.odhad.layer})`,
    );
  }
  console.log(`\n${rows.length} STL v ${OUT}/ za ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}

/** Pohled shora na podstavec (SVG) — pro kontrolu značky očima. */
function motifSvg(id: (typeof ANIMAL_IDS)[number]): string {
  const m = ANIMAL_DEFS[id].marker;
  const cs = markerMotif(m.shape, m.numeral, true);
  const R = BASE.d / 2;
  const d = cs
    .toPolygons()
    .map((p) => "M" + p.map(([x, y]) => `${x.toFixed(3)} ${(-y).toFixed(3)}`).join(" L") + " Z")
    .join(" ");
  const slot = W().CrossSection.square([10.4, 6.9], true).toPolygons()[0];
  const sd = "M" + slot.map(([x, y]) => `${x} ${-y}`).join(" L") + " Z";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-R - 1} ${-R - 1} ${2 * R + 2} ${2 * R + 2}" width="420" height="420">
  <circle r="${R}" fill="#f4ecd8" />
  <path d="${sd}" fill="#9a8f80" />
  <path d="${d}" fill="${m.ring}" fill-rule="nonzero" />
</svg>
`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
