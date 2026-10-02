/** Simulační hráč. Neslouží k tomu, aby hrál dobře jako člověk, ale aby
 *  hrál rozumně a stejně pokaždé — podle něj se ladí čísla v datech.
 *  Hladová politika: projde všechny kombinace (přiřazení kostek × cíl × akce),
 *  každou zahraje na kopii stavu a vezme tu s nejlepším ohodnocením. */

import { RECIPES, STATIONS } from "@data/board";
import { EVENT_BY_ID } from "@data/cards/events";
import { NEED_BY_ID } from "@data/cards/needs";
import { PROJECT_BY_ID } from "@data/cards/projects";
import { WEATHER_BY_ID } from "@data/cards/weather";
import { PANTRY_ORDER } from "@data/rules";
import type { AnimalId, ItemId, RecipeId, StationId } from "@data/types";
import { count, entries, total } from "./bag";
import { active, animal, apply, effectiveMove, orderOptions } from "./game";
import { freeCandidates, legalActions, mainCandidates, tryApply } from "./legal";
import { distance, reachable } from "./move";
import type { Action, GameState } from "./types";

export type BotOptions = { stormRolls: number };


/** Kam s čím: stanice, kde se surovina zpracuje. */
const USE_AT: Partial<Record<ItemId, StationId>> = { trava: "louka", bylinky: "zahradka", ovoce: "solar", hnuj: "kompost", vlna: "maringotka" };

const PRODUCT_IDS: ItemId[] = ["seno", "kompost", "susene", "krizaly", "pelisek"];

/** Mezní hodnota dalšího kusu výrobku podle toho, kolik ho ve spíži chybí. */
function marginal(s: GameState, p: ItemId, have: number) {
  const need = count(s.target, p);
  if (have < Math.ceil(need / 2)) return 14;
  if (have < need) return 12;
  return p === "seno" ? 2.5 : 1.2;
}

function pantryValue(s: GameState, bag: Partial<Record<ItemId, number>>) {
  let v = 0;
  for (const p of PANTRY_ORDER) {
    const need = count(s.target, p);
    const have = bag[p] ?? 0;
    for (let i = 0; i < Math.floor(have); i++) v += marginal(s, p, i);
    v += (have - Math.floor(have)) * marginal(s, p, Math.floor(have));
    if (have >= need) v += 6;
  }
  return v;
}

export function evaluate(s: GameState): number {
  if (s.phase === "over" && s.result) return s.result.stars * 100;
  const virtual: Partial<Record<ItemId, number>> = { ...s.pantry };
  let v = 0;
  const animals0 = Object.values(s.animals).filter(Boolean) as NonNullable<GameState["animals"][AnimalId]>[];
  for (const a of animals0) {
    for (const p of PRODUCT_IDS) {
      const n = count(a.cargo, p);
      if (!n) continue;
      virtual[p] = (virtual[p] ?? 0) + n * 0.8;
      v -= distance(s, a.id, a.pos, STATIONS.senik.space) * 0.3 * Math.min(n, 3);
    }
  }
  v += pantryValue(s, virtual);
  const have = (p: ItemId) => virtual[p] ?? 0;
  const short = (p: ItemId) => Math.max(0, count(s.target, p) - have(p));
  const projNeed = (k: ItemId) =>
    s.projects.filter((p) => !p.done).reduce((acc, p) => acc + Math.max(0, count(PROJECT_BY_ID[p.id].materials, k) - count(p.mat, k)), 0);
  const needNeed = (k: ItemId) =>
    s.needs.reduce((acc, n) => {
      const r = NEED_BY_ID[n.id].req;
      return acc + (r.k === "deliver" || r.k === "geese" ? count(r.items, k) : 0);
    }, 0);
  /** Poptávka týmu po surovině (v kusech) a cena jednoho užitečného kusu. */
  const senoDemand = short("seno") + short("pelisek") + projNeed("seno") + needNeed("seno");
  const demand: Partial<Record<ItemId, [number, number]>> = {
    trava: [2 * senoDemand + projNeed("trava") + needNeed("trava"), 4.2],
    vlna: [short("pelisek") + projNeed("vlna") + needNeed("vlna"), 5],
    bylinky: [2 * short("susene") + projNeed("bylinky") + needNeed("bylinky"), 4.2],
    ovoce: [2 * short("krizaly") + needNeed("ovoce"), 4.2],
    hnuj: [2 * (short("kompost") + projNeed("kompost")), 3.2],
    voda: [short("kompost") + projNeed("kompost") + needNeed("voda"), 2.2],
    prouti: [projNeed("prouti") + needNeed("prouti"), 2.5],
  };
  const team: Partial<Record<ItemId, number>> = {};
  for (const a of animals0) for (const [k, n] of entries(a.cargo)) if (!PRODUCT_IDS.includes(k)) team[k] = (team[k] ?? 0) + n;
  for (const [k, n] of Object.entries(team) as [ItemId, number][]) {
    const [d, w] = demand[k] ?? [0, 0.5];
    v += Math.min(n, d) * w + Math.max(0, n - d) * 0.25;
  }
  for (const a of animals0) {
    for (const [k, n] of entries(a.cargo)) {
      if (PRODUCT_IDS.includes(k)) continue;
      const at = USE_AT[k];
      if (at && (demand[k]?.[0] ?? 0) > 0) v -= distance(s, a.id, a.pos, STATIONS[at].space) * 0.22 * Math.min(n, 2);
    }
    if (count(a.cargo, "seno") && count(a.cargo, "vlna")) v += 3 - distance(s, a.id, a.pos, STATIONS.maringotka.space) * 0.4;
    v += a.hearts * 0.7 + (a.unlocked ? 3 : 0);
    if (a.lucinka) v += 4 - distance(s, a.id, a.pos, STATIONS.maringotka.space) * 0.3;
  }
  v += s.stats.needsDone * 7 - s.stats.needsFailed * 10 - s.stats.soaked * 3;
  const animals = Object.values(s.animals).filter(Boolean) as NonNullable<GameState["animals"][AnimalId]>[];
  for (const n of s.needs) {
    v -= 3 / Math.max(1, n.due);
    const req = NEED_BY_ID[n.id].req;
    const urgency = 1 + 1 / Math.max(1, n.due);
    if (req.k === "deliver" || req.k === "geese") {
      const space = req.k === "geese" ? s.geese : STATIONS[req.station].space;
      if (space === null) continue;
      let matched = 0;
      let nearest = Infinity;
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
      v += matched * 3 * urgency;
      if (matched && nearest < Infinity) v -= nearest * 0.45 * urgency;
    } else if (req.k === "escort") {
      const carrier = animals.find((a) => a.lucinka);
      const near = Math.min(...animals.map((a) => distance(s, a.id, a.pos, STATIONS.potok.space)));
      v -= (carrier ? distance(s, carrier.id, carrier.pos, STATIONS.maringotka.space) : near + 8) * 0.3 * urgency;
    } else if (req.k === "rest") {
      v -= Math.min(...animals.map((a) => distance(s, a.id, a.pos, STATIONS.maringotka.space))) * 0.3 * urgency;
    } else if (req.k === "care") {
      const ds = animals.map((a) => distance(s, a.id, a.pos, STATIONS.senik.space)).sort((x, y) => x - y);
      v -= (ds[0] + (ds[1] ?? 9)) * 0.2 * urgency;
    }
  }
  for (const p of s.projects) {
    const card = PROJECT_BY_ID[p.id];
    if (p.done) v += card.stars * 9;
    else {
      v += (p.work / card.work) * card.stars * 4 + total(p.mat) * 1.5;
      for (const [k, need] of entries(card.materials)) {
        const left = need - count(p.mat, k);
        if (left <= 0) continue;
        for (const a of animals) {
          const h = Math.min(left, count(a.cargo, k));
          if (h) v += h * 1.2 - distance(s, a.id, a.pos, STATIONS[card.station].space) * 0.12 * h;
        }
      }
    }
  }
  v += count(s.storage, "trava") * 0.5;
  return v;
}

/** Volné akce, které bot dělá vždy, když jdou (odevzdat, splnit, přispět). */
export function autoFree(s: GameState): GameState {
  for (let guard = 0; guard < 20; guard++) {
    if (s.pending || s.phase !== "turn" || !s.turn) return s;
    let progressed = false;
    for (const a of freeCandidates(s)) {
      if (a.t === "playReserve" || a.t === "walk" || a.t === "pickWheelbarrow") continue;
      if (a.t === "unlock" && animal(s, a.animal).hearts < 4 && a.animal !== "karel") continue;
      const r = tryApply(s, a);
      if (r) {
        s = r.state;
        progressed = true;
        break;
      }
    }
    if (!progressed) return s;
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
  if (hasSeno && count(a.cargo, "vlna") && missing("pelisek")) return "maringotka";
  if (hasSeno && missing("pelisek") && count(s.stations.maringotka, "vlna") && !missing("seno")) return "maringotka";
  if (PRODUCT_IDS.some((p) => count(a.cargo, p) > 0)) return "senik";
  const dry = (r: RecipeId) => RECIPES[r].weather.length === 0 || RECIPES[r].weather.includes(s.weather.icon);
  if (count(a.cargo, "trava") >= 2 && (missing("seno") || missing("pelisek"))) return "louka";
  if (count(a.cargo, "bylinky") >= 2 && missing("susene")) return "zahradka";
  if (count(a.cargo, "ovoce") >= 2 && missing("krizaly")) return "solar";
  if (count(a.cargo, "hnuj") >= 2 && missing("kompost")) return "kompost";
  if (count(a.cargo, "vlna") && missing("pelisek")) return count(a.cargo, "trava") >= 2 ? "louka" : "louka";
  /** Kolik hvězd přinese jeden další kus (řádek spíže: polovina = ★, celý = ★★). */
  const gain = (p: ItemId) => {
    const need = count(s.target, p);
    const have = count(s.pantry, p) + inCargo(s, p);
    if (have >= need) return 0.05;
    const half = Math.ceil(need / 2);
    return have < half ? 1 / (half - have) : 1 / (need - have);
  };
  const options: [StationId, number][] = [];
  const add = (st: StationId, w: number, item: ItemId, min = 1) => {
    if (count(s.stations[st], item) >= min) options.push([st, w]);
  };
  add("louka", Math.max(gain("seno"), gain("pelisek") * 0.6) * (dry("seno") ? 1.2 : 0.9), "trava", 2);
  add("maringotka", gain("pelisek"), "vlna");
  add("zahradka", gain("susene"), "bylinky", 2);
  for (const st of ["tresne", "sad", "svestky", "dilna"] as StationId[]) add(st, gain("krizaly") * 0.9, "ovoce", 2);
  add("senik", gain("kompost") * 0.8, "hnuj", 2);
  add("kompost", gain("kompost") * 0.8, "hnuj", 2);
  for (const p of s.projects) if (!p.done) options.push([PROJECT_BY_ID[p.id].station, 0.25]);
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

function goalPenalty(s: GameState, id: AnimalId, g: StationId | null) {
  if (!g || !s.animals[id]) return 0;
  const a = animal(s, id);
  return distance(s, id, a.pos, STATIONS[g].space) * 0.9;
}

type Plan = { actions: Action[]; value: number };

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
      const a = active(sa)!;
      for (const to of reachable(sa, a.id, effectiveMove(sa, a.id, sa.turn!.moveDie ?? 0)).keys()) {
        const r = tryApply(sa, { t: "move", to });
        if (!r) continue;
        actStage(r.state, [{ t: "assign", move: m }, { t: "move", to }]);
      }
    }
  } else if (t.stage === "move") {
    const a = active(s)!;
    for (const to of reachable(s, a.id, effectiveMove(s, a.id, t.moveDie ?? 0)).keys()) {
      const r = tryApply(s, { t: "move", to });
      if (!r) continue;
      actStage(r.state, [{ t: "move", to }]);
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
  for (let guard = 0; guard < 20; guard++) {
    if (s.pending || s.phase !== "turn" || !s.turn) break;
    let found: Action | null = null;
    for (const a of freeCandidates(s)) {
      if (a.t === "playReserve" || a.t === "walk" || a.t === "pickWheelbarrow") continue;
      if (a.t === "unlock" && animal(s, a.animal).hearts < 4 && a.animal !== "karel") continue;
      const r = tryApply(s, a);
      if (r) {
        s = r.state;
        found = a;
        break;
      }
    }
    if (!found) break;
    out.push(found);
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
