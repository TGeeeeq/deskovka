import type { AnimalId, Bag, GateId, ItemId, RecipeId, SeasonId, StationId, WeatherIcon } from "@data/types";
import type { DifficultyId, StormTime, TierId } from "@data/rules";
import type { WeatherMod } from "@data/cards/weather";

export type GameConfig = {
  animals: AnimalId[];
  difficulty: DifficultyId;
  storm: boolean;
  stormTime: StormTime;
  expert: boolean;
  seed: string;
  /** Kolik lidí u stolu (jen informace pro UI, sólo = 1). */
  humans?: number;
};

export type AnimalState = {
  id: AnimalId;
  pos: number;
  cargo: Bag;
  hearts: number;
  unlocked: boolean;
  /** Pomáhal/a v tomto kole (žeton „Pomohl/a jsem"). */
  helped: boolean;
  lucinka: boolean;
  usedRypacek: boolean;
  usedFridge: boolean;
  usedHykani: boolean;
  usedGrunt: boolean;
  usedYakulCancel: boolean;
  freeStep: number;
  walk: boolean;
  brigada: boolean;
  moveBonusNext: number;
  weatherImmune: boolean;
  immuneNext: boolean;
  rerollFree: boolean;
};

export type NeedSlot = { id: string; due: number; violated?: boolean };
export type ProjectSlot = { id: string; work: number; mat: Bag; joint: boolean; altPaid: boolean; done: boolean };

export type Pending =
  | { k: "pogoSwap"; cards: [string, string] }
  | { k: "avalaPeek"; cards: string[] }
  | { k: "yakulCancel"; card: string }
  | { k: "kvetaPremove"; options: number[] }
  | { k: "eventKeep"; card: string; actor: AnimalId }
  | { k: "project"; card: string; n: number; solarN: number; options: string[] }
  | { k: "orderWeather"; cards: string[] }
  | { k: "discardEvent"; card: string; actor: AnimalId };

export type TurnStage = "roll" | "assign" | "move" | "act" | "end";

export type TurnState = {
  animal: AnimalId;
  stage: TurnStage;
  dice: number[];
  moveDie: number | null;
  strDie: number | null;
  rerolled: number;
  helper: AnimalId | null;
  distantHelp: boolean;
  strBonus: number;
  icon: WeatherIcon | null;
  moved: number;
  moveBonus: number;
  noMove: boolean;
  acted: boolean;
};

export type StormAnimal = { die: number | null; rolls: number; stopped: boolean; stomp: number };

export type ScoreLine = { label: string; stars: number };
export type Result = { stars: number; tier: TierId; lines: ScoreLine[] };

export type Stats = {
  neighborHelp: number;
  needStars: number;
  needsDone: number;
  needsFailed: number;
  soaked: number;
  joint: number;
  unlocks: number;
  turns: number;
  idleTurns: number;
};

export type GameState = {
  v: 1;
  cfg: GameConfig;
  rng: [number, number, number, number];
  season: SeasonId;
  round: number;
  totalRound: number;
  roundsPerSeason: number;
  phase: "turn" | "storm" | "over";
  pending: Pending | null;
  weather: { id: string | null; icon: WeatherIcon; mods: WeatherMod[]; canceled: boolean };
  /** Kolik horních karet počasí je vidět předem (Hrom v dálce, Aplikace). */
  peek: number;
  weatherDecks: Record<SeasonId, string[]>;
  stations: Record<StationId, Bag>;
  strips: number[] | null;
  stripNext: number;
  stripMown: boolean[];
  depletion: Partial<Record<StationId, number>>;
  fertilized: StationId[];
  pollinators: number;
  bareMeadow: boolean;
  pantry: Bag;
  storage: Bag;
  target: Partial<Record<ItemId, number>>;
  animals: Partial<Record<AnimalId, AnimalState>>;
  seat: AnimalId[];
  order: AnimalId[];
  turnIdx: number;
  hat: AnimalId;
  turn: TurnState | null;
  gates: Record<GateId, { open: boolean; lock: boolean }>;
  branches: number[];
  wheelbarrow: { pos: number | null; carrier: AnimalId | null };
  geese: number | null;
  lucinka: number | null;
  needs: NeedSlot[];
  needDeck: string[];
  eventDeck: string[];
  eventDiscard: string[];
  reserve: string[];
  projects: ProjectSlot[];
  flags: {
    roman: boolean;
    discardNextEvent: boolean;
    scouted: boolean;
    droughtNow: boolean;
    droughtNext: boolean;
    frostCherries: boolean;
    dryAny: boolean;
    actedAt: StationId[];
    pogoSulk: boolean;
    pogoBoost: boolean;
    shorten: boolean;
    soakPending: boolean;
    noMoveRound: boolean;
  };
  storm: Partial<Record<AnimalId, StormAnimal>> | null;
  stats: Stats;
  seq: number;
  /** Krok přípravy kola, ke kterému se hra vrátí po rozhodnutí. */
  roundStep: number | null;
  result: Result | null;
};

export type Action =
  | { t: "roll" }
  | { t: "reroll"; die: number }
  | { t: "icon"; icon: WeatherIcon }
  | { t: "assign"; move: number }
  | { t: "move"; to: number; keep?: boolean }
  | { t: "help"; helper: AnimalId }
  | { t: "gather"; take: Bag; strip?: number }
  | { t: "craft"; recipe: RecipeId }
  | { t: "gatherCraft"; take: Bag; recipe: RecipeId; strip?: number }
  | { t: "work"; project: string }
  | { t: "rest" }
  | { t: "openGate"; gate: GateId }
  | { t: "scout" }
  | { t: "edge" }
  | { t: "care" }
  | { t: "clearBranch" }
  | { t: "skipAction" }
  | { t: "give"; from: AnimalId; to: AnimalId; item: ItemId; n: number }
  | { t: "giveHeart"; from: AnimalId; to: AnimalId }
  | { t: "deliver" }
  | { t: "store"; item: ItemId; n: number }
  | { t: "takeStore"; item: ItemId; n: number }
  | { t: "fulfill"; need: string }
  | { t: "contribute"; project: string; item: ItemId; n: number }
  | { t: "payReserve"; project: string; card: string }
  | { t: "unlock"; animal: AnimalId }
  | { t: "pickWheelbarrow" }
  | { t: "dropWheelbarrow" }
  | { t: "pickLucinka" }
  | { t: "fridge" }
  | { t: "hykani"; target: AnimalId }
  | { t: "grunt"; kind: "food" | "scratch" | "luck"; target?: AnimalId }
  | { t: "freeStep"; animal: AnimalId; to: number }
  | { t: "walk"; animal: AnimalId }
  | { t: "brigada"; animal: AnimalId; item: ItemId }
  | { t: "playReserve"; card: string }
  | { t: "fertilize"; station: StationId }
  | { t: "endTurn" }
  | { t: "choose"; i: number }
  | { t: "stormRoll"; animal: AnimalId }
  | { t: "stormMove"; animal: AnimalId; to: number }
  | { t: "stormMek" }
  | { t: "stormEnd" };

/** Sémantické události pro UI (animace, zvuk, historie). */
export type GameEvent =
  | { e: "round"; season: SeasonId; round: number }
  | { e: "season"; season: SeasonId }
  | { e: "weather"; card: string }
  | { e: "dice"; animal: AnimalId; dice: number[] }
  | { e: "moved"; animal: AnimalId; path: number[] }
  | { e: "gained"; animal: AnimalId | null; item: ItemId; n: number; from: StationId | "supply" | "storage" | number }
  | { e: "spent"; animal: AnimalId | null; item: ItemId; n: number; to: StationId | "supply" | "pantry" | "storage" | AnimalId }
  | { e: "crafted"; animal: AnimalId; product: ItemId; n: number }
  | { e: "delivered"; animal: AnimalId; items: Bag }
  | { e: "hearts"; animal: AnimalId; n: number }
  | { e: "joint"; a: AnimalId; b: AnimalId }
  | { e: "event"; card: string; actor: AnimalId }
  | { e: "need"; card: string; status: "new" | "done" | "failed" }
  | { e: "project"; card: string; status: "progress" | "done" }
  | { e: "soak"; animal: AnimalId; n: number }
  | { e: "storm"; status: "start" | "end" }
  | { e: "gate"; gate: GateId; open: boolean }
  | { e: "unlock"; animal: AnimalId }
  | { e: "info"; text: string }
  | { e: "over"; result: Result };
