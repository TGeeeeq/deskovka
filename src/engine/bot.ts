/** Simulační hráč. Neslouží k tomu, aby hrál dobře jako člověk, ale aby
 *  hrál rozumně a stejně pokaždé — podle něj se ladí čísla v datech.
 *  Hladová politika: projde všechny kombinace (přiřazení kostek × cíl × akce),
 *  každou zahraje na kopii stavu a vezme tu s nejlepším ohodnocením.
 *  Dál než jeden tah „vidí" přes ohodnocení: všechno se počítá v hvězdách a věci
 *  na cestě (Seno pro Pelíšek, Ovoce pro Křížaly, Hnůj s Vodou pro Kompost) mají
 *  cenu výrobku zlevněnou o tahy, které ještě chybí — a nulovou, když to do zimy
 *  nestihne. */

import { RECIPES, STATION_IDS, STATIONS } from "@data/board";
import { EVENT_BY_ID } from "@data/cards/events";
import { NEED_BY_ID } from "@data/cards/needs";
import { PROJECT_BY_ID } from "@data/cards/projects";
import { WEATHER_BY_ID } from "@data/cards/weather";
import { PANTRY_ORDER, SEASONS } from "@data/rules";
import type { AnimalId, ItemId, RecipeId, StationId } from "@data/types";
import { count, entries, total } from "./bag";
import { active, animal, apply, effectiveMove, orderOptions, wishes } from "./game";
import { freeCandidates, legalActions, mainCandidates, tryApply } from "./legal";
import { distance, reachable } from "./move";
import type { Action, GameState } from "./types";

export type BotOptions = { stormRolls: number };

const PRODUCT_IDS: ItemId[] = ["seno", "kompost", "susene", "krizaly", "pelisek"];

/** Hodnota jedné hvězdy v ohodnocení. Všechno ostatní se počítá jako zlomek hvězdy,
 *  aby bot porovnával Seno, Pelíšek, Projekt i Potřebu ve stejné měně. */
const STAR = 40;
/** Diskont za jeden tah čekání (nejistota kostek, počasí a toho, co se mezitím stane). */
const GAMMA = 0.88;
/** Průměrný pohyb za tah (bot dává na pohyb spíš vyšší kostku). */
const STEP = 3.5;
/** Nejdelší pohyb za tah, se kterým bot počítá při „stihnu to ještě?". */
const STEP_MAX = 5;
/** Surovina je o akci dál od výrobku než hotový výrobek. */
const KAPPA = 0.85;

/** Kolik hvězd přinese (i+1)-tý kus výrobku v řádku spíže s cílem `need`
 *  (polovina řádku = ★, plný řádek = ★★; řádek s cílem 1 je plný jedním kusem). */
export function unitStars(need: number, i: number): number {
  if (need <= 0 || i >= need) return 0;
  if (need === 1) return 2;
  const half = Math.ceil(need / 2);
  return i < half ? 1 / half : 1 / (need - half);
}

function pantryValue(s: GameState, bag: Partial<Record<ItemId, number>>) {
  const flicek = !!s.animals.flicek;
  const unit = (p: ItemId, i: number) => unitStars(count(s.target, p), i) + (flicek && p === "pelisek" && i === 1 ? 1 : 0);
  let v = 0;
  for (const p of PANTRY_ORDER) {
    const have = bag[p] ?? 0;
    const whole = Math.floor(have);
    for (let i = 0; i < whole; i++) v += unit(p, i);
    v += (have - whole) * unit(p, whole);
  }
  return v * STAR;
}

/** Kolik kol ještě zbývá po tom právě běžícím (podle zbylých karet počasí). */
export function roundsAfter(s: GameState): number {
  const i = SEASONS.indexOf(s.season);
  return SEASONS.slice(i).reduce((acc, se) => acc + s.weatherDecks[se].length, 0);
}

/** Kolik tahů ještě zvíře odehraje (po právě probíhajícím tahu). */
export function turnsLeft(s: GameState, id: AnimalId): number {
  const idx = s.order.indexOf(id);
  const playedThisRound = s.phase !== "turn" || idx <= s.turnIdx;
  return roundsAfter(s) + (playedThisRound ? 0 : 1);
}

/** Pravděpodobnost, že věc dojde po trase přes `legs` stanice: γ^tahy, nebo 0,
 *  když to zvíře do konce hry nestihne. Mezikrok na stanici (zpracování) stojí
 *  aspoň jeden tah, i když na ní zvíře už stojí. */
function reach(s: GameState, id: AnimalId, from: number, legs: StationId[], left: number): number {
  let pos = from;
  let turns = 0;
  let minTurns = 0;
  legs.forEach((st, k) => {
    const d = distance(s, id, pos, STATIONS[st].space);
    const last = k === legs.length - 1;
    turns += last ? d / STEP : Math.max(1, d / STEP);
    minTurns += last ? Math.ceil(d / STEP_MAX) : Math.max(1, Math.ceil(d / STEP_MAX));
    pos = STATIONS[st].space;
  });
  if (minTurns > left) return 0;
  return Math.pow(GAMMA, turns);
}

/** Šance, že sušení vyjde (bot nevidí do balíčku počasí, jen na aktuální kartu). */
function dryChance(s: GameState, r: RecipeId): number {
  if (RECIPES[r].weather.length === 0) return 1;
  if (r === "krizaly" && s.projects.some((p) => p.id === "solar" && p.done)) return 1;
  return s.season === "podzim" ? 0.65 : 0.8;
}

type Animal = NonNullable<GameState["animals"][AnimalId]>;

/** Virtuální spíž: co už je ve spíži + kolik výrobků „je na cestě" v nákladech,
 *  zlevněné o vzdálenost a o to, kolik kroků řetězu ještě chybí. Tím bot vidí
 *  i řetězy přes víc tahů (Seno → Maringotka → Pelíšek → Seník, Ovoce → Solár → Křížaly). */
function virtualPantry(s: GameState, animals: Animal[]): Partial<Record<ItemId, number>> {
  const virtual: Partial<Record<ItemId, number>> = { ...s.pantry };
  const addV = (p: ItemId, n: number) => (virtual[p] = (virtual[p] ?? 0) + n);
  const left: Partial<Record<AnimalId, number>> = {};
  for (const a of animals) left[a.id] = turnsLeft(s, a.id);
  for (const a of animals) {
    const l = left[a.id]!;
    for (const p of ["kompost", "susene", "krizaly", "pelisek"] as ItemId[]) {
      const n = count(a.cargo, p);
      if (n) addV(p, n * reach(s, a.id, a.pos, ["senik"], l));
    }
  }
  /** Seno: buď rovnou do spíže, nebo přes Maringotku na Pelíšek (je-li tam Vlna). */
  const pelTarget = count(s.target, "pelisek");
  const vlna = count(s.stations.maringotka, "vlna") + animals.reduce((acc, a) => acc + count(a.cargo, "vlna"), 0);
  let pelSlots = Math.min(vlna, Math.max(0, pelTarget - (virtual.pelisek ?? 0)));
  const units: { senoF: number; pelF: number }[] = [];
  for (const a of animals) {
    const n = count(a.cargo, "seno");
    if (!n) continue;
    const l = left[a.id]!;
    const senoF = reach(s, a.id, a.pos, ["senik"], l);
    const pelF = KAPPA * reach(s, a.id, a.pos, ["maringotka", "senik"], l);
    for (let k = 0; k < n; k++) units.push({ senoF, pelF });
  }
  units.sort((x, y) => y.pelF - x.pelF);
  const unitVal = (p: ItemId) => unitStars(count(s.target, p), Math.floor(virtual[p] ?? 0)) + (s.animals.flicek && p === "pelisek" && Math.floor(virtual[p] ?? 0) === 1 ? 1 : 0);
  for (const u of units) {
    if (pelSlots >= 1 && u.pelF * unitVal("pelisek") > u.senoF * unitVal("seno")) {
      addV("pelisek", u.pelF);
      pelSlots -= 1;
    } else addV("seno", u.senoF);
  }
  /** Suroviny: recept je ze 2 kusů. Celý pár = výrobek (zlevněný o cestu, o krok
   *  zpracování a o počasí), lichý kus jen malý příslib. */
  for (const a of animals) {
    const l = left[a.id]!;
    const raw = (item: ItemId, product: ItemId, station: StationId, r: RecipeId) => {
      const n = count(a.cargo, item);
      if (!n) return;
      const units = Math.floor(n / 2) + (n % 2) * 0.3;
      addV(product, units * KAPPA * dryChance(s, r) * reach(s, a.id, a.pos, [station, "senik"], l));
    };
    raw("trava", "seno", "louka", "seno");
    raw("bylinky", "susene", "zahradka", "susene");
    raw("ovoce", "krizaly", "solar", "krizaly");
  }
  /** Kompost: 2 Hnůj + 1 Voda (za deště bez Vody). Bez Vody je Hnůj jen příslib. */
  let hnuj = count(s.stations.kompost, "hnuj");
  let voda = s.weather.icon === "dest" ? 1 : 0.3;
  let f = 0;
  for (const a of animals) {
    const h = count(a.cargo, "hnuj");
    const w = count(a.cargo, "voda");
    if (!h && !w) continue;
    hnuj += h;
    voda += w;
    f = Math.max(f, reach(s, a.id, a.pos, ["kompost", "senik"], left[a.id]!));
  }
  if (f > 0) {
    const full = Math.min(hnuj / 2, voda);
    const partial = Math.max(0, hnuj / 2 - full) * 0.05 + Math.max(0, Math.min(voda, 3) - full) * 0.15;
    addV("kompost", (full + partial) * KAPPA * f);
  }
  return virtual;
}

export function evaluate(s: GameState): number {
  if (s.phase === "over" && s.result) return s.result.stars * STAR;
  const animals = Object.values(s.animals).filter(Boolean) as Animal[];
  const rLeft = roundsAfter(s);
  let v = pantryValue(s, virtualPantry(s, animals));
  const projNeed = (k: ItemId) =>
    s.projects.filter((p) => !p.done).reduce((acc, p) => acc + Math.max(0, count(PROJECT_BY_ID[p.id].materials, k) - count(p.mat, k)), 0);
  /** Surovina na Projekt má cenu; jinak jen malou (možná se hodí na Potřebu). */
  for (const a of animals) {
    for (const [k, n] of entries(a.cargo)) {
      if (PRODUCT_IDS.includes(k)) continue;
      v += n * (projNeed(k) > 0 ? 1 : 0.15);
    }
  }
  /** Srdíčka: každých 5 v týmu = ★ (nejvýš ★★), k tomu jsou palivem na přehazování a odemčení. */
  const team = animals.reduce((acc, a) => acc + a.hearts, 0);
  v += Math.min(team, 10) * (STAR / 5) * 0.8 + team * 0.6;
  for (const a of animals) {
    v += a.unlocked ? 4 : 0;
    if (a.lucinka) v += 4 - distance(s, a.id, a.pos, STATIONS.maringotka.space) * 0.3;
  }
  /** Přání zvířat (★ na konci hry). */
  const w = wishes(s);
  if (s.animals.avala && w.avala) v += STAR * 0.9;
  if (s.animals.yakul && w.yakul) v += STAR * 0.6;
  for (const a of animals) {
    if (turnsLeft(s, a.id) > 0) continue;
    if (a.id === "pogo" && w.pogo) v += STAR;
    if (a.id === "kveta" && w.kveta) v += STAR;
    if (a.id === "karel" && w.karel) v += STAR;
  }
  /** Potřeby: každé 2 splněné ★, každé 2 propadlé −★; hvězdné Potřeby ★ navíc. */
  v += s.stats.needsDone * STAR * 0.5 - s.stats.needsFailed * STAR * 0.5 + s.stats.needStars * STAR - s.stats.soaked * 4;
  for (const n of s.needs) {
    const card = NEED_BY_ID[n.id];
    const req = card.req;
    /** Otevřená Potřeba je zatím „propadlá" (−½★); splnění dá +½★, ★ navíc u hvězdných
     *  a zruší ten odečet. Rozpracovanost (nesu, co chce) se počítá nejvýš za 80 % toho. */
    const stake = STAR * (1 + (card.rewards.some((r) => r.k === "star") ? 1 : 0));
    const urgency = 1 + 1 / Math.max(1, n.due);
    v -= STAR * 0.5;
    if (req.k === "deliver" || req.k === "geese") {
      const space = req.k === "geese" ? s.geese : STATIONS[req.station].space;
      if (space === null) continue;
      let matched = 0;
      let nearest = Infinity;
      const want = total(req.items);
      for (const [k, need] of entries(req.items)) {
        let held = 0;
        for (const a of animals) {
          const h = count(a.cargo, k);
          if (h > 0) {
            held += h;
            nearest = Math.min(nearest, distance(s, a.id, a.pos, space));
          }
        }
        matched += Math.min(need, held);
      }
      if (!matched) continue;
      const turns = nearest / STEP;
      const feasible = Math.ceil(nearest / STEP_MAX) <= Math.max(1, n.due);
      v += feasible ? stake * 0.8 * (matched / want) * Math.pow(GAMMA, turns) : 0;
    } else if (req.k === "escort") {
      const carrier = animals.find((a) => a.lucinka);
      const near = Math.min(...animals.map((a) => distance(s, a.id, a.pos, STATIONS.potok.space)));
      v -= (carrier ? distance(s, carrier.id, carrier.pos, STATIONS.maringotka.space) : near + 8) * 0.5 * urgency;
    } else if (req.k === "rest") {
      v -= Math.min(...animals.map((a) => distance(s, a.id, a.pos, STATIONS.maringotka.space))) * 0.5 * urgency;
    } else if (req.k === "care") {
      const ds = animals.map((a) => distance(s, a.id, a.pos, STATIONS.senik.space)).sort((x, y) => x - y);
      v -= (ds[0] + (ds[1] ?? 9)) * 0.35 * urgency;
    }
  }
  /** Projekty: hotový = jeho hvězdy; rozpracovaný se cení míň, a čím blíž konci hry, tím míň. */
  const late = rLeft >= 3 ? 1 : rLeft === 2 ? 0.8 : rLeft === 1 ? 0.5 : 0.2;
  for (const p of s.projects) {
    const card = PROJECT_BY_ID[p.id];
    const worth = card.stars * STAR;
    if (p.done) {
      v += worth;
      continue;
    }
    const matTotal = Math.max(1, total(card.materials));
    const perMat = (worth * 0.3) / matTotal;
    v += late * (worth * 0.45 * Math.min(1, p.work / card.work) + perMat * total(p.mat));
    for (const [k, need] of entries(card.materials)) {
      const missing = need - count(p.mat, k);
      if (missing <= 0) continue;
      for (const a of animals) {
        const h = Math.min(missing, count(a.cargo, k));
        if (h) v += late * h * perMat * KAPPA * reach(s, a.id, a.pos, [card.station], turnsLeft(s, a.id));
      }
    }
  }
  v += count(s.storage, "trava") * 0.5;
  return v;
}

/** Karlovo přání „Rozdal všechno": když už Karel nebude hrát, rozdá srdíčka
 *  zvířatům v dosahu daru (srdíčka týmu se tím neztratí). */
function karelGift(s: GameState): Action | null {
  const k = s.animals.karel;
  if (!k || !k.hearts || turnsLeft(s, "karel") > 0) return null;
  const act = active(s)!;
  const takers = act.id === "karel" ? (Object.values(s.animals).filter((o) => o && o.id !== "karel") as Animal[]) : [act];
  for (const o of takers.filter((o) => o.hearts < 6).sort((x, y) => x.hearts - y.hearts)) {
    const a: Action = { t: "giveHeart", from: "karel", to: o.id };
    if (tryApply(s, a)) return a;
  }
  return null;
}

/** Další volná akce, kterou bot udělá (odevzdat, splnit, přispět, odemknout…). */
function nextFree(s: GameState): { action: Action; state: GameState } | null {
  if (s.pending || s.phase !== "turn" || !s.turn) return null;
  const gift = karelGift(s);
  if (gift) return { action: gift, state: apply(s, gift).state };
  let base: number | null = null;
  for (const a of freeCandidates(s)) {
    if (a.t === "playReserve" || a.t === "walk" || a.t === "pickWheelbarrow") continue;
    if (a.t === "unlock" && animal(s, a.animal).hearts < 4 && a.animal !== "karel") continue;
    const r = tryApply(s, a);
    if (!r) continue;
    /** Výrobek na Projekt jen tehdy, když tam má větší cenu než ve spíži. */
    if (a.t === "contribute" && PRODUCT_IDS.includes(a.item)) {
      base ??= evaluate(s);
      if (evaluate(r.state) <= base) continue;
    }
    return { action: a, state: r.state };
  }
  return null;
}

/** Volné akce, které bot dělá vždy, když jdou a dávají smysl. */
export function autoFree(s: GameState): GameState {
  for (let guard = 0; guard < 30; guard++) {
    const n = nextFree(s);
    if (!n) return s;
    s = n.state;
  }
  return s;
}

function weatherScore(id: string, season: string) {
  const c = WEATHER_BY_ID[id];
  let v = c.harsh ? -5 : 0;
  if (c.icon === "slunce") v += season === "leto" ? 4 : 2;
  return v;
}

export function choosePending(s: GameState): number {
  const p = s.pending!;
  switch (p.k) {
    case "pogoSwap":
      return weatherScore(p.cards[1], s.season) > weatherScore(p.cards[0], s.season) ? 1 : 0;
    case "avalaPeek": {
      const bad = p.cards.findIndex((c) => c === "E17" || c === "E4");
      return bad >= 0 ? bad + 1 : 0;
    }
    case "yakulCancel":
      return 1;
    case "kvetaPremove": {
      let best = 0;
      let bestV = -Infinity;
      p.options.forEach((_, i) => {
        const r = tryApply(s, { t: "choose", i });
        if (r && evaluate(r.state) > bestV) {
          bestV = evaluate(r.state);
          best = i;
        }
      });
      return best;
    }
    case "eventKeep":
      return EVENT_BY_ID[p.card].id === "E11" ? 1 : 0;
    case "discardEvent":
      return p.card === "E17" || p.card === "E4" ? 1 : 0;
    case "project": {
      let best = 0;
      let bestV = -Infinity;
      p.options.forEach((id, i) => {
        const slot = s.projects.find((x) => x.id === id)!;
        const v = slot.work / PROJECT_BY_ID[id].work + PROJECT_BY_ID[id].stars / 10;
        if (v > bestV) {
          bestV = v;
          best = i;
        }
      });
      return best;
    }
    case "orderWeather": {
      const perms = orderOptions(p.cards);
      let best = 0;
      let bestV = -Infinity;
      perms.forEach((perm, i) => {
        const v = perm.reduce((acc, id, k) => acc + weatherScore(id, s.season) * (3 - k), 0);
        if (v > bestV) {
          bestV = v;
          best = i;
        }
      });
      return best;
    }
  }
}

function resolveAllPending(s: GameState): GameState {
  for (let g = 0; g < 10 && s.pending; g++) s = apply(s, { t: "choose", i: choosePending(s) }).state;
  return s;
}

/** Bouřka: kdo nese seno, běží na Seník; Yakul zůstane u ostatních. */
function playStorm(s: GameState, opts: BotOptions): GameState {
  const ids = Object.keys(s.storm ?? {}) as AnimalId[];
  for (let round = 0; round < opts.stormRolls; round++) {
    for (const id of ids) {
      const m = s.storm?.[id];
      if (!m || m.stopped) continue;
      const r = tryApply(s, { t: "stormRoll", animal: id });
      if (!r) continue;
      s = r.state;
      const die = s.storm?.[id]?.die;
      if (!die) continue;
      const a = animal(s, id);
      const carrying = count(a.cargo, "seno") + count(a.cargo, "pelisek") + count(a.cargo, "kompost") + count(a.cargo, "susene") + count(a.cargo, "krizaly");
      let best = a.pos;
      let bestD = Infinity;
      for (const to of reachable(s, id, die).keys()) {
        const d = carrying ? distance(s, id, to, STATIONS.senik.space) : distance(s, id, to, a.pos);
        if (d < bestD) {
          bestD = d;
          best = to;
        }
      }
      s = apply(s, { t: "stormMove", animal: id, to: best }).state;
    }
  }
  return apply(s, { t: "stormEnd" }).state;
}


const inCargo = (s: GameState, p: ItemId) => (Object.values(s.animals) as { cargo: Partial<Record<ItemId, number>> }[]).reduce((acc, a) => acc + (a ? count(a.cargo, p) : 0), 0);

/** Kam má zvíře jít dál — jednoduchý „úmysl", aby bot dotahoval řetězy
 *  surovina → zpracování → Seník přes víc tahů. */
export function goalStation(s: GameState, id: AnimalId): StationId | null {
  const a = animal(s, id);
  const missing = (p: ItemId) => Math.max(0, count(s.target, p) - count(s.pantry, p));
  if (a.lucinka) return "maringotka";
  for (const n of s.needs) {
    const req = NEED_BY_ID[n.id].req;
    if (req.k === "deliver" && !req.together && entries(req.items).every(([k, v]) => count(a.cargo, k) >= v)) return req.station;
  }
  const hasSeno = count(a.cargo, "seno");
  const vlnaThere = count(s.stations.maringotka, "vlna") + count(a.cargo, "vlna");
  const pelNeed = count(s.target, "pelisek") - count(s.pantry, "pelisek") - inCargo(s, "pelisek");
  if (hasSeno && pelNeed > 0 && vlnaThere > 0 && reach(s, id, a.pos, ["maringotka", "senik"], turnsLeft(s, id) + 1) > 0) return "maringotka";
  if (PRODUCT_IDS.some((p) => count(a.cargo, p) > 0)) return "senik";
  const dry = (r: RecipeId) => RECIPES[r].weather.length === 0 || RECIPES[r].weather.includes(s.weather.icon);
  if (count(a.cargo, "trava") >= 2 && (missing("seno") || missing("pelisek"))) return "louka";
  if (count(a.cargo, "bylinky") >= 2 && missing("susene")) return "zahradka";
  if (count(a.cargo, "ovoce") >= 2 && missing("krizaly")) return "solar";
  if (count(a.cargo, "hnuj") >= 2 && missing("kompost")) return count(a.cargo, "voda") || inCargo(s, "voda") || s.weather.icon === "dest" ? "kompost" : "potok";
  /** Kolik hvězd přinese jeden další kus (stejná měna jako ohodnocení). */
  const gain = (p: ItemId) => {
    const have = count(s.pantry, p) + inCargo(s, p);
    return Math.max(0.05, unitStars(count(s.target, p), have));
  };
  const options: [StationId, number][] = [];
  const add = (st: StationId, w: number, item: ItemId, min = 1) => {
    if (count(s.stations[st], item) >= min) options.push([st, w]);
  };
  add("louka", Math.max(gain("seno"), vlnaThere ? gain("pelisek") * 0.7 : 0) * (dry("seno") ? 1.2 : 0.9), "trava", 2);
  add("zahradka", gain("susene"), "bylinky", 2);
  for (const st of ["tresne", "sad", "svestky", "dilna"] as StationId[]) add(st, gain("krizaly") * 0.9, "ovoce", 2);
  add("senik", gain("kompost") * 0.8, "hnuj", 2);
  add("kompost", gain("kompost") * 0.8, "hnuj", 2);
  for (const p of s.projects) if (!p.done) options.push([PROJECT_BY_ID[p.id].station, 0.25]);
  const hnujReady = count(s.stations.kompost, "hnuj") + inCargo(s, "hnuj") >= 2;
  if (missing("kompost") && hnujReady && !inCargo(s, "voda") && s.weather.icon !== "dest") add("potok", gain("kompost") * 0.6, "voda");
  options.push(...needSources(s, id));
  const crowd = (st: StationId) =>
    (Object.values(s.animals) as (typeof a | undefined)[]).filter((o) => o && o.id !== id && distance(s, o.id, o.pos, STATIONS[st].space) <= 2).length;
  if (!options.length) return null;
  let best: StationId | null = null;
  let bestV = -Infinity;
  for (const [st, w] of options) {
    if (w <= 0) continue;
    const v = w * 8 - distance(s, id, a.pos, STATIONS[st].space) * 0.5 - crowd(st) * 1.5;
    if (v > bestV) {
      bestV = v;
      best = st;
    }
  }
  return best;
}

/** Potřeby: kam dojít pro to, co soused chce (a co nikdo z týmu nenese),
 *  když se to stihne do konce lhůty. Váha 1 = asi hvězda (splněná místo propadlé). */
function needSources(s: GameState, id: AnimalId): [StationId, number][] {
  const a = animal(s, id);
  const out: [StationId, number][] = [];
  const turns = (d: number) => Math.ceil(d / STEP_MAX);
  for (const n of s.needs) {
    const card = NEED_BY_ID[n.id];
    const req = card.req;
    const w = 1 + (card.rewards.some((r) => r.k === "star") ? 1 : 0);
    if (req.k === "escort") {
      if (!Object.values(s.animals).some((o) => o?.lucinka) && s.lucinka !== null && turns(distance(s, id, a.pos, s.lucinka)) + turns(distance(s, id, s.lucinka, STATIONS.maringotka.space)) <= n.due)
        out.push(["potok", w]);
      continue;
    }
    if (req.k === "rest") {
      if (turns(distance(s, id, a.pos, STATIONS.maringotka.space)) <= n.due) out.push(["maringotka", w * 0.8]);
      continue;
    }
    if (req.k !== "deliver" && req.k !== "geese") continue;
    if (req.k === "deliver" && req.together) continue;
    const target = req.k === "geese" ? s.geese : STATIONS[req.station].space;
    if (target === null) continue;
    for (const [k, need] of entries(req.items)) {
      if (inCargo(s, k) >= need) continue;
      for (const st of STATION_IDS) {
        if (!(STATIONS[st].gather as ItemId[]).includes(k)) continue;
        if (count(s.stations[st], k) < 1) continue;
        const t = turns(distance(s, id, a.pos, STATIONS[st].space)) + turns(distance(s, id, STATIONS[st].space, target));
        if (t <= n.due) out.push([st, w]);
      }
    }
  }
  return out;
}

function goalPenalty(s: GameState, id: AnimalId, g: StationId | null) {
  if (!g || !s.animals[id]) return 0;
  const a = animal(s, id);
  return distance(s, id, a.pos, STATIONS[g].space) * 0.9;
}

type Plan = { actions: Action[]; value: number };

/** Kam se dá dojít. Vede-li cesta přes Seník a zvíře nese výrobky, zkusí i variantu
 *  „nechám si je" (Seno pro Pelíšek se cestou nesmí odevzdat). */
function moveOptions(s: GameState): Action[] {
  const a = active(s)!;
  const carries = PRODUCT_IDS.some((p) => count(a.cargo, p) > 0);
  const out: Action[] = [];
  for (const [to, route] of reachable(s, a.id, effectiveMove(s, a.id, s.turn!.moveDie ?? 0))) {
    out.push({ t: "move", to });
    if (carries && route.path.slice(1, -1).includes(STATIONS.senik.space)) out.push({ t: "move", to, keep: true });
  }
  return out;
}

/** Projde celý zbytek tahu a vrátí nejlepší posloupnost. */
export function planTurn(s: GameState): Plan {
  const t = s.turn!;
  const goal = goalStation(s, t.animal);
  let best: Plan = { actions: [{ t: "endTurn" }], value: -Infinity };
  const consider = (state: GameState, actions: Action[]) => {
    const after = autoFree(resolveAllPending(state));
    const v = evaluate(after) - goalPenalty(after, t.animal, goal);
    if (v > best.value) best = { actions, value: v };
  };
  const actStage = (state: GameState, prefix: Action[]) => {
    const st0 = autoFree(resolveAllPending(state));
    const helpers: (Action | null)[] = [null, ...legalActions(st0).filter((x) => x.t === "help")];
    for (const h of helpers) {
      const sh = h ? tryApply(st0, h)?.state : st0;
      if (!sh) continue;
      for (const a of mainCandidates(sh)) {
        const r = tryApply(sh, a);
        if (!r) continue;
        consider(r.state, [...prefix, ...(h ? [h] : []), a]);
      }
    }
  };
  if (t.stage === "assign") {
    for (const m of [0, 1]) {
      const sa = apply(s, { t: "assign", move: m }).state;
      for (const mv of moveOptions(sa)) {
        const r = tryApply(sa, mv);
        if (!r) continue;
        actStage(r.state, [{ t: "assign", move: m }, mv]);
      }
    }
  } else if (t.stage === "move") {
    for (const mv of moveOptions(s)) {
      const r = tryApply(s, mv);
      if (!r) continue;
      actStage(r.state, [mv]);
    }
  } else if (t.stage === "act") actStage(s, []);
  return best;
}

/** Odehraje jedno rozhodnutí. Vrací nový stav. */
export function botStep(s: GameState, opts: BotOptions = { stormRolls: 3 }): GameState {
  if (s.pending) return apply(s, { t: "choose", i: choosePending(s) }).state;
  if (s.phase === "storm") return playStorm(s, opts);
  const t = s.turn;
  if (!t) return s;
  if (t.stage === "roll") return apply(s, { t: "roll" }).state;
  if (t.stage === "assign" && !t.noMove) {
    const a = active(s)!;
    const plan = planTurn(s);
    const canReroll = a.rerollFree || a.hearts >= 2;
    if (canReroll && t.rerolled === 0 && Math.max(...t.dice) <= 2) {
      const i = t.dice[0] <= t.dice[1] ? 0 : 1;
      const r = tryApply(s, { t: "reroll", die: i });
      if (r) return r.state;
    }
    return runPlan(s, plan.actions);
  }
  if (t.stage === "act") {
    const plan = planTurn(s);
    return runPlan(s, plan.actions);
  }
  return apply(autoFree(s), { t: "endTurn" }).state;
}

function runPlan(s: GameState, actions: Action[]): GameState {
  for (const a of actions) {
    s = resolveAllPending(s);
    if (s.phase !== "turn" || !s.turn) return s;
    if (a.t === "move" && s.turn.stage !== "move") continue;
    const r = tryApply(s, a);
    if (!r) break;
    s = r.state;
  }
  s = autoFree(resolveAllPending(s));
  if (s.turn && s.phase === "turn" && !s.pending) s = apply(s, { t: "endTurn" }).state;
  return s;
}

export function playOut(s: GameState, opts?: BotOptions, maxSteps = 4000): GameState {
  for (let i = 0; i < maxSteps && s.phase !== "over"; i++) s = botStep(s, opts);
  return s;
}

export const needName = (id: string) => NEED_BY_ID[id].name;
export const stationName = (id: StationId) => STATIONS[id].short;

/** Volné akce, které by bot teď udělal (bez provedení). */
export function autoFreeActions(s: GameState): Action[] {
  const out: Action[] = [];
  for (let guard = 0; guard < 30; guard++) {
    const n = nextFree(s);
    if (!n) break;
    out.push(n.action);
    s = n.state;
  }
  return out;
}

/** Další akce bota pro animované UI: vrací jednu akci (nebo null). */
export function botNextAction(s: GameState, opts: BotOptions = { stormRolls: 3 }): Action | null {
  if (s.phase === "over") return null;
  if (s.pending) return { t: "choose", i: choosePending(s) };
  if (s.phase === "storm") {
    const ids = Object.keys(s.storm ?? {}) as AnimalId[];
    for (const id of ids) {
      const m = s.storm?.[id];
      if (!m || m.stopped) continue;
      if (m.die !== null) {
        const a = animal(s, id);
        const carrying = PRODUCT_IDS.some((p) => count(a.cargo, p) > 0);
        let best = a.pos;
        let bestD = Infinity;
        for (const to of reachable(s, id, m.die).keys()) {
          const d = carrying ? distance(s, id, to, STATIONS.senik.space) : distance(s, id, to, a.pos);
          if (d < bestD) {
            bestD = d;
            best = to;
          }
        }
        return { t: "stormMove", animal: id, to: best };
      }
      if (m.rolls < opts.stormRolls) return { t: "stormRoll", animal: id };
    }
    return { t: "stormEnd" };
  }
  const t = s.turn;
  if (!t) return null;
  if (t.stage === "roll") return { t: "roll" };
  const free = autoFreeActions(s);
  if (free.length && t.stage !== "assign") return free[0];
  if (t.stage === "assign" || t.stage === "act") {
    const a = active(s)!;
    if (t.stage === "assign" && (a.rerollFree || a.hearts >= 2) && t.rerolled === 0 && Math.max(...t.dice) <= 2) return { t: "reroll", die: t.dice[0] <= t.dice[1] ? 0 : 1 };
    const plan = planTurn(s);
    for (const act of plan.actions) {
      if (tryApply(s, act)) return act;
    }
    return t.stage === "act" ? { t: "skipAction" } : { t: "assign", move: 0 };
  }
  if (t.stage === "move") {
    const plan = planTurn(s);
    for (const act of plan.actions) if (tryApply(s, act)) return act;
    return { t: "move", to: animal(s, t.animal).pos };
  }
  return { t: "endTurn" };
}
