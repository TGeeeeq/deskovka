/** 3D tisk: díly se dají postavit, jsou uzavřené (manifold), mají rozumné
 *  rozměry a žádné místo není tenčí než tryska zvládne. */

import { beforeAll, describe, expect, it } from "vitest";
import { getWasm, unionPolys } from "../../scripts/3d/wasm";
import { animalParts, animalSilhouette, figureScale, MIN_FEATURE_MM, thinArea } from "../../scripts/3d/silhouette";
import { animalBase, BASE, figureFromSilhouette, FIGURE_DEPTH_MM, itemToken, SLOT_CLEARANCE_MM, TAB, TOKEN_MM } from "../../scripts/3d/parts";
import { stlBuffer } from "../../scripts/3d/stl";
import { scale } from "../../scripts/3d/geom";
import type { Manifold } from "manifold-3d";

const size = (m: Manifold) => {
  const b = m.boundingBox();
  return [0, 1, 2].map((i) => b.max[i] - b.min[i]);
};

function expectSolid(m: Manifold) {
  expect(m.status()).toBe("NoError");
  expect(m.isEmpty()).toBe(false);
  expect(m.volume()).toBeGreaterThan(0);
  expect(m.boundingBox().min[2]).toBeCloseTo(0, 5); // leží na podložce
}

beforeAll(async () => {
  await getWasm();
});

describe("figurka", () => {
  it("Yakul: zavřený díl, stojí na liště, rozměry kolem 30 mm", () => {
    const sil = animalSilhouette("yakul");
    const fig = figureFromSilhouette(sil);
    expectSolid(fig);
    const [w, h, d] = size(fig);
    expect(d).toBeCloseTo(FIGURE_DEPTH_MM, 5);
    expect(h).toBeGreaterThan(26);
    expect(h).toBeLessThan(38);
    expect(w).toBeGreaterThan(25);
    expect(w).toBeLessThan(45);
    // spodek je rovná lišta: řez těsně nad podložkou je souvislý pás
    const foot = sil.outline.intersect(unionPolys([[[-100, 0], [100, 0], [100, 0.3], [-100, 0.3]]]));
    expect(foot.decompose()).toHaveLength(1);
    expect(foot.bounds().max[0] - foot.bounds().min[0]).toBeGreaterThan(12);
    // rytiny figurku neproděraví a nesnědí víc než pár procent objemu
    expect(fig.volume()).toBeGreaterThan(sil.outline.area() * FIGURE_DEPTH_MM * 0.9);
  });

  it("nejtenčí místo siluety je aspoň 1,2 mm — i u rohu a ocásku", () => {
    for (const id of ["karel", "yakul", "flicek"] as const) {
      const sil = animalSilhouette(id);
      expect(thinArea(sil.outline, MIN_FEATURE_MM), id).toBeLessThan(0.15);
      // bez zesílení by tenká místa měla (ouška, špička rohu, ocásek)
      const raw = unionPolys(animalParts(id).solid, scale(figureScale(), -figureScale()));
      expect(thinArea(raw, MIN_FEATURE_MM), `${id} před zesílením`).toBeGreaterThan(thinArea(sil.outline, MIN_FEATURE_MM));
    }
  });

  it("Avala a Květa vyjdou ve stejném měřítku (tatáž kráva)", () => {
    expect(animalSilhouette("avala").scale).toBe(animalSilhouette("kveta").scale);
  });

  it("čep figurky padne do drážky podstavce s vůlí", () => {
    const sil = animalSilhouette("karel");
    const fig = figureFromSilhouette(sil, { slot: true });
    expectSolid(fig);
    const [, h] = size(fig);
    const [, h0] = size(figureFromSilhouette(sil));
    expect(h - h0).toBeCloseTo(TAB.h, 1);
    expect(TAB.h).toBeLessThan(BASE.slotDepth);
  });
});

describe("podstavec", () => {
  it("Ø26 × 3 mm s drážkou a vystouplou značkou", () => {
    const base = animalBase("kveta");
    expectSolid(base);
    const [w, l, h] = size(base);
    expect(w).toBeCloseTo(BASE.d, 1);
    expect(l).toBeCloseTo(BASE.d, 1);
    expect(h).toBeCloseTo(BASE.h + BASE.emboss, 5);
    // v půlce výšky je drážka (díra o velikosti čepu s vůlí)
    const mid = base.slice(BASE.h - 0.5);
    const hole = (TAB.w + 2 * SLOT_CLEARANCE_MM) * (FIGURE_DEPTH_MM + 2 * SLOT_CLEARANCE_MM);
    expect(Math.PI * (BASE.d / 2) ** 2 - mid.area()).toBeGreaterThan(hole * 0.95);
    // dno drážky drží: těsně nad podložkou je plný kotouč
    expect(base.slice(0.3).decompose()).toHaveLength(1);
    // vystouplá značka (tvar, číslice, kroužek) je nad 3 mm
    expect(base.slice(BASE.h + 0.3).area()).toBeGreaterThan(30);
  });
});

describe("žetony", () => {
  it("surovina je rovná 3 mm, výrobek má lem 0,6 mm", () => {
    const trava = itemToken("trava");
    const seno = itemToken("seno");
    for (const m of [trava, seno]) expectSolid(m);
    const [tw, tl, th] = size(trava);
    expect(th).toBeCloseTo(TOKEN_MM.h, 5);
    expect(Math.max(tw, tl)).toBeGreaterThan(13);
    expect(Math.max(tw, tl)).toBeLessThan(17);
    expect(size(seno)[2]).toBeCloseTo(TOKEN_MM.h + TOKEN_MM.rim, 5);
    // lem je jen po obvodu — uprostřed je žeton nízký
    expect(seno.slice(TOKEN_MM.h + 0.3).area()).toBeLessThan(seno.slice(1).area() * 0.6);
  });

  it("kroužek (Křížaly) má díru", () => {
    expect(itemToken("krizaly").genus()).toBe(1);
  });

  it("binární STL má správnou délku", () => {
    const m = itemToken("ovoce");
    expect(stlBuffer(m).length).toBe(84 + 50 * m.numTri());
  });
});
