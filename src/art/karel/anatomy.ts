/* KOPIE z TGeeeeq/NMRStranky1.0 @ 7b106da, web/lib/karel/anatomy.ts.
 * Zdroj pravdy je tam (a ve hře Louka Run). Neupravuj tady — oprav zdroj
 * a pusť `bash scripts/sync-anatomy.sh <cesta-k-NMRStranky1.0>`.
 * Úpravy jen pro tisk a 3D patří do `print-overrides.ts`. */

/** Anatomie zvířat z Louka Run — JEDINÝ zdroj pravdy o tom, jak postavy vypadají.
 *
 *  Kreslí se ze stejných čísel na webu (SVG, `components/karel/AnimalSvg.tsx`)
 *  i ve hře (canvas, `drawCharacter` v `js/gfx.js` repozitáře `TGeeeeq/loukarun`).
 *  Souřadnice jsou **herní**: kopyta stojí na y ≈ +9, trup kolem y = −44,
 *  hlava má počátek v `build.head` a čumák míří do +x.
 *
 *  **Proti rozejití obou kopií stojí test, ne dobrá vůle** —
 *  `tests/unit/karel-anatomy.test.ts` čte nasynchronizovanou hru
 *  z `public/loukarun/app/js/` a porovnává barvy i stavbu těla s touhle
 *  tabulkou. Kdo změní hru a nesrovná web (nebo naopak), shodí testy.
 */

export type Species = "osel" | "ovce" | "kráva" | "prase" | "muflon";

export type AnimalId = "karel" | "pogo" | "avala" | "flicek" | "yakul" | "kveta";

/** Přesně ta sada klíčů, kterou má `colors` v `js/data.js`. */
export type AnimalColors = {
  body: string;
  belly: string;
  mane: string;
  muzzle: string;
  ear: string;
  earIn: string;
  hoof: string;
  /** Nohy jiné barvy než trup (ovce, muflon). */
  legs?: string;
  /** Barva fleků; kreslí se jen spolu s `pattern`. */
  spots?: string;
  pattern?: PatternId;
  /** Světlý kroužek kolem oka — poznávací znamení osla. */
  eyeRing?: string;
  /** Tmavý flek přes oko (Květa). */
  eyePatch?: string;
  /** Ofinka do čela (Květa). */
  forelock?: string;
  horns?: string;
  /** Kravka bez růžků (Květa). */
  noHorns?: boolean;
};

export type PatternId = "holstein" | "patches" | "blotch" | "saddle";

/** Jeden flek srsti: `ell(x, y, rx, ry, rot)` ve hře. Ořezává se na trup. */
export type Spot = { x: number; y: number; rx: number; ry: number; rot: number };

export const PATTERNS: Record<PatternId, Spot[]> = {
  holstein: [
    { x: -24, y: -46, rx: 16, ry: 13, rot: 0.35 },
    { x: -8, y: -32, rx: 10, ry: 8, rot: -0.3 },
    { x: 18, y: -51, rx: 14, ry: 10, rot: -0.4 },
    { x: 28, y: -30, rx: 9, ry: 8, rot: 0.5 },
  ],
  patches: [
    { x: -20, y: -32, rx: 16, ry: 11, rot: 0.3 },
    { x: 12, y: -52, rx: 15, ry: 9, rot: -0.35 },
    { x: 30, y: -34, rx: 10, ry: 9, rot: 0.4 },
    { x: -30, y: -50, rx: 9, ry: 7, rot: -0.2 },
  ],
  blotch: [
    { x: -20, y: -44, rx: 11, ry: 8, rot: 0.4 },
    { x: 2, y: -53, rx: 8, ry: 6, rot: -0.2 },
    { x: 20, y: -37, rx: 10, ry: 7, rot: 0.5 },
    { x: -6, y: -28, rx: 7, ry: 5, rot: 0.1 },
  ],
  saddle: [{ x: -2, y: -47, rx: 17, ry: 11, rot: 0.05 }],
};

/** Stavba těla. Osel je podle skutečné předlohy štíhlejší a má delší nohy,
 *  takže se ve hře větví na `slim`; tady je to prostě řádek tabulky. */
export type Build = {
  bodyRX: number;
  bodyRY: number;
  bodyY: number;
  legLen: number;
  legY: number;
  legRX: number;
  /** Poloha hlavy vůči počátku postavy. */
  head: readonly [number, number];
  /** Střed a poloosy bříška. */
  belly: readonly [number, number, number, number];
  tail: readonly [number, number];
  /** Krk: `ell(x, y, rx, ry, rot)`; druhy bez krku ho nemají. */
  neck?: readonly [number, number, number, number, number];
};

const SLIM: Build = {
  bodyRX: 38,
  bodyRY: 20,
  bodyY: -44,
  legLen: 33,
  legY: -25,
  legRX: 4.5,
  head: [38, -63],
  belly: [2, -37, 21, 9],
  tail: [-35, -42],
  neck: [-8, 10, 12, 21, 0.5],
};

const STOUT: Build = {
  bodyRX: 42,
  bodyRY: 26,
  bodyY: -40,
  legLen: 26,
  legY: -18,
  legRX: 5,
  head: [40, -58],
  belly: [2, -30, 26, 13],
  tail: [-38, -36],
};

export const BUILD: Record<Species, Build> = {
  osel: SLIM,
  ovce: STOUT,
  prase: STOUT,
  kráva: { ...STOUT, neck: [-8, 8, 16, 20, 0.5] },
  muflon: { ...STOUT, neck: [-8, 8, 16, 20, 0.5] },
};

/** Nohy: offset, fázový posun a to, jestli je pár vzdálený (kreslí se za tělem
 *  a je o stupínek tmavší, aby vznikla hloubka). Úhlopříčné páry jsou ten krok,
 *  který oko čte jako přirozený. */
export const LEGS = [
  { x: -20, phase: Math.PI, far: true },
  { x: 16, phase: Math.PI * 1.5, far: true },
  { x: -14, phase: Math.PI * 0.5, far: false },
  { x: 24, phase: 0, far: false },
] as const;

export type Animal = {
  id: AnimalId;
  species: Species;
  colors: AnimalColors;
};

/** Barvy jsou opsané 1:1 z `colors` v `js/data.js`. Hlídá to test. */
export const ANIMALS: Record<AnimalId, Animal> = {
  karel: {
    id: "karel",
    species: "osel",
    colors: {
      body: "#45403c", belly: "#93887f", mane: "#211d1a", muzzle: "#efe7da",
      ear: "#45403c", earIn: "#b5a89a", eyeRing: "#c6bab0", hoof: "#26221e",
    },
  },
  pogo: {
    id: "pogo",
    species: "ovce",
    colors: {
      body: "#f2ede2", belly: "#ffffff", mane: "#e2d8c6", muzzle: "#9a8268",
      ear: "#9a8268", earIn: "#c2a888", legs: "#8a7460", hoof: "#463c32",
    },
  },
  avala: {
    id: "avala",
    species: "kráva",
    colors: {
      body: "#9a5226", belly: "#f2e7d4", mane: "#5e3418", muzzle: "#efb9a2",
      ear: "#9a5226", earIn: "#d3a284", spots: "#f2ead9", pattern: "patches",
      hoof: "#3d3128",
    },
  },
  flicek: {
    id: "flicek",
    species: "prase",
    colors: {
      body: "#b3aaa1", belly: "#cec5bc", mane: "#8a817a", muzzle: "#d9a9a0",
      ear: "#9a908a", earIn: "#756c66", spots: "#38342f", pattern: "blotch",
      hoof: "#46403a",
    },
  },
  yakul: {
    id: "yakul",
    species: "muflon",
    colors: {
      body: "#6b4830", belly: "#e6dac6", mane: "#4c3120", muzzle: "#e9dfcd",
      ear: "#6b4830", earIn: "#c2996f", horns: "#c7ad85", spots: "#cbb896",
      pattern: "saddle", legs: "#5a3c28", hoof: "#31261e",
    },
  },
  kveta: {
    id: "kveta",
    species: "kráva",
    colors: {
      body: "#9a5226", belly: "#f2e7d4", mane: "#5e3418", muzzle: "#efb9a2",
      ear: "#9a5226", earIn: "#d3a284", spots: "#f2ead9", pattern: "patches",
      noHorns: true, eyePatch: "#552a12", forelock: "#f7f2e6", hoof: "#3d3128",
    },
  },
};

export const ANIMAL_ORDER: readonly AnimalId[] = ["karel", "pogo", "avala", "flicek", "yakul", "kveta"];

/** Port `shade()` z `js/gfx.js` — přičtení stejné hodnoty ke všem složkám.
 *  Není to převod do HSL: hra to dělá takhle a odstíny musí vyjít stejně,
 *  jinak se obě kresby rozejdou o půl tónu a nikdo nepozná proč. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(v + 255 * amt))),
  );
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Rámeček kreslicí plochy. **Naměřený, ne odhadnutý** — v prohlížeči se sejme
 *  rámeček skutečně vykreslené geometrie ve všech pózách a ve všech šesti
 *  druzích. Dokud byl utažený na klidový postoj, **uřízlo to Karlovi kus
 *  čumáku** pokaždé, když se sehnul k trávě: póza „pase se" otočí hlavu o 30°
 *  dopředu a čumák vyjede na x ≈ 87,5, tedy 18 jednotek za tehdejší okraj.
 *  Naměřené krajní hodnoty: x ∈ ⟨−63,2; 87,5⟩, y ∈ ⟨−112,1; 17⟩ (dole je
 *  stín na zemi). Kolem je ~3 jednotky rezervy. Hlídá
 *  `tests/unit/karel-anatomy.test.ts` — kdo přidá delší roh nebo vyšší
 *  klobouk, musí rámeček přeměřit, ne odhadnout.
 *  Poměr stran se změnil, takže postava sázená přes `h-*` je širší než dřív. */
export const VIEW_BOX = { x: -67, y: -116, w: 158, h: 136 } as const;

export const viewBoxAttr = `${VIEW_BOX.x} ${VIEW_BOX.y} ${VIEW_BOX.w} ${VIEW_BOX.h}`;
