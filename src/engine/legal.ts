import { ANIMAL_DEFS } from "@data/animals";
import { RECIPES, SHORTCUTS, STATIONS, stationAt } from "@data/board";
import { NEED_BY_ID } from "@data/cards/needs";
import { PROJECT_BY_ID } from "@data/cards/projects";
import type { AnimalId, Bag, GateId, ItemId, RecipeId } from "@data/types";
import { count, entries } from "./bag";
import { RuleError, active, animal, apply, effectiveMove, gatherLimit, helperOptions, orderOptions, room, strength } from "./game";
import { reachable } from "./move";
import type { Action, GameState } from "./types";

export function tryApply(s: GameState, a: Action) {
  try {
    return apply(s, a);
  } catch (e) {
    if (e instanceof RuleError) return null;
    throw e;
  }
}

export const isLegal = (s: GameState, a: Action) => tryApply(s, a) !== null;

export function pendingOptions(s: GameState): number {
  const p = s.pending;
  if (!p) return 0;
  switch (p.k) {
    case "pogoSwap":
    case "yakulCancel":
    case "eventKeep":
    case "discardEvent":
      return 2;
    case "avalaPeek":
      return 3;
    case "kvetaPremove":
      return p.options.length;
    case "project":
      return p.options.length;
    case "orderWeather":
      return orderOptions(p.cards).length;
  }
}

/** Všechna rozdělení `n` kusů mezi dané suroviny (nejvýš `limit` celkem). */
function bags(items: ItemId[], limit: number, avail: (i: ItemId) => number): Bag[] {
  const out: Bag[] = [];
  const rec = (i: number, left: number, cur: Bag) => {
    if (i === items.length) {
      if (Object.keys(cur).length) out.push({ ...cur });
      return;
    }
    const max = Math.min(left, avail(items[i]));
    for (let k = 0; k <= max; k++) {
      const next = { ...cur };
      if (k) next[items[i]] = k;
      rec(i + 1, left - k, next);
    }
  };
  rec(0, limit, {});
  return out;
}

/** Kandidáti hlavní akce (před ověřením). */
export function mainCandidates(s: GameState): Action[] {
  const a = active(s);
  if (!a || !s.turn) return [];
  const out: Action[] = [];
  const st = stationAt(a.pos);
  const limit = Math.min(gatherLimit(s), room(s, a));
  if (st) {
    const def = STATIONS[st];
    const avail = (i: ItemId) => (st === "solar" && i === "voda" ? 9 : count(s.stations[st], i));
    const strips = st === "louka" && s.strips ? [0, 1, 2] : [undefined];
    for (const strip of strips) {
      for (const take of bags(def.gather, limit, strip === undefined ? avail : () => s.strips![strip])) out.push({ t: "gather", take, strip });
      for (const r of Object.keys(RECIPES) as RecipeId[]) {
        const sc = strength(s, "craft");
        if (sc >= 2 && def.recipes.includes(r)) for (const take of bags(def.gather, Math.min(sc - 1, room(s, a)), avail)) out.push({ t: "gatherCraft", take, recipe: r, strip });
      }
    }
    for (const r of Object.keys(RECIPES) as RecipeId[]) out.push({ t: "craft", recipe: r });
    for (const p of s.projects) if (!p.done && PROJECT_BY_ID[p.id].station === st) out.push({ t: "work", project: p.id });
    out.push({ t: "rest" }, { t: "scout" }, { t: "care" });
  } else out.push({ t: "edge" });
  for (const sc of SHORTCUTS) if (sc.gate && (sc.a === a.pos || sc.b === a.pos) && !s.gates[sc.id as GateId].open) out.push({ t: "openGate", gate: sc.id as GateId });
  if (s.branches.includes(a.pos)) out.push({ t: "clearBranch" });
  out.push({ t: "skipAction" });
  return out;
}

/** Volné akce, které má smysl nabízet (bez darů — ty řeší UI zvlášť). */
export function freeCandidates(s: GameState): Action[] {
  const a = active(s);
  if (!a || !s.turn) return [];
  const out: Action[] = [];
  const st = stationAt(a.pos);
  if (st === "senik") out.push({ t: "deliver" });
  for (const n of s.needs) out.push({ t: "fulfill", need: n.id });
  for (const p of s.projects) {
    if (p.done || STATIONS[PROJECT_BY_ID[p.id].station].space !== a.pos) continue;
    for (const [k, v] of entries(PROJECT_BY_ID[p.id].materials)) {
      const need = v - count(p.mat, k);
      const have = count(a.cargo, k);
      if (need > 0 && have > 0) out.push({ t: "contribute", project: p.id, item: k, n: Math.min(need, have) });
    }
    if (PROJECT_BY_ID[p.id].altCost && !p.altPaid) {
      if (count(a.cargo, "krizaly")) out.push({ t: "contribute", project: p.id, item: "krizaly", n: 1 });
      for (const card of s.reserve) out.push({ t: "payReserve", project: p.id, card });
    }
  }
  for (const id of Object.keys(s.animals) as AnimalId[]) {
    const m = animal(s, id);
    if (!m.unlocked && m.hearts >= 3) out.push({ t: "unlock", animal: id });
    if (m.walk) out.push({ t: "walk", animal: id });
    if (m.brigada && stationAt(m.pos)) for (const i of STATIONS[stationAt(m.pos)!].gather) out.push({ t: "brigada", animal: id, item: i });
  }
  out.push({ t: "pickWheelbarrow" }, { t: "pickLucinka" }, { t: "fridge" });
  for (const card of s.reserve) out.push({ t: "playReserve", card });
  return out;
}

export function legalActions(s: GameState): Action[] {
  if (s.phase === "over") return [];
  if (s.pending) return Array.from({ length: pendingOptions(s) }, (_, i) => ({ t: "choose", i }) as Action);
  if (s.phase === "storm") {
    const out: Action[] = [{ t: "stormEnd" }];
    for (const [id, m] of Object.entries(s.storm ?? {}) as [AnimalId, NonNullable<GameState["storm"]>[AnimalId]][]) {
      if (!m || m.stopped) continue;
      if (m.die === null) out.push({ t: "stormRoll", animal: id });
      else for (const to of reachable(s, id, m.die).keys()) out.push({ t: "stormMove", animal: id, to });
    }
    if (s.storm?.yakul && !s.storm.yakul.stopped) out.push({ t: "stormMek" });
    return out;
  }
  const t = s.turn;
  if (!t) return [];
  const cands: Action[] = [];
  if (t.stage === "roll") cands.push({ t: "roll" });
  if (t.stage === "assign") cands.push({ t: "assign", move: 0 }, { t: "assign", move: 1 }, { t: "reroll", die: 0 }, { t: "reroll", die: 1 });
  if (t.stage === "move") {
    const a = animal(s, t.animal);
    for (const to of reachable(s, a.id, effectiveMove(s, a.id, t.moveDie ?? 0)).keys()) cands.push({ t: "move", to });
  }
  if (t.stage === "act") {
    for (const h of helperOptions(s)) cands.push({ t: "help", helper: h.id });
    cands.push(...mainCandidates(s));
  }
  if (t.stage === "act" || t.stage === "end") cands.push({ t: "endTurn" });
  if (t.stage !== "roll" && t.stage !== "assign") cands.push(...freeCandidates(s));
  return cands.filter((x) => isLegal(s, x));
}

export const describeNeed = (id: string) => NEED_BY_ID[id];
export const animalName = (id: AnimalId) => ANIMAL_DEFS[id].name;
