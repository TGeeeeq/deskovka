import type { AnimalId } from "./types";

/** Sběratelské karty Louky (prototyp, sada „Louka 2026“).
 *
 *  Hratelný základ je úplný balíček v krabici: kvarteto 8 skupin × A–D, stejné karty
 *  slouží i k přebíjení. Vzácnost NEMĚNÍ hodnoty — vzácné, holo a legendární karty
 *  jsou paralelní verze téže karty (stejný kód, stejná čísla, jiné zpracování).
 *  Díky tomu jde balíček vždy dohrát a sbírá se pro radost, ne pro výhru.
 *
 *  Hodnoty vlastností jsou NÁVRH — nastaví je tým, který zvířata zná. Nejsou to fakta. */

export type Rarity = "bezna" | "vzacna" | "holo" | "legenda";
export type CollectSeason = "jaro" | "leto" | "podzim" | "zima";
export type StatId = "srdce" | "skok" | "hlas" | "hlava" | "mlsnost";
export type CollectWear = "hat" | "cap" | "bell" | "shades" | "bowtie" | "winter" | "crown";

export const SET = { name: "Louka 2026", size: 32 } as const;

export const RARITY: Record<Rarity, { name: string; how: string }> = {
  bezna: { name: "Běžná", how: "V každé krabici, celý balíček." },
  vzacna: { name: "Vzácná", how: "Přídavek k hře, dárcovská odměna." },
  holo: { name: "Holo", how: "Akce na Louce, soutěž v Louka Run." },
  legenda: { name: "Legendární", how: "Číslovaná, jen osobně na Louce. Nedá se koupit." },
};

export const STATS: { id: StatId; name: string; hint: string }[] = [
  { id: "srdce", name: "Srdce", hint: "jak rád stojí vedle" },
  { id: "skok", name: "Skok", hint: "přes co se dostane" },
  { id: "hlas", name: "Hlas", hint: "kam je slyšet" },
  { id: "hlava", name: "Tvrdá hlava", hint: "jak dlouho vydrží trvat na svém" },
  { id: "mlsnost", name: "Mlsnost", hint: "kolik jablek je dost" },
];

export const COLLECT_SEASON: Record<CollectSeason, { name: string; letter: "A" | "B" | "C" | "D" }> = {
  jaro: { name: "Jaro", letter: "A" },
  leto: { name: "Léto", letter: "B" },
  podzim: { name: "Podzim", letter: "C" },
  zima: { name: "Zima", letter: "D" },
};

/** Skupina kvarteta = jedno zvíře. Skupiny 7 a 8 čekají na další zvířata z Louky. */
export const GROUP: Partial<Record<AnimalId, number>> = { karel: 1, pogo: 2, avala: 3, kveta: 4, flicek: 5, yakul: 6 };

export type CollectCardDef = {
  id: string;
  animal: AnimalId;
  season: CollectSeason;
  /** Pořadí v sadě (1–32). */
  no: number;
  title: string;
  wear?: CollectWear;
  stats: Record<StatId, number>;
  quote: string;
};

export type CollectPrint = {
  card: string;
  rarity: Rarity;
  /** Jen legendární: pořadové číslo výtisku a náklad. */
  serial?: { n: number; of: number };
  /** Jen holo a legendární: kde se karta dala získat (tiskne se jako razítko). */
  origin?: string;
  wear?: CollectWear;
  title?: string;
  quote?: string;
};

export const COLLECT_CARDS: CollectCardDef[] = [
  { id: "1A", animal: "karel", season: "jaro", no: 1, title: "Karel na jaře", wear: "hat", stats: { srdce: 92, skok: 18, hlas: 97, hlava: 95, mlsnost: 74 }, quote: "Tráva roste. Já taky. …Do šířky." },
  { id: "1B", animal: "karel", season: "leto", no: 2, title: "Karel ve stínu", wear: "shades", stats: { srdce: 90, skok: 14, hlas: 88, hlava: 99, mlsnost: 66 }, quote: "Stín nehledám. …Stín si najde mě." },
  { id: "1C", animal: "karel", season: "podzim", no: 3, title: "Karel u sena", wear: "bowtie", stats: { srdce: 94, skok: 20, hlas: 93, hlava: 96, mlsnost: 89 }, quote: "Seno jsem přepočítal. …Jedno chybí. Vím kde." },
  { id: "1D", animal: "karel", season: "zima", no: 4, title: "Karel ve sněhu", wear: "winter", stats: { srdce: 99, skok: 12, hlas: 95, hlava: 97, mlsnost: 80 }, quote: "Zima? Stojím vedle. …Tobě je tepleji." },
  { id: "2B", animal: "pogo", season: "leto", no: 6, title: "Pogo po stříhání", stats: { srdce: 41, skok: 96, hlas: 62, hlava: 90, mlsnost: 58 }, quote: "Nemluvím s vámi. …Ale skočím, ať to vidíte." },
  { id: "6D", animal: "yakul", season: "zima", no: 24, title: "Yakul v závěji", wear: "winter", stats: { srdce: 63, skok: 94, hlas: 34, hlava: 86, mlsnost: 47 }, quote: "Půl metru, i ve sněhu. …Závěj to respektuje." },
];

export const COLLECT_BY_ID: Record<string, CollectCardDef> = Object.fromEntries(COLLECT_CARDS.map((c) => [c.id, c]));

/** Ukázka paralelních verzí: tatáž karta 1D ve čtyřech vzácnostech, plus holo Yakul a vzácná Pogo. */
export const SHOWCASE: CollectPrint[] = [
  { card: "1D", rarity: "bezna" },
  { card: "1D", rarity: "vzacna" },
  { card: "1D", rarity: "holo", origin: "Louka Run · zimní výzva" },
  { card: "1D", rarity: "legenda", serial: { n: 7, of: 50 }, origin: "Den Louky 2026", wear: "crown", title: "Karel, král Louky", quote: "Nejsem král. …Korunu ale vracet nebudu." },
  { card: "2B", rarity: "vzacna" },
  { card: "6D", rarity: "holo", origin: "Brigáda na Louce" },
];
