/** Jediné místo, které startuje manifold-3d (WASM). Modul se načte jednou
 *  a sdílí ho skript i testy. */

import Module from "manifold-3d";
import type { CrossSection, ManifoldToplevel } from "manifold-3d";
import { signedArea, type Mat, type Poly, applyPoly } from "./geom";

let wasm: ManifoldToplevel | null = null;

export async function getWasm(): Promise<ManifoldToplevel> {
  if (wasm) return wasm;
  const w = await Module();
  w.setup();
  // Kruhy po ~0,35 mm — pod rozlišením trysky 0,4 mm, ale bez zbytečných
  // tisíců trojúhelníků v deskách se 30 žetony.
  w.setMinCircularEdgeLength(0.35);
  w.setMinCircularAngle(6);
  wasm = w;
  return w;
}

/** Synchronní přístup pro moduly, které běží až po `getWasm()`. */
export function W(): ManifoldToplevel {
  if (!wasm) throw new Error("manifold-3d ještě není načtené — zavolej nejdřív await getWasm()");
  return wasm;
}

const ccw = (p: Poly): Poly => (signedArea(p) < 0 ? [...p].reverse() : p);

/** Sjednocení jednoduchých polygonů (každý zvlášť vyplněný) do CrossSection.
 *  `m` převádí ze souřadnic zdroje do mm; když převrací osu y, orientace se
 *  opraví tady, takže na směru obíhání zdrojových bodů nezáleží. */
export function unionPolys(polys: Poly[], m?: Mat): CrossSection {
  const { CrossSection } = W();
  const list = polys.filter((p) => p.length >= 3).map((p) => ccw(m ? applyPoly(m, p) : p));
  if (!list.length) return empty();
  return new CrossSection(list, "Positive");
}

/** Prázdný tvar (manifold-3d nepřijme prázdný seznam kontur). */
export const empty = (): CrossSection => W().CrossSection.square([0, 0]);

/** Polygony s dírami (sudo-liché pravidlo jako `fill-rule="evenodd"`). */
export function evenOdd(polys: Poly[], m?: Mat): CrossSection {
  const { CrossSection } = W();
  return new CrossSection(
    polys.map((p) => (m ? applyPoly(m, p) : p)),
    "EvenOdd",
  );
}
