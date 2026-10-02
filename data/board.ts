import type { RecipeDef, RecipeId, ShortcutDef, SpaceDef, StationDef, StationId } from "./types";

/** Deska je čtverec 500×500 mm. Smyčka vede kolem středu, kde leží
 *  Zimní spíž, ukazatel kol a sloty Potřeb a Projektů. */
export const BOARD_MM = 500;
export const SPACE_COUNT = 30;

const STATION_AT: Record<number, StationId> = {
  1: "brana",
  3: "senik",
  6: "kompost",
  8: "louka",
  11: "tresne",
  13: "sad",
  15: "svestky",
  18: "potok",
  21: "zahradka",
  23: "solar",
  25: "dilna",
  27: "maringotka",
};
const EVENT_AT = new Set([5, 10, 16, 20, 26, 29]);

/** Organická smyčka: elipsa s mírným zvlněním, start dole uprostřed (brána),
 *  po směru hodin doleva nahoru. Souřadnice se počítají, ne opisují,
 *  aby tisk, web i 3D měly jedinou geometrii. */
function loopPoint(i: number): { x: number; y: number } {
  const t = Math.PI / 2 + (i / SPACE_COUNT) * Math.PI * 2;
  const wob = 1 + 0.045 * Math.sin(3 * t + 0.6) + 0.025 * Math.cos(5 * t);
  return {
    x: Math.round((250 + Math.cos(t) * 196 * wob) * 10) / 10,
    y: Math.round((252 + Math.sin(t) * 190 * wob) * 10) / 10,
  };
}

export const SPACES: SpaceDef[] = Array.from({ length: SPACE_COUNT }, (_, i) => {
  const n = i + 1;
  const p = loopPoint(i);
  const station = STATION_AT[n];
  return {
    n,
    kind: station ? "station" : EVENT_AT.has(n) ? "event" : "path",
    station,
    x: p.x,
    y: p.y,
  };
});

export const SHORTCUTS: ShortcutDef[] = [
  { id: "sad", name: "Vrata do sadu", a: 3, b: 13, gate: true },
  { id: "maringotka", name: "Vrata u maringotky", a: 8, b: 27, gate: true },
  { id: "potok", name: "Skok přes potok", a: 11, b: 21, gate: false, only: ["pogo", "yakul"] },
];
export const SHORTCUT_COST = 2;

export const STATIONS: Record<StationId, StationDef> = {
  brana: { id: "brana", space: 1, name: "Brána s kamenem", short: "Brána", gather: [], recipes: [], start: {}, hint: "Start. Vyhlížej: táhni Událost (jednou za kolo pro celý tým)." },
  senik: { id: "senik", space: 3, name: "Seník", short: "Seník", gather: ["hnuj"], recipes: [], start: { hnuj: 2 }, hint: "Zimní spíž. Odevzdej výrobky, ulož suroviny. Vymetení přístřešku dává Hnůj." },
  kompost: { id: "kompost", space: 6, name: "Kompost", short: "Kompost", gather: ["hnuj"], recipes: ["kompost"], start: { hnuj: 1 }, hint: "2 Hnůj + 1 Voda → Kompost. Za deště bez Vody." },
  louka: { id: "louka", space: 8, name: "Louka na seno", short: "Louka", gather: ["trava"], recipes: ["seno"], start: { trava: 3 }, hint: "2 Tráva → Seno, jen za sucha (ne v dešti)." },
  tresne: { id: "tresne", space: 11, name: "Třešňová alej", short: "Třešně", gather: ["ovoce"], recipes: [], start: {}, hint: "Ovoce jen v létě." },
  sad: { id: "sad", space: 13, name: "Ovocný sad", short: "Sad", gather: ["ovoce"], recipes: [], start: {}, hint: "Ovoce v létě a na podzim." },
  svestky: { id: "svestky", space: 15, name: "Jablečno-švestková alej", short: "Švestky", gather: ["ovoce"], recipes: [], start: {}, hint: "Ovoce jen na podzim." },
  potok: { id: "potok", space: 18, name: "Potok v údolí", short: "Potok", gather: ["voda", "prouti"], recipes: [], start: { voda: 2, prouti: 2 }, hint: "Voda a vrbové proutí." },
  zahradka: { id: "zahradka", space: 21, name: "Bylinková zahrádka a fóliovník", short: "Zahrádka", gather: ["bylinky"], recipes: ["susene"], start: { bylinky: 2 }, hint: "2 Bylinky → Sušené bylinky za slunce nebo polojasna.", who: "Maruška" },
  solar: { id: "solar", space: 23, name: "Solár a studna", short: "Solár", gather: ["voda"], recipes: ["krizaly"], start: {}, hint: "2 Ovoce → Křížaly v solární sušičce (slunce, polojasno).", who: "Tony" },
  dilna: { id: "dilna", space: 25, name: "Dílna", short: "Dílna", gather: ["ovoce"], recipes: [], start: { ovoce: 2 }, hint: "Tomášova dílna. Lednice v kůlně (Ovoce) a projekty.", who: "Tomáš" },
  maringotka: { id: "maringotka", space: 27, name: "Maringotka", short: "Maringotka", gather: ["vlna"], recipes: ["pelisek"], start: {}, hint: "Odpočinek dává srdíčka. 1 Vlna + 1 Seno → Pelíšek." },
};

export const STATION_IDS = Object.keys(STATIONS) as StationId[];
export const STATION_CAP = 6;
/** Louka je velká — trávy unese víc. */
export const MEADOW_CAP = 8;

export const RECIPES: Record<RecipeId, RecipeDef> = {
  seno: { id: "seno", product: "seno", inputs: { trava: 2 }, stations: ["louka"], weather: ["slunce", "polojasno", "vitr"], note: "Seno se suší za sucha — v dešti, bouřce ani mrazu ne." },
  susene: { id: "susene", product: "susene", inputs: { bylinky: 2 }, stations: ["zahradka"], weather: ["slunce", "polojasno", "vitr"], note: "Bylinky schnou za sucha, ve stínu fóliovníku." },
  krizaly: { id: "krizaly", product: "krizaly", inputs: { ovoce: 2 }, stations: ["solar"], weather: ["slunce", "polojasno"], note: "Solární sušička suší i za polojasna, v dešti ne." },
  kompost: { id: "kompost", product: "kompost", inputs: { hnuj: 2, voda: 1 }, stations: ["kompost"], weather: [], note: "Za deště se Voda nepotřebuje." },
  pelisek: { id: "pelisek", product: "pelisek", inputs: { vlna: 1, seno: 1 }, stations: ["maringotka"], weather: [], note: "Pelíšek na zimu z vlny a sena." },
};

export const spaceOf = (n: number) => SPACES[n - 1];
export const stationAt = (n: number): StationId | undefined => SPACES[n - 1]?.station;
