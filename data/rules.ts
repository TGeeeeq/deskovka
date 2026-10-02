import type { ProductId, SeasonId } from "./types";

export const SEASONS: SeasonId[] = ["jaro", "leto", "podzim"];
export const SEASON_NAME: Record<SeasonId, string> = { jaro: "Jaro", leto: "Léto", podzim: "Podzim" };

export type DifficultyId = "klidna" | "normalni" | "tezka" | "hrdinska";

export type DifficultyDef = {
  id: DifficultyId;
  name: string;
  harsh: Record<SeasonId, number>;
  pantryMod: Partial<Record<ProductId, number>>;
  startHearts: number;
  needDeadlineMod: number;
  alwaysEarlyWinter?: boolean;
  /** Cílové pásmo podílu her s aspoň Dobrou zimou (ověřuje simulace). */
  target: [number, number];
};

export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  klidna: { id: "klidna", name: "Klidná louka", harsh: { jaro: 0, leto: 0, podzim: 0 }, pantryMod: { seno: -1 }, startHearts: 1, needDeadlineMod: 1, target: [0.85, 0.95] },
  normalni: { id: "normalni", name: "Normální", harsh: { jaro: 0, leto: 1, podzim: 1 }, pantryMod: {}, startHearts: 0, needDeadlineMod: 0, target: [0.6, 0.72] },
  tezka: { id: "tezka", name: "Těžká", harsh: { jaro: 1, leto: 1, podzim: 2 }, pantryMod: { seno: 1 }, startHearts: 0, needDeadlineMod: 0, target: [0.38, 0.52] },
  hrdinska: { id: "hrdinska", name: "Hrdinská", harsh: { jaro: 1, leto: 2, podzim: 2 }, pantryMod: { seno: 1, pelisek: 1 }, startHearts: 0, needDeadlineMod: 0, alwaysEarlyWinter: true, target: [0.18, 0.32] },
};

/** Zimní spíž (Normální) podle počtu zvířat ve hře. */
export const PANTRY_BASE: Record<2 | 3 | 4, Record<ProductId, number>> = {
  2: { seno: 3, pelisek: 1, susene: 1, krizaly: 1, kompost: 1 },
  3: { seno: 4, pelisek: 2, susene: 1, krizaly: 1, kompost: 1 },
  4: { seno: 5, pelisek: 2, susene: 2, krizaly: 2, kompost: 1 },
};

export const PANTRY_ORDER: ProductId[] = ["seno", "pelisek", "susene", "krizaly", "kompost"];

export function pantryTarget(animals: number, diff: DifficultyId): Record<ProductId, number> {
  const base = { ...PANTRY_BASE[Math.max(2, Math.min(4, animals)) as 2 | 3 | 4] };
  for (const [k, v] of Object.entries(DIFFICULTIES[diff].pantryMod)) base[k as ProductId] = Math.max(1, base[k as ProductId] + (v ?? 0));
  return base;
}

export const roundsPerSeason = (animals: number) => (animals <= 2 ? 4 : 3);

/** Stupně zimy: [Dobrá od, Hojná od] podle počtu zvířat. */
export const WINTER_TIERS: Record<2 | 3 | 4, [number, number]> = {
  2: [8, 13],
  3: [9, 14],
  4: [10, 15],
};

export type TierId = "hubena" | "dobra" | "hojna";
export const TIER_TEXT: Record<TierId, { name: string; flavor: string }> = {
  hojna: { name: "Hojná zima", flavor: "Zbylo i na jaro. Karel to spočítal. …Dvakrát." },
  dobra: { name: "Dobrá zima", flavor: "Všichni v teple a seno voní. …Karel taky. Trochu." },
  hubena: { name: "Hubená zima", flavor: "Sousedi z Vlkanče přivezli seno. Bylo ho málo, ale nikdo nebyl sám. …Karel jim poděkoval. Nahlas." },
};

export const START_SUPPLY_NOTE = "Louka 3 Tráva, Potok 2 Voda + 2 Proutí, Zahrádka 2 Bylinky, Seník 2 Hnůj, Kompost 1 Hnůj, lednice v Dílně 2 Ovoce.";

export const STORM_TIMES = [60, 90, 0] as const;
export type StormTime = (typeof STORM_TIMES)[number];

/** Síla akce z hodnoty kostky. */
export const strengthOf = (die: number) => (die <= 2 ? 1 : die <= 4 ? 2 : 3);
/** Kolik receptů dá síla. */
export const craftsOf = (s: number) => [0, 1, 2, 3, 4][s] ?? 0;
/** Kolik Práce dá síla. */
export const workOf = (s: number) => [0, 1, 2, 3, 5][s] ?? 0;
