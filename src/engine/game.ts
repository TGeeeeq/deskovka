import { ANIMAL_DEFS, HEART_MAX, UNLOCK_COST, areFriends } from "@data/animals";
import { MEADOW_CAP, RECIPES, SHORTCUTS, SPACES, STATIONS, STATION_CAP, STATION_IDS, stationAt } from "@data/board";
import { EVENT_BY_ID, EVENTS, RESERVE_MAX } from "@data/cards/events";
import { NEED_BY_ID, NEEDS, NEED_SLOTS, type NeedCard } from "@data/cards/needs";
import { PROJECT_BY_ID, PROJECTS, PROJECT_SLOTS } from "@data/cards/projects";
import { WEATHER, WEATHER_BY_ID, type WeatherMod } from "@data/cards/weather";
import { isProduct } from "@data/items";
import {
  DIFFICULTIES,
  PANTRY_ORDER,
  SEASONS,
  WINTER_TIERS,
  craftsOf,
  pantryTarget,
  roundsPerSeason,
  strengthOf,
  workOf,
} from "@data/rules";
import type { AnimalId, Bag, GateId, ItemId, RecipeId, SeasonId, StationId, WeatherIcon } from "@data/types";
import { add, count, entries, has, sub, total } from "./bag";
import { adjacent, loopDist, reachable, wrap } from "./move";
import { d6, next, seedRng, shuffle } from "./rng";
import type {
  Action,
  AnimalState,
  GameConfig,
  GameEvent,
  GameState,
  Pending,
  ProjectSlot,
  Result,
  ScoreLine,
} from "./types";

// ---------------------------------------------------------------------------
// Pomůcky
// ---------------------------------------------------------------------------

export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

class Ctx {
  events: GameEvent[] = [];
  constructor(public s: GameState) {}
  emit(e: GameEvent) {
    this.events.push(e);
  }
  info(text: string) {
    this.events.push({ e: "info", text });
  }
}

export class RuleError extends Error {}
function fail(msg: string): never {
  throw new RuleError(msg);
}

const inGame = (s: GameState) => Object.values(s.animals).filter(Boolean) as AnimalState[];
export const animal = (s: GameState, id: AnimalId) => s.animals[id]!;
export const active = (s: GameState) => (s.turn ? animal(s, s.turn.animal) : null);
const def = (id: AnimalId) => ANIMAL_DEFS[id];

export const capacity = (s: GameState, a: AnimalState) =>
  def(a.id).cargo + (s.wheelbarrow.carrier === a.id ? 3 : 0);
export const load = (a: AnimalState) => total(a.cargo) + (a.lucinka ? 1 : 0);
export const room = (s: GameState, a: AnimalState) => Math.max(0, capacity(s, a) - load(a));

function addHearts(c: Ctx, a: AnimalState, n: number) {
  const before = a.hearts;
  a.hearts = Math.max(0, Math.min(HEART_MAX, a.hearts + n));
  if (a.hearts !== before) c.emit({ e: "hearts", animal: a.id, n: a.hearts - before });
}

const projectDone = (s: GameState, id: string) => s.projects.some((p) => p.id === id && p.done);

/** Zvraty platné pro dané zvíře (Kesu chrání, zrušený zvrat neplatí). */
export function modsOf(s: GameState, who?: AnimalId): WeatherMod[] {
  if (s.weather.canceled) return [];
  if (who && s.animals[who]?.weatherImmune) return s.weather.mods.filter((m) => m.k !== "moveMod" && m.k !== "moveMax");
  return s.weather.mods;
}
const mod = <K extends WeatherMod["k"]>(s: GameState, k: K, who?: AnimalId) =>
  modsOf(s, who).filter((m) => m.k === k) as Extract<WeatherMod, { k: K }>[];

export const effectiveIcon = (s: GameState): WeatherIcon => s.turn?.icon ?? s.weather.icon;

const yakulProtects = (s: GameState, space: number) => {
  const y = s.animals.yakul;
  return !!y && loopDist(y.pos, space) <= 1;
};

const othersOn = (s: GameState, space: number, except: AnimalId) =>
  inGame(s).filter((a) => a.id !== except && a.pos === space);

function stationCap(s: GameState, st: StationId, item: ItemId) {
  if (st === "zahradka" && item === "bylinky" && projectDone(s, "spirala")) return 8;
  if (st === "louka" && item === "trava") return MEADOW_CAP;
  return STATION_CAP;
}

function putStation(s: GameState, st: StationId, item: ItemId, n: number) {
  const bag = s.stations[st];
  const v = Math.max(0, Math.min(stationCap(s, st, item), count(bag, item) + n));
  if (v === 0) delete bag[item];
  else bag[item] = v;
  if (st === "louka" && item === "trava" && s.strips) syncStripsTo(s);
}

/** Expertní modul: Tráva na Louce leží ve třech pruzích. Celkový součet se
 *  drží v `stations.louka`, pruhy jsou jeho rozpis. */
function syncStripsTo(s: GameState) {
  if (!s.strips) return;
  const want = count(s.stations.louka, "trava");
  let have = s.strips.reduce((a, b) => a + b, 0);
  while (have < want) {
    s.strips[s.stripNext] += 1;
    s.stripNext = (s.stripNext + 1) % 3;
    have++;
  }
  while (have > want) {
    const i = s.strips.indexOf(Math.max(...s.strips));
    s.strips[i] -= 1;
    have--;
  }
}

// ---------------------------------------------------------------------------
// Příprava hry
// ---------------------------------------------------------------------------

function buildWeatherDecks(rng: GameState["rng"], cfg: GameConfig, rounds: number) {
  const diff = DIFFICULTIES[cfg.difficulty];
  const decks = {} as Record<SeasonId, string[]>;
  for (const season of SEASONS) {
    const pool = WEATHER.filter((w) => w.season === season);
    let harsh = shuffle(rng, pool.filter((w) => w.harsh));
    const always = pool.filter((w) => w.always);
    const normal = shuffle(rng, pool.filter((w) => !w.harsh && !w.always));
    let h = Math.min(diff.harsh[season], rounds - always.length);
    const picked: string[] = [];
    if (season === "podzim" && diff.alwaysEarlyWinter) {
      picked.push("PD3");
      harsh = harsh.filter((w) => w.id !== "PD3");
      h = Math.max(0, h - 1);
    }
    picked.push(...harsh.slice(0, h).map((w) => w.id));
    picked.push(...always.map((w) => w.id));
    picked.push(...normal.slice(0, rounds - picked.length).map((w) => w.id));
    decks[season] = shuffle(rng, picked);
  }
  return decks;
}

export function newGame(cfg: GameConfig): { state: GameState; events: GameEvent[] } {
  if (cfg.animals.length < 2 || cfg.animals.length > 4) throw new RuleError("Hrají 2–4 zvířata.");
  const rng = seedRng(cfg.seed);
  const n = cfg.animals.length;
  const rounds = roundsPerSeason(n);
  const diff = DIFFICULTIES[cfg.difficulty];
  const startHearts = Math.max(diff.startHearts, cfg.humans === 1 ? 1 : 0);
  const animals: GameState["animals"] = {};
  for (const id of cfg.animals) {
    animals[id] = {
      id,
      pos: def(id).start,
      cargo: {},
      hearts: startHearts,
      unlocked: false,
      helped: false,
      lucinka: false,
      usedRypacek: false,
      usedFridge: false,
      usedHykani: false,
      usedGrunt: false,
      usedYakulCancel: false,
      freeStep: 0,
      walk: false,
      brigada: false,
      moveBonusNext: 0,
      weatherImmune: false,
      immuneNext: false,
      rerollFree: false,
    };
  }
  const stations = {} as Record<StationId, Bag>;
  for (const id of STATION_IDS) stations[id] = { ...STATIONS[id].start };
  const projectIds = shuffle(rng, PROJECTS.map((p) => p.id)).slice(0, PROJECT_SLOTS);
  const s: GameState = {
    v: 1,
    cfg,
    rng,
    season: "jaro",
    round: 0,
    totalRound: 0,
    roundsPerSeason: rounds,
    phase: "turn",
    pending: null,
    weather: { id: null, icon: "polojasno", mods: [], canceled: false },
    peek: 0,
    weatherDecks: buildWeatherDecks(rng, cfg, rounds),
    stations,
    strips: cfg.expert ? [3, 0, 0] : null,
    stripNext: 1,
    stripMown: [false, false, false],
    depletion: {},
    fertilized: [],
    pollinators: 0,
    bareMeadow: false,
    pantry: {},
    storage: {},
    target: pantryTarget(n, cfg.difficulty),
    animals,
    seat: [...cfg.animals],
    order: [],
    turnIdx: 0,
    hat: cfg.animals.find((a) => a !== "kveta") ?? cfg.animals[0],
    turn: null,
    gates: { sad: { open: false, lock: false }, maringotka: { open: false, lock: false } },
    branches: [],
    wheelbarrow: { pos: null, carrier: null },
    geese: null,
    lucinka: null,
    needs: [],
    needDeck: shuffle(rng, NEEDS.map((x) => x.id)),
    eventDeck: shuffle(rng, EVENTS.map((x) => x.id)),
    eventDiscard: [],
    reserve: [],
    projects: projectIds.map((id) => ({ id, work: 0, mat: {}, joint: false, altPaid: false, done: false })),
    flags: {
      roman: false,
      discardNextEvent: false,
      scouted: false,
      droughtNow: false,
      droughtNext: false,
      frostCherries: false,
      dryAny: false,
      actedAt: [],
      pogoSulk: false,
      pogoBoost: false,
      shorten: false,
      soakPending: false,
      noMoveRound: false,
    },
    storm: null,
    stats: { neighborHelp: 0, needStars: 0, needsDone: 0, needsFailed: 0, soaked: 0, joint: 0, unlocks: 0, turns: 0, idleTurns: 0 },
    seq: 0,
    roundStep: null,
    result: null,
  };
  const c = new Ctx(s);
  revealNeed(c);
  startRound(c);
  return { state: s, events: c.events };
}

// ---------------------------------------------------------------------------
// Kolo
// ---------------------------------------------------------------------------

function computeOrder(s: GameState) {
  const seat = s.seat;
  const start = Math.max(0, seat.indexOf(s.hat));
  const rot = [...seat.slice(start), ...seat.slice(0, start)];
  s.order = [...rot.filter((a) => a !== "kveta"), ...rot.filter((a) => a === "kveta")];
}

function startRound(c: Ctx) {
  const s = c.s;
  s.round += 1;
  s.totalRound += 1;
  s.turn = null;
  s.flags.scouted = false;
  s.flags.actedAt = [];
  s.flags.dryAny = false;
  s.flags.droughtNow = false;
  s.flags.noMoveRound = false;
  for (const a of inGame(s)) {
    a.helped = false;
    a.usedHykani = false;
    a.usedGrunt = false;
    a.freeStep = 0;
    a.walk = false;
    a.brigada = false;
    a.weatherImmune = a.immuneNext;
    a.immuneNext = false;
  }
  c.emit({ e: "round", season: s.season, round: s.round });
  s.roundStep = 0;
  continueRound(c);
}

/** Příprava kola po krocích — kterýkoli krok se může zastavit na rozhodnutí. */
function continueRound(c: Ctx) {
  const s = c.s;
  while (s.roundStep !== null && !s.pending && s.phase !== "over") {
    const step = s.roundStep;
    s.roundStep += 1;
    if (step === 0) {
      const p = s.animals.pogo;
      const deck = s.weatherDecks[s.season];
      if (p?.unlocked && p.pos === 1 && deck.length >= 2) s.pending = { k: "pogoSwap", cards: [deck[0], deck[1]] };
    } else if (step === 1) {
      const a = s.animals.avala;
      if (a?.unlocked) {
        refillEvents(s);
        if (s.eventDeck.length >= 2) s.pending = { k: "avalaPeek", cards: s.eventDeck.slice(0, 2) };
      }
    } else if (step === 2) {
      revealWeather(c);
    } else if (step === 3) {
      const card = WEATHER_BY_ID[s.weather.id!];
      const y = s.animals.yakul;
      if (card.harsh && y?.unlocked && !y.usedYakulCancel) s.pending = { k: "yakulCancel", card: card.id };
    } else if (step === 4) {
      applyWeather(c);
    } else if (step === 5) {
      if (s.cfg.storm && !s.weather.canceled && s.weather.mods.some((m) => m.k === "storm")) {
        s.phase = "storm";
        s.storm = {};
        for (const a of inGame(s)) s.storm[a.id] = { die: null, rolls: 0, stopped: false, stomp: 0 };
        c.emit({ e: "storm", status: "start" });
        return;
      }
    } else if (step === 6) {
      const k = s.animals.kveta;
      if (k) {
        const opts = [...reachable(s, "kveta", 2).keys()].sort((a, b) => a - b);
        if (opts.length > 1) s.pending = { k: "kvetaPremove", options: opts };
      }
    } else {
      s.roundStep = null;
      computeOrder(s);
      s.turnIdx = 0;
      startTurn(c);
    }
  }
}

function revealWeather(c: Ctx) {
  const s = c.s;
  const id = s.weatherDecks[s.season].shift()!;
  const card = WEATHER_BY_ID[id];
  s.weather = { id, icon: card.icon, mods: card.mods, canceled: false };
  if (s.peek > 0) s.peek -= 1;
  c.emit({ e: "weather", card: id });
}

function refillAmount(s: GameState, st: StationId, item: ItemId, n: number) {
  if (n <= 0) return n;
  let v = n;
  if (st === "louka" && item === "trava" && s.season === "leto" && s.flags.droughtNext && !projectDone(s, "studna")) {
    v = Math.floor(v / 2);
    s.flags.droughtNext = false;
  }
  if (st === "tresne" && item === "ovoce" && s.flags.frostCherries) {
    v -= 1;
    s.flags.frostCherries = false;
  }
  if ((st === "sad" || st === "tresne") && item === "ovoce" && projectDone(s, "hotel") && !s.bareMeadow) v += 1;
  if (st === "sad" && item === "ovoce") v += s.pollinators;
  if (st === "zahradka" && item === "bylinky" && projectDone(s, "spirala")) v += 1;
  if (s.fertilized.includes(st)) v += 1;
  if (s.cfg.expert) {
    const d = s.depletion[st] ?? 0;
    if (d >= 3) v = 0;
    else if (d === 2) v = Math.floor(v / 2);
  }
  return Math.max(0, v);
}

function applyWeather(c: Ctx) {
  const s = c.s;
  const card = WEATHER_BY_ID[s.weather.id!];
  for (const [st, bag] of Object.entries(card.refill) as [StationId, Bag][]) {
    for (const [item, n] of entries(bag).concat(
      Object.entries(bag).filter(([, v]) => (v ?? 0) < 0) as [ItemId, number][],
    )) {
      const v = refillAmount(s, st, item, n);
      putStation(s, st, item, v);
    }
  }
  const mods = modsOf(s);
  for (const m of mods) {
    if (m.k === "remove") {
      if (yakulProtects(s, STATIONS[m.station].space)) {
        c.info("Yakul se postavil mezi počasí a " + STATIONS[m.station].short + ".");
        continue;
      }
      for (const item of STATIONS[m.station].gather) {
        const have = count(s.stations[m.station], item);
        const keep = m.n === "all" ? (m.keep ?? 0) : Math.max(0, have - m.n);
        putStation(s, m.station, item, Math.min(have, keep) - have);
      }
    } else if (m.k === "closeGates") closeGates(c);
    else if (m.k === "branches") {
      for (const b of m.spaces) if (!s.branches.includes(b)) s.branches.push(b);
    } else if (m.k === "molt") {
      const y = s.animals.yakul;
      if (y && room(s, y) > 0) add(y.cargo, "vlna", 1);
      else putStation(s, "maringotka", "vlna", 1);
    } else if (m.k === "drawEvent") drawEvent(c, s.hat);
    else if (m.k === "drought") {
      if (projectDone(s, "studna")) c.info("Studna drží Louku zelenou.");
      else {
        s.flags.droughtNow = true;
        s.flags.droughtNext = true;
      }
    } else if (m.k === "frostCherries") s.flags.frostCherries = true;
    else if (m.k === "shortenAutumn") s.flags.shorten = true;
    else if (m.k === "peekNext") s.peek = Math.max(s.peek, 1);
    else if (m.k === "soak") s.flags.soakPending = true;
  }
  if (card.need) revealNeed(c);
}

function closeGates(c: Ctx) {
  for (const g of ["sad", "maringotka"] as GateId[]) {
    const st = c.s.gates[g];
    if (st.open && !st.lock) {
      st.open = false;
      c.emit({ e: "gate", gate: g, open: false });
    }
  }
}

function startTurn(c: Ctx) {
  const s = c.s;
  const id = s.order[s.turnIdx];
  const a = animal(s, id);
  a.usedRypacek = false;
  a.usedFridge = false;
  const k = s.animals.kveta;
  a.rerollFree = !!k?.unlocked && loopDist(k.pos, a.pos) <= 1;
  s.turn = {
    animal: id,
    stage: "roll",
    dice: [],
    moveDie: null,
    strDie: null,
    rerolled: 0,
    helper: null,
    distantHelp: false,
    strBonus: 0,
    icon: null,
    moved: 0,
    noMove: s.flags.noMoveRound,
    acted: false,
  };
}

function endTurn(c: Ctx) {
  const s = c.s;
  const a = active(s)!;
  const station = stationAt(a.pos);
  const avoid = s.needs.find((n) => NEED_BY_ID[n.id].req.k === "avoid");
  if (avoid && station === (NEED_BY_ID[avoid.id].req as { station: StationId }).station) avoid.violated = true;
  for (const m of mod(s, "endHeart")) if (station && m.stations.includes(station)) addHearts(c, a, 1);
  if (!s.turn!.acted) s.stats.idleTurns += 1;
  s.stats.turns += 1;
  a.moveBonusNext = 0;
  s.turnIdx += 1;
  if (s.turnIdx >= s.order.length) endRound(c);
  else startTurn(c);
}

function soak(c: Ctx) {
  const s = c.s;
  for (const a of inGame(s)) {
    const n = count(a.cargo, "seno");
    if (!n) continue;
    const st = stationAt(a.pos);
    if (st === "senik" || st === "maringotka") continue;
    if (yakulProtects(s, a.pos)) continue;
    add(a.cargo, "seno", -n);
    add(a.cargo, "trava", n);
    s.stats.soaked += n;
    c.emit({ e: "soak", animal: a.id, n });
  }
  s.flags.soakPending = false;
}

function endRound(c: Ctx) {
  const s = c.s;
  s.turn = null;
  for (const m of mod(s, "endRemove")) putStation(s, m.station, "ovoce", -m.n);
  // Potřeby: lhůta se krátí, propadlá = sousedská výpomoc
  for (const slot of [...s.needs]) {
    slot.due -= 1;
    if (slot.due > 0) continue;
    const card = NEED_BY_ID[slot.id];
    if (card.req.k === "avoid" && !slot.violated) {
      fulfillNeed(c, slot, animal(s, s.hat), []);
      continue;
    }
    s.needs = s.needs.filter((x) => x !== slot);
    if (slot.id === "N6") clearLucinka(s);
    if (slot.id === "N15") s.geese = null;
    s.stats.neighborHelp += 1;
    s.stats.needsFailed += 1;
    c.emit({ e: "need", card: slot.id, status: "failed" });
  }
  putStation(s, "senik", "hnuj", 1);
  if ((s.season === "jaro" || s.season === "leto") && !s.flags.droughtNow) putStation(s, "louka", "trava", refillAmount(s, "louka", "trava", 1));
  if (s.flags.soakPending) soak(c);
  if (s.geese !== null) s.geese = wrap(s.geese - 2);
  // Klobouk jde dál, Květu přeskočí
  const seat: AnimalId[] = s.seat.filter((a) => a !== "kveta");
  if (seat.length) s.hat = seat[(seat.indexOf(s.hat) + 1) % seat.length] ?? seat[0];
  if (s.season === "leto" && s.flags.pogoSulk) {
    s.flags.pogoSulk = false;
    s.flags.pogoBoost = true;
  }
  if (s.flags.shorten && s.season === "podzim") {
    s.weatherDecks.podzim.shift();
    s.flags.shorten = false;
  }
  if (s.weatherDecks[s.season].length === 0) {
    if (!endSeason(c)) return;
  }
  startRound(c);
}

/** Vrací false, když hra skončila. */
function endSeason(c: Ctx): boolean {
  const s = c.s;
  if (s.cfg.expert) {
    s.bareMeadow = s.stripMown.every(Boolean);
    if (s.stripMown.some((x) => !x)) s.pollinators = Math.min(3, s.pollinators + 1);
    s.stripMown = [false, false, false];
    s.depletion = {};
  }
  for (const a of inGame(s)) a.usedYakulCancel = false;
  const idx = SEASONS.indexOf(s.season);
  if (idx === SEASONS.length - 1) {
    finish(c);
    return false;
  }
  s.season = SEASONS[idx + 1];
  s.round = 0;
  c.emit({ e: "season", season: s.season });
  if (s.season === "leto") {
    putStation(s, "maringotka", "vlna", inGame(s).length <= 2 ? 3 : 4);
    if (s.animals.pogo) s.flags.pogoSulk = true;
    c.info("Stříhání! Vlna leží v Maringotce. Pogo je uražená.");
    revealNeed(c);
  } else if (s.season === "podzim") {
    putStation(s, "sad", "ovoce", 2);
    putStation(s, "dilna", "ovoce", 2);
    c.info("Sklizeň: Sad a lednice se plní.");
    revealNeed(c);
  }
  return true;
}

// ---------------------------------------------------------------------------
// Potřeby
// ---------------------------------------------------------------------------

function revealNeed(c: Ctx) {
  const s = c.s;
  if (s.needs.length >= NEED_SLOTS) {
    const oldest = s.needs[0];
    oldest.due -= 1;
    c.info(`Potřeby se kupí — „${NEED_BY_ID[oldest.id].name}" spěchá.`);
    return;
  }
  const id = s.needDeck.shift();
  if (!id) return;
  const card = NEED_BY_ID[id];
  s.needs.push({ id, due: card.deadline + DIFFICULTIES[s.cfg.difficulty].needDeadlineMod, violated: false });
  if (id === "N6") s.lucinka = STATIONS.potok.space;
  if (id === "N15") s.geese = STATIONS.dilna.space;
  c.emit({ e: "need", card: id, status: "new" });
}

function clearLucinka(s: GameState) {
  s.lucinka = null;
  for (const a of inGame(s)) a.lucinka = false;
}

function needSpace(s: GameState, card: NeedCard): number | null {
  const r = card.req;
  if (r.k === "geese") return s.geese;
  if (r.k === "escort") return STATIONS[r.to].space;
  if ("station" in r) return STATIONS[r.station].space;
  return null;
}

/** Kdo se podílí: aktivní zvíře + zvířata na stejném poli (u „spolu"). */
function needContributors(s: GameState, card: NeedCard, a: AnimalState): AnimalState[] | null {
  const r = card.req;
  const space = needSpace(s, card);
  if (space === null || a.pos !== space) return null;
  if (r.k === "deliver" || r.k === "geese") {
    const group = r.k === "deliver" && r.together ? [a, ...othersOn(s, space, a.id)] : [a];
    if (r.k === "deliver" && r.together && group.length < 2) return null;
    const pool: Bag = {};
    for (const g of group) for (const [k, v] of entries(g.cargo)) add(pool, k, v);
    return has(pool, r.items) ? group : null;
  }
  if (r.k === "escort") return a.lucinka ? [a] : null;
  return null;
}

export function canFulfill(s: GameState, needId: string, who?: AnimalId): boolean {
  const a = who ? animal(s, who) : active(s);
  if (!a || !s.needs.some((n) => n.id === needId)) return false;
  return needContributors(s, NEED_BY_ID[needId], a) !== null;
}

function fulfillNeed(c: Ctx, slot: { id: string }, actor: AnimalState, group: AnimalState[]) {
  const s = c.s;
  const card = NEED_BY_ID[slot.id];
  s.needs = s.needs.filter((n) => n.id !== slot.id);
  const partner = group.find((g) => g.id !== actor.id) ?? (s.turn?.helper ? animal(s, s.turn.helper) : undefined);
  for (const r of card.rewards) {
    if (r.k === "hearts") {
      addHearts(c, actor, r.n);
      if (r.both && partner) addHearts(c, partner, r.n);
      if (r.karelBonus && s.animals.karel) addHearts(c, animal(s, "karel"), 1);
    } else if (r.k === "station") {
      for (const [k, v] of entries(r.items)) putStation(s, r.station, k, v);
    } else if (r.k === "extendNeeds") {
      for (const n of s.needs) n.due += r.n;
    } else if (r.k === "star") s.stats.needStars += 1;
    else if (r.k === "openGate") {
      const g = (["sad", "maringotka"] as GateId[]).find((x) => !s.gates[x].open);
      if (g) {
        s.gates[g].open = true;
        c.emit({ e: "gate", gate: g, open: true });
      }
    } else if (r.k === "scoutHelpers") {
      refillEvents(s);
      const top = s.eventDeck.splice(0, r.n);
      const helper = top.find((id) => EVENT_BY_ID[id].helper);
      const kept = !!helper && s.reserve.length < RESERVE_MAX;
      if (kept) {
        s.reserve.push(helper!);
        c.info(`Elvíra zahlédla u plotu: ${EVENT_BY_ID[helper!].name} čeká v záloze.`);
      }
      s.eventDeck.push(...top.filter((id) => !(kept && id === helper)));
    } else if (r.k === "romanGuard") s.flags.roman = true;
    else if (r.k === "maringotkaHearts") {
      for (const g of inGame(s)) if (g.pos === STATIONS.maringotka.space) addHearts(c, g, 1);
    } else if (r.k === "discardNextEvent") s.flags.discardNextEvent = true;
    else if (r.k === "work") {
      const p = s.projects.filter((x) => !x.done).sort((x, y) => y.work - x.work)[0];
      if (p) addWork(c, p, r.n, false);
    } else if (r.k === "allHearts") {
      for (const g of inGame(s)) addHearts(c, g, r.n);
    } else if (r.k === "weatherImmune") actor.immuneNext = true;
    else if (r.k === "items") {
      for (const [k, v] of entries(r.items)) if (room(s, actor) >= v) add(actor.cargo, k, v);
    }
  }
  if (s.animals.avala) addHearts(c, animal(s, "avala"), 1);
  if (slot.id === "N6") clearLucinka(s);
  if (slot.id === "N15") s.geese = null;
  s.stats.needsDone += 1;
  c.emit({ e: "need", card: slot.id, status: "done" });
}

function doFulfill(c: Ctx, needId: string) {
  const s = c.s;
  const a = active(s)!;
  const card = NEED_BY_ID[needId];
  const group = needContributors(s, card, a);
  if (!group) fail("Tuhle Potřebu teď splnit nejde.");
  const r = card.req;
  if (r.k === "deliver" || r.k === "geese") {
    const left: Bag = { ...r.items };
    for (const g of group!) {
      for (const [k, v] of entries(left)) {
        const take = Math.min(v, count(g.cargo, k));
        if (take) {
          add(g.cargo, k, -take);
          add(left, k, -take);
        }
      }
    }
  }
  fulfillNeed(c, { id: needId }, a, group!);
}

// ---------------------------------------------------------------------------
// Události
// ---------------------------------------------------------------------------

function refillEvents(s: GameState) {
  if (s.eventDeck.length === 0 && s.eventDiscard.length) {
    s.eventDeck = shuffle(s.rng, s.eventDiscard);
    s.eventDiscard = [];
  }
}

function drawEvent(c: Ctx, actor: AnimalId) {
  const s = c.s;
  refillEvents(s);
  const id = s.eventDeck.shift();
  if (!id) return;
  c.emit({ e: "event", card: id, actor });
  if (s.flags.discardNextEvent) {
    s.flags.discardNextEvent = false;
    s.pending = { k: "discardEvent", card: id, actor };
    return;
  }
  if (EVENT_BY_ID[id].helper && s.reserve.length < RESERVE_MAX) {
    s.pending = { k: "eventKeep", card: id, actor };
    return;
  }
  resolveEvent(c, id, actor);
}

function projectOptions(s: GameState) {
  return s.projects.filter((p) => !p.done).map((p) => p.id);
}

function resolveEvent(c: Ctx, id: string, actorId: AnimalId) {
  const s = c.s;
  const actor = animal(s, actorId);
  const all = inGame(s);
  s.eventDiscard.push(id);
  switch (id) {
    case "E1":
    case "E9": {
      const options = projectOptions(s);
      if (options.length === 1) addWork(c, s.projects.find((p) => p.id === options[0])!, id === "E1" ? 3 : options[0] === "solar" ? 4 : 2, false);
      else if (options.length > 1) s.pending = { k: "project", card: id, n: id === "E1" ? 3 : 2, solarN: id === "E1" ? 3 : 4, options };
      break;
    }
    case "E2":
      s.wheelbarrow = { pos: actor.pos, carrier: null };
      break;
    case "E3":
      for (const a of all) if (room(s, a) > 0) add(a.cargo, "trava", 1);
      break;
    case "E4":
      closeGates(c);
      for (const a of all) a.moveBonusNext = 1;
      break;
    case "E5":
      for (const n of s.needs) n.due += 1;
      break;
    case "E6": {
      let need = 2;
      const fromCargo = Math.min(need, count(actor.cargo, "bylinky"));
      const fromGarden = Math.min(need - fromCargo, count(s.stations.zahradka, "bylinky"));
      if (fromCargo + fromGarden >= 2) {
        add(actor.cargo, "bylinky", -fromCargo);
        putStation(s, "zahradka", "bylinky", -fromGarden);
        add(s.pantry, "susene", 1);
        need = 0;
      } else c.info("Maruška nemá z čeho sušit.");
      break;
    }
    case "E7": {
      let n = 3;
      for (const a of all)
        for (const [k, v] of entries(a.cargo)) {
          if (!isProduct(k) || n <= 0) continue;
          const take = Math.min(v, n);
          add(a.cargo, k, -take);
          add(s.pantry, k, take);
          n -= take;
        }
      break;
    }
    case "E8": {
      const src: StationId[] = ["sad", "tresne", "svestky"];
      const have = src.reduce((acc, st) => acc + count(s.stations[st], "ovoce"), 0);
      if (have >= 2) {
        let need = 2;
        for (const st of src) {
          const take = Math.min(need, count(s.stations[st], "ovoce"));
          putStation(s, st, "ovoce", -take);
          need -= take;
        }
        add(s.pantry, "krizaly", 1);
      } else c.info("Na stromech zatím nic není.");
      break;
    }
    case "E10":
      putStation(s, "solar", "voda", projectDone(s, "studna") ? 5 : 3);
      break;
    case "E11": {
      const deck = s.weatherDecks[s.season];
      if (deck.length >= 2) s.pending = { k: "orderWeather", cards: deck.slice(0, 3) };
      break;
    }
    case "E12":
      s.flags.dryAny = true;
      break;
    case "E13":
      for (const a of all) a.freeStep = a.id === "kveta" ? 2 : 1;
      break;
    case "E14":
      for (const a of all) a.brigada = true;
      break;
    case "E15":
      add(s.pantry, "seno", 2);
      break;
    case "E16":
      for (const a of all) addHearts(c, a, 1);
      break;
    case "E17":
      if (projectDone(s, "kocky")) c.info("Kočky mají pelíšky a myši respekt.");
      else if (s.flags.roman) {
        s.flags.roman = false;
        c.info("Roman myši zahnal.");
      } else if (count(s.pantry, "seno") > 0) add(s.pantry, "seno", -1);
      break;
    case "E18":
      for (const a of all) a.walk = true;
      break;
  }
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
}
export const orderOptions = (cards: string[]) => permutations(cards);

// ---------------------------------------------------------------------------
// Projekty
// ---------------------------------------------------------------------------

function checkProject(c: Ctx, p: ProjectSlot) {
  const card = PROJECT_BY_ID[p.id];
  if (p.done) return;
  if (p.work < card.work) return;
  if (!has(p.mat, card.materials)) return;
  if (card.needsJoint && !p.joint) return;
  if (card.altCost && !p.altPaid) return;
  p.done = true;
  c.emit({ e: "project", card: p.id, status: "done" });
}

function addWork(c: Ctx, p: ProjectSlot, n: number, joint: boolean) {
  p.work = Math.min(PROJECT_BY_ID[p.id].work, p.work + n);
  if (joint) p.joint = true;
  c.emit({ e: "project", card: p.id, status: "progress" });
  checkProject(c, p);
}

// ---------------------------------------------------------------------------
// Tah: síla, pohyb, akce
// ---------------------------------------------------------------------------

export function effectiveMove(s: GameState, id: AnimalId, die: number): number {
  const a = animal(s, id);
  let v = die;
  if (id === "pogo" && v <= 2) v = 3;
  if (id === "pogo" && s.flags.pogoBoost) v += 1;
  if (id === "kveta") v = Math.min(v, 4);
  v += a.moveBonusNext;
  for (const m of mod(s, "moveMod", id)) if (!(id === "karel" && m.n < 0)) v += m.n;
  if (id !== "karel")
    for (const m of mod(s, "moveMax", id)) {
      if (m.heavyOnly && load(a) < 4) continue;
      v = Math.min(v, m.n + (m.flicekBonus && id === "flicek" ? 1 : 0));
    }
  return Math.max(0, v);
}

export type StrengthKind = "gather" | "craft" | "work" | "other";

export function strength(s: GameState, kind: StrengthKind): number {
  const t = s.turn;
  if (!t || t.strDie === null) return 0;
  const a = animal(s, t.animal);
  const station = stationAt(a.pos);
  let v = strengthOf(Math.min(6, t.strDie + t.strBonus));
  if (t.animal === "kveta" && station && s.flags.actedAt.includes(station)) v += 1;
  if (kind === "gather" && station) for (const m of mod(s, "gatherBonus", t.animal)) if (m.station === station) v += 1;
  const cap = t.helper ? 4 : 3;
  v = Math.min(v, 3);
  if (t.helper) v += 1;
  v = Math.min(v, cap);
  if (kind === "gather" && station === "potok" && s.needs.some((n) => n.id === "N14")) v -= 1;
  return Math.max(0, v);
}

const friendBonus = (s: GameState) => (s.turn?.helper && areFriends(s.turn.animal, s.turn.helper) ? 1 : 0);

export function helperOptions(s: GameState): { id: AnimalId; distant: boolean; cost: number }[] {
  const t = s.turn;
  if (!t || t.helper) return [];
  const a = animal(s, t.animal);
  const out: { id: AnimalId; distant: boolean; cost: number }[] = [];
  const cost = inGame(s).length <= 2 ? 1 : 2;
  for (const h of inGame(s)) {
    if (h.id === a.id) continue;
    if (h.id === "pogo" && s.flags.pogoSulk) continue;
    if (h.helped && !areFriends(a.id, h.id)) continue;
    const near = h.pos === a.pos || ((a.id === "yakul" || h.id === "yakul") && adjacent(h.pos, a.pos));
    if (near) out.push({ id: h.id, distant: false, cost: 0 });
    else if (loopDist(h.pos, a.pos) <= 3 && h.hearts >= cost) out.push({ id: h.id, distant: true, cost });
  }
  return out;
}

function recipeWeatherOk(s: GameState, r: RecipeId, station: StationId): boolean {
  const rec = RECIPES[r];
  const drying = r === "seno" || r === "susene" || r === "krizaly";
  if (drying && mod(s, "noDrying").length) return false;
  if (r === "krizaly" && projectDone(s, "solar")) return true;
  if ((r === "krizaly" || r === "susene") && s.flags.dryAny) return true;
  if (r === "susene" && station === "solar" && projectDone(s, "solar")) return RECIPES.susene.weather.includes(effectiveIcon(s));
  return rec.weather.length === 0 || rec.weather.includes(effectiveIcon(s));
}

function recipeStationOk(s: GameState, r: RecipeId, station: StationId | undefined) {
  if (!station) return false;
  if (RECIPES[r].stations.includes(station)) return true;
  return r === "susene" && station === "solar" && projectDone(s, "solar");
}

/** Vstupy receptu s ohledem na počasí (déšť, listí). */
function recipeInputs(s: GameState, r: RecipeId): Bag[] {
  const base = { ...RECIPES[r].inputs };
  if (r !== "kompost") return [base];
  if (effectiveIcon(s) === "dest" || mod(s, "compostNoWater").length) delete base.voda;
  const out = [base];
  if (mod(s, "compostLeaves").length) out.push({ ...base, hnuj: 1, trava: 1 });
  return out;
}

/** Zkusí jeden recept: nejdřív z nákladu (to, co zvíře přineslo), pak ze stanice. */
function craftOnce(s: GameState, a: AnimalState, r: RecipeId, dry = false): boolean {
  const station = stationAt(a.pos)!;
  for (const inputs of recipeInputs(s, r)) {
    const pool: Bag = {};
    for (const [k, v] of entries(s.stations[station])) add(pool, k, v);
    for (const [k, v] of entries(a.cargo)) add(pool, k, v);
    if (!has(pool, inputs)) continue;
    const fromCargo: Bag = {};
    const fromStation: Bag = {};
    for (const [k, v] of entries(inputs)) {
      const cg = Math.min(v, count(a.cargo, k));
      if (cg) fromCargo[k] = cg;
      if (v - cg) fromStation[k] = v - cg;
    }
    if (total(fromCargo) + room(s, a) < 1) continue;
    if (!dry) {
      for (const [k, v] of entries(fromStation)) putStation(s, station, k, -v);
      sub(a.cargo, fromCargo);
      add(a.cargo, RECIPES[r].product, 1);
    }
    return true;
  }
  return false;
}

export function canCraft(s: GameState, r: RecipeId): boolean {
  const a = active(s);
  if (!a) return false;
  const station = stationAt(a.pos);
  return recipeStationOk(s, r, station) && recipeWeatherOk(s, r, station!) && craftOnce(s, a, r, true);
}

function craftTimes(s: GameState, r: RecipeId, n: number) {
  let times = craftsOf(n);
  if (r === "seno" && n === 2 && mod(s, "craftDouble").length) times = 2;
  return times + (times > 0 ? friendBonus(s) : 0);
}

function doCraft(c: Ctx, r: RecipeId, times: number) {
  const s = c.s;
  const a = active(s)!;
  const station = stationAt(a.pos);
  if (!recipeStationOk(s, r, station)) fail("Tady se to nedělá.");
  if (!recipeWeatherOk(s, r, station!)) fail("V tomhle počasí to nejde.");
  let made = 0;
  for (let i = 0; i < times; i++) if (craftOnce(s, a, r)) made++;
  if (!made) fail("Chybí suroviny nebo místo v nákladu.");
  c.emit({ e: "crafted", animal: a.id, product: RECIPES[r].product, n: made });
}

/** Kolik toho lze sebrat (a z čeho). */
export function gatherLimit(s: GameState): number {
  const n = strength(s, "gather");
  return n + (n > 0 ? friendBonus(s) : 0);
}

function doGather(c: Ctx, take: Bag, limit: number, strip?: number) {
  const s = c.s;
  const a = active(s)!;
  const station = stationAt(a.pos);
  if (!station) fail("Tady není stanice.");
  const st = STATIONS[station!];
  const wanted = total(take);
  if (wanted < 1 || wanted > limit) fail("Tolik sebrat nejde.");
  if (wanted > room(s, a)) fail("Tolik se do nákladu nevejde.");
  const unlimitedWater = station === "solar" && projectDone(s, "studna");
  for (const [k, v] of entries(take)) {
    if (!st.gather.includes(k as never)) fail("Tohle se tu nesbírá.");
    if (k === "voda" && unlimitedWater) continue;
    if (station === "louka" && s.strips) {
      const i = strip ?? s.strips.indexOf(Math.max(...s.strips));
      if (s.strips[i] < v) fail("V pruhu tolik trávy není.");
    } else if (count(s.stations[station!], k) < v) fail("Tolik tu toho není.");
  }
  if (take.bylinky && mod(s, "waterHerbs").length && !projectDone(s, "studna")) {
    if (count(a.cargo, "voda") < 1) fail("Ve vedru se bylinky musí nejdřív zalít (1 Voda).");
    add(a.cargo, "voda", -1);
    putStation(s, station!, "voda", 0);
  }
  for (const [k, v] of entries(take)) {
    if (k === "voda" && unlimitedWater) {
      add(a.cargo, k, v);
    } else if (station === "louka" && s.strips) {
      const i = strip ?? s.strips.indexOf(Math.max(...s.strips));
      s.strips[i] -= v;
      s.stripMown[i] = true;
      s.stations.louka.trava = s.strips.reduce((x, y) => x + y, 0);
      if (!s.stations.louka.trava) delete s.stations.louka.trava;
      add(a.cargo, k, v);
    } else {
      putStation(s, station!, k, -v);
      add(a.cargo, k, v);
    }
    c.emit({ e: "gained", animal: a.id, item: k, n: v, from: station! });
  }
  if (a.id === "flicek" && !a.usedRypacek && room(s, a) > 0) {
    const dig = (["ovoce", "bylinky", "hnuj"] as const).find((x) => (st.gather as string[]).includes(x));
    if (dig) {
      add(a.cargo, dig, 1);
      a.usedRypacek = true;
      c.emit({ e: "gained", animal: a.id, item: dig, n: 1, from: "supply" });
    }
  }
  if (s.cfg.expert && strength(s, "gather") >= 3) s.depletion[station!] = (s.depletion[station!] ?? 0) + 1;
}

/** Výrobky z nákladu do Zimní spíže. Vrací, jestli se něco odevzdalo. */
function deliverAll(c: Ctx, a: AnimalState): boolean {
  const s = c.s;
  const items: Bag = {};
  for (const [k, v] of entries(a.cargo))
    if (isProduct(k)) {
      add(s.pantry, k, v);
      add(a.cargo, k, -v);
      items[k] = v;
    }
  if (!total(items)) return false;
  if (s.wheelbarrow.carrier === a.id) s.wheelbarrow = { pos: STATIONS.dilna.space, carrier: null };
  c.emit({ e: "delivered", animal: a.id, items });
  return true;
}

function markActed(s: GameState) {
  const a = active(s)!;
  const st = stationAt(a.pos);
  if (st && !s.flags.actedAt.includes(st)) s.flags.actedAt.push(st);
  s.turn!.acted = true;
  s.turn!.stage = "end";
}

function moveAnimal(c: Ctx, a: AnimalState, path: number[], gates: string[]) {
  const s = c.s;
  for (const g of gates) {
    const gate = s.gates[g as GateId];
    gate.open = true;
    if (a.id === "karel") gate.lock = true;
    c.emit({ e: "gate", gate: g as GateId, open: true });
  }
  if (a.id === "yakul") {
    for (const n of path.slice(1)) {
      if (s.branches.includes(n)) {
        s.branches = s.branches.filter((b) => b !== n);
        if (room(s, a) > 0) add(a.cargo, "prouti", 1);
        c.info("Yakul odklidil větve. Beranidlo.");
      }
    }
  }
  a.pos = path[path.length - 1];
  if (s.wheelbarrow.carrier === a.id) s.wheelbarrow.pos = a.pos;
  if (path.length > 1) c.emit({ e: "moved", animal: a.id, path });
}

function doMove(c: Ctx, to: number, keep = false) {
  const s = c.s;
  const t = s.turn!;
  const a = animal(s, t.animal);
  const max = effectiveMove(s, a.id, t.moveDie ?? 0);
  const route = reachable(s, a.id, max).get(to);
  if (!route) fail("Tam se teď nedojde.");
  moveAnimal(c, a, route!.path, route!.gates);
  t.moved = route!.path.length - 1;
  if (!keep && route!.path.slice(1, -1).includes(STATIONS.senik.space)) deliverAll(c, a);
  t.stage = "act";
  if (a.id === "karel" && t.moved > 0) {
    const others = othersOn(s, a.pos, a.id).sort((x, y) => x.hearts - y.hearts);
    if (others[0]) addHearts(c, others[0], 1);
  }
  if (t.moved > 0 && SPACES[a.pos - 1].kind === "event") drawEvent(c, a.id);
}

// ---------------------------------------------------------------------------
// Hlavní reducer
// ---------------------------------------------------------------------------

const FREE: Action["t"][] = [
  "give",
  "giveHeart",
  "deliver",
  "store",
  "takeStore",
  "fulfill",
  "contribute",
  "payReserve",
  "unlock",
  "pickWheelbarrow",
  "dropWheelbarrow",
  "pickLucinka",
  "fridge",
  "hykani",
  "grunt",
  "freeStep",
  "walk",
  "brigada",
  "playReserve",
  "fertilize",
  "icon",
];

export function apply(state: GameState, action: Action): { state: GameState; events: GameEvent[] } {
  const s = clone(state);
  const c = new Ctx(s);
  if (s.phase === "over") fail("Hra skončila.");
  s.seq += 1;

  if (s.pending) {
    if (action.t !== "choose") fail("Nejdřív je potřeba rozhodnout.");
    resolvePending(c, (action as { i: number }).i);
    return { state: s, events: c.events };
  }

  if (s.phase === "storm") {
    stormAction(c, action);
    return { state: s, events: c.events };
  }

  const t = s.turn;
  if (!t) fail("Teď nikdo nehraje.");
  const a = animal(s, t!.animal);

  if (FREE.includes(action.t)) {
    freeAction(c, action);
    return { state: s, events: c.events };
  }

  switch (action.t) {
    case "roll": {
      if (t!.stage !== "roll") fail("Už je hozeno.");
      t!.dice = t!.noMove ? [d6(s.rng)] : [d6(s.rng), d6(s.rng)];
      c.emit({ e: "dice", animal: a.id, dice: t!.dice });
      if (t!.noMove) {
        t!.strDie = t!.dice[0];
        t!.stage = "act";
      } else t!.stage = "assign";
      break;
    }
    case "reroll": {
      if (t!.stage !== "assign" && !(t!.noMove && t!.stage === "act" && !t!.acted && !t!.helper)) fail("Přehazovat jde jen hned po hodu.");
      if (action.die < 0 || action.die >= t!.dice.length) fail("Taková kostka není.");
      if (a.rerollFree) a.rerollFree = false;
      else if (a.hearts >= 1) addHearts(c, a, -1);
      else fail("Na přehoz je potřeba srdíčko.");
      t!.dice[action.die] = d6(s.rng);
      t!.rerolled += 1;
      if (t!.noMove) t!.strDie = t!.dice[0];
      c.emit({ e: "dice", animal: a.id, dice: t!.dice });
      break;
    }
    case "assign": {
      if (t!.stage !== "assign") fail("Teď se kostky nepřiřazují.");
      const m = action.move === 1 ? 1 : 0;
      t!.moveDie = t!.dice[m];
      t!.strDie = t!.dice[1 - m];
      t!.stage = "move";
      break;
    }
    case "move": {
      if (t!.stage !== "move") fail("Teď se nechodí.");
      doMove(c, action.to, action.keep);
      break;
    }
    case "help": {
      if (t!.stage !== "act" || t!.acted) fail("Pomoc se volá před akcí.");
      const opt = helperOptions(s).find((h) => h.id === action.helper);
      if (!opt) fail("Tohle zvíře teď pomoct nemůže.");
      const h = animal(s, action.helper);
      if (opt!.distant) addHearts(c, h, -opt!.cost);
      t!.helper = h.id;
      t!.distantHelp = opt!.distant;
      if (!areFriends(a.id, h.id)) h.helped = true;
      const bonus = 1 + mod(s, "jointHeart").length;
      addHearts(c, a, bonus);
      addHearts(c, h, bonus);
      s.stats.joint += 1;
      c.emit({ e: "joint", a: a.id, b: h.id });
      break;
    }
    case "gather":
    case "gatherCraft": {
      if (t!.stage !== "act" || t!.acted) fail("Akce už proběhla.");
      if (action.t === "gatherCraft") {
        const n = strength(s, "craft");
        if (n < 2) fail("Sbírej + zpracuj chce sílu 2.");
        doGather(c, action.take, n - 1 + friendBonus(s), action.strip);
        doCraft(c, action.recipe, 1);
      } else doGather(c, action.take, gatherLimit(s), action.strip);
      markActed(s);
      break;
    }
    case "craft": {
      if (t!.stage !== "act" || t!.acted) fail("Akce už proběhla.");
      const times = craftTimes(s, action.recipe, strength(s, "craft"));
      if (times < 1) fail("Na zpracování chybí síla.");
      doCraft(c, action.recipe, times);
      markActed(s);
      break;
    }
    case "work": {
      if (t!.stage !== "act" || t!.acted) fail("Akce už proběhla.");
      const p = s.projects.find((x) => x.id === action.project && !x.done);
      if (!p) fail("Takový projekt tu není.");
      if (STATIONS[PROJECT_BY_ID[p!.id].station].space !== a.pos) fail("Na projektu se pracuje na jeho stanici.");
      const n = strength(s, "work");
      addWork(c, p!, workOf(n) + friendBonus(s), n >= 4);
      markActed(s);
      break;
    }
    case "rest": {
      if (t!.stage !== "act" || t!.acted) fail("Akce už proběhla.");
      if (stationAt(a.pos) !== "maringotka") fail("Odpočívá se v Maringotce.");
      const others = othersOn(s, a.pos, a.id).length;
      let n = Math.min(3, 1 + others);
      for (const m of mod(s, "restBonus")) n += m.n;
      if (projectDone(s, "kocky")) n += 1;
      addHearts(c, a, n);
      const kesu = s.needs.find((x) => x.id === "N16");
      if (kesu) fulfillNeed(c, kesu, a, [a]);
      const emil = s.needs.find((x) => x.id === "N18");
      if (emil && others > 0) fulfillNeed(c, emil, a, [a, ...othersOn(s, a.pos, a.id)]);
      markActed(s);
      break;
    }
    case "openGate": {
      if (t!.stage !== "act" || t!.acted) fail("Akce už proběhla.");
      const sc = SHORTCUTS.find((x) => x.id === action.gate)!;
      if (a.pos !== sc.a && a.pos !== sc.b) fail("K vratům je potřeba dojít.");
      s.gates[action.gate].open = true;
      if (a.id === "karel") s.gates[action.gate].lock = true;
      c.emit({ e: "gate", gate: action.gate, open: true });
      markActed(s);
      break;
    }
    case "scout": {
      if (t!.stage !== "act" || t!.acted) fail("Akce už proběhla.");
      if (stationAt(a.pos) !== "brana") fail("Vyhlíží se od Brány.");
      const avalaFree = a.id === "avala" && a.unlocked;
      if (s.flags.scouted && !avalaFree) fail("V tomhle kole už se vyhlíželo.");
      if (!avalaFree) s.flags.scouted = true;
      markActed(s);
      drawEvent(c, a.id);
      break;
    }
    case "edge": {
      if (t!.stage !== "act" || t!.acted) fail("Akce už proběhla.");
      if (SPACES[a.pos - 1].kind === "station") fail("Okraj louky je jen na cestě.");
      if (s.season === "podzim") fail("Na podzim už okraj louky neroste.");
      if (strength(s, "gather") < 2) fail("Okraj louky chce sílu 2.");
      if (room(s, a) < 1) fail("Náklad je plný.");
      add(a.cargo, "trava", 1);
      c.emit({ e: "gained", animal: a.id, item: "trava", n: 1, from: "supply" });
      markActed(s);
      break;
    }
    case "care": {
      if (t!.stage !== "act" || t!.acted) fail("Akce už proběhla.");
      const slot = s.needs.find((x) => x.id === "N3");
      if (!slot) fail("Princezna teď na česání nečeká.");
      if (stationAt(a.pos) !== "senik") fail("Princezna čeká u Seníku.");
      if (strength(s, "other") < 4) fail("Česání chce sílu 4 — ve dvou.");
      fulfillNeed(c, slot!, a, t!.helper ? [a, animal(s, t!.helper)] : [a]);
      markActed(s);
      break;
    }
    case "clearBranch": {
      if (t!.stage !== "act" || t!.acted) fail("Akce už proběhla.");
      if (!s.branches.includes(a.pos)) fail("Tady žádné větve nejsou.");
      s.branches = s.branches.filter((b) => b !== a.pos);
      if (room(s, a) > 0) add(a.cargo, "prouti", 1);
      markActed(s);
      break;
    }
    case "skipAction": {
      if (t!.stage === "roll" || t!.stage === "assign") fail("Nejdřív hoď a přiřaď kostky.");
      t!.stage = "end";
      break;
    }
    case "endTurn": {
      if (t!.stage === "roll" || t!.stage === "assign") fail("Nejdřív hoď a přiřaď kostky.");
      endTurn(c);
      break;
    }
    default:
      fail("Neznámá akce.");
  }
  return { state: s, events: c.events };
}

function freeAction(c: Ctx, action: Action) {
  const s = c.s;
  const t = s.turn!;
  const a = animal(s, t.animal);
  switch (action.t) {
    case "icon": {
      const choose = mod(s, "chooseIcon")[0];
      if (!choose || !choose.icons.includes(action.icon)) fail("Počasí si teď vybrat nejde.");
      if (t.acted) fail("Počasí se volí před akcí.");
      t.icon = action.icon;
      break;
    }
    case "give": {
      const from = animal(s, action.from);
      const to = animal(s, action.to);
      if (from.id !== a.id && to.id !== a.id) fail("Darovat smí jen zvíře na tahu, nebo jemu.");
      if (!giftOk(s, from, to)) fail("Na dar jsou moc daleko.");
      if (count(from.cargo, action.item) < action.n || action.n < 1) fail("Tolik toho nemá.");
      if (room(s, to) < action.n) fail("Tolik se mu nevejde.");
      add(from.cargo, action.item, -action.n);
      add(to.cargo, action.item, action.n);
      c.emit({ e: "spent", animal: from.id, item: action.item, n: action.n, to: to.id });
      break;
    }
    case "giveHeart": {
      const from = animal(s, action.from);
      const to = animal(s, action.to);
      if (from.id !== a.id && to.id !== a.id) fail("Darovat smí jen zvíře na tahu, nebo jemu.");
      if (!giftOk(s, from, to)) fail("Na dar jsou moc daleko.");
      if (from.hearts < 1) fail("Žádné srdíčko nemá.");
      addHearts(c, from, -1);
      addHearts(c, to, 1);
      break;
    }
    case "deliver": {
      if (stationAt(a.pos) !== "senik") fail("Odevzdává se na Seníku.");
      if (!deliverAll(c, a)) fail("Není co odevzdat.");
      break;
    }
    case "store":
    case "takeStore": {
      if (stationAt(a.pos) !== "senik") fail("Sklad je na Seníku.");
      if (action.n < 1) fail("Kolik?");
      if (action.t === "store") {
        if (count(a.cargo, action.item) < action.n) fail("Tolik toho nemá.");
        add(a.cargo, action.item, -action.n);
        add(s.storage, action.item, action.n);
      } else {
        if (count(s.storage, action.item) < action.n) fail("Ve skladu tolik není.");
        if (room(s, a) < action.n) fail("Náklad je plný.");
        add(s.storage, action.item, -action.n);
        add(a.cargo, action.item, action.n);
      }
      break;
    }
    case "fulfill":
      doFulfill(c, action.need);
      break;
    case "contribute": {
      const p = s.projects.find((x) => x.id === action.project && !x.done);
      if (!p) fail("Takový projekt tu není.");
      const card = PROJECT_BY_ID[p!.id];
      if (STATIONS[card.station].space !== a.pos) fail("Materiál se nosí na stanici projektu.");
      if (count(a.cargo, action.item) < action.n || action.n < 1) fail("Tolik toho nemá.");
      if (card.altCost && action.item === "krizaly") {
        p!.altPaid = true;
        add(a.cargo, "krizaly", -1);
      } else {
        const need = count(card.materials, action.item) - count(p!.mat, action.item);
        if (need < action.n) fail("Tolik už projekt nepotřebuje.");
        add(a.cargo, action.item, -action.n);
        add(p!.mat, action.item, action.n);
      }
      c.emit({ e: "project", card: p!.id, status: "progress" });
      checkProject(c, p!);
      break;
    }
    case "payReserve": {
      const p = s.projects.find((x) => x.id === action.project && !x.done);
      if (!p || !PROJECT_BY_ID[p.id].altCost) fail("Tenhle projekt kartu nebere.");
      if (!s.reserve.includes(action.card) || EVENT_BY_ID[action.card].who !== "tony") fail("Potřeba je Tonyho karta ze zálohy.");
      s.reserve = s.reserve.filter((x) => x !== action.card);
      s.eventDiscard.push(action.card);
      p!.altPaid = true;
      checkProject(c, p!);
      break;
    }
    case "unlock": {
      const u = animal(s, action.animal);
      if (u.unlocked) fail("Už odemčeno.");
      if (u.hearts < UNLOCK_COST) fail(`Odemčení stojí ${UNLOCK_COST} srdíčka.`);
      addHearts(c, u, -UNLOCK_COST);
      u.unlocked = true;
      s.stats.unlocks += 1;
      c.emit({ e: "unlock", animal: u.id });
      break;
    }
    case "pickWheelbarrow": {
      if (s.wheelbarrow.pos !== a.pos || s.wheelbarrow.carrier) fail("Kolečko tu není.");
      s.wheelbarrow.carrier = a.id;
      break;
    }
    case "dropWheelbarrow": {
      if (s.wheelbarrow.carrier !== a.id) fail("Kolečko nevezeš.");
      if (load(a) > ANIMAL_DEFS[a.id].cargo) fail("Bez kolečka by se to neuneslo.");
      s.wheelbarrow = { pos: a.pos, carrier: null };
      break;
    }
    case "pickLucinka": {
      if (s.lucinka === null || s.lucinka !== a.pos) fail("Lucinka tu není.");
      if (room(s, a) < 1) fail("Na Lucinku není místo.");
      a.lucinka = true;
      s.lucinka = null;
      break;
    }
    case "fridge": {
      if (a.id !== "flicek") fail("Lednici umí otevřít jen Flíček.");
      if (stationAt(a.pos) !== "dilna") fail("Lednice je v Dílně.");
      if (a.usedFridge) fail("Lednice už byla otevřená.");
      if (!count(s.stations.dilna, "ovoce") || room(s, a) < 1) fail("Lednice je prázdná nebo náklad plný.");
      putStation(s, "dilna", "ovoce", -1);
      add(a.cargo, "ovoce", 1);
      a.usedFridge = true;
      c.emit({ e: "gained", animal: a.id, item: "ovoce", n: 1, from: "dilna" });
      break;
    }
    case "hykani": {
      if (a.id !== "karel" || !a.unlocked) fail("Hýkat na 3 km umí jen odemčený Karel na tahu.");
      if (a.usedHykani) fail("Dnes už hýkal.");
      const target = animal(s, action.target);
      if (target.id === "karel") fail("Sám na sebe nehýká.");
      const dir = ((a.pos - target.pos + 30) % 30) <= 15 ? 1 : -1;
      const path = [target.pos];
      for (let i = 0; i < 2 && path[path.length - 1] !== a.pos; i++) path.push(wrap(path[path.length - 1] + dir));
      if (target.id === "yakul" && !target.unlocked && path[path.length - 1] === a.pos && path.length > 1) path.pop();
      moveAnimal(c, target, path, []);
      a.usedHykani = true;
      break;
    }
    case "grunt": {
      const f = s.animals.flicek;
      if (!f?.unlocked) fail("Tři chrochtání umí odemčený Flíček.");
      if (f!.usedGrunt) fail("V tomhle kole už chrochtal.");
      if (action.kind === "food") {
        if (t.strDie === null || t.acted) fail("Na jídlo se chrochtá po přiřazení kostek, před akcí.");
        t.strBonus += 1;
      } else if (action.kind === "scratch") {
        const target = action.target ? animal(s, action.target) : null;
        if (!target || loopDist(target.pos, f!.pos) > 2) fail("Na drbání musí být do 2 polí.");
        addHearts(c, target!, 1);
      } else {
        const r = d6(s.rng);
        c.info(`Flíček chrochtá naléhavě… padla ${r}.`);
        if (r <= 2) addHearts(c, f!, 1);
        else if (r <= 4) {
          if (room(s, f!) > 0) add(f!.cargo, "ovoce", 1);
        } else drawEvent(c, a.id);
      }
      f!.usedGrunt = true;
      break;
    }
    case "freeStep": {
      const m = animal(s, action.animal);
      if (m.freeStep < 1) fail("Kohout už odkokrhal.");
      const routes = reachable(s, m.id, m.freeStep);
      const r = routes.get(action.to);
      if (!r || action.to === m.pos) fail("Tam se popojít nedá.");
      moveAnimal(c, m, r!.path, r!.gates);
      m.freeStep = 0;
      break;
    }
    case "walk": {
      const m = animal(s, action.animal);
      if (!m.walk) fail("Procházka teď není.");
      moveAnimal(c, m, [m.pos, 1], []);
      m.walk = false;
      addHearts(c, m, 1);
      break;
    }
    case "brigada": {
      const m = animal(s, action.animal);
      const st = stationAt(m.pos);
      if (!m.brigada || !st) fail("Brigáda pracuje jen na stanicích.");
      if (!(STATIONS[st].gather as string[]).includes(action.item) || !count(s.stations[st], action.item)) fail("Tohle tu není.");
      if (room(s, m) < 1) fail("Náklad je plný.");
      putStation(s, st, action.item, -1);
      add(m.cargo, action.item, 1);
      m.brigada = false;
      c.emit({ e: "gained", animal: m.id, item: action.item, n: 1, from: st });
      break;
    }
    case "playReserve": {
      if (!s.reserve.includes(action.card)) fail("Taková karta v záloze není.");
      s.reserve = s.reserve.filter((x) => x !== action.card);
      c.emit({ e: "event", card: action.card, actor: a.id });
      resolveEvent(c, action.card, a.id);
      break;
    }
    case "fertilize": {
      if (!s.cfg.expert) fail("Hnojení patří do Expertního modulu.");
      const st = stationAt(a.pos);
      if (st !== action.station || !["zahradka", "sad", "louka"].includes(st)) fail("Hnojí se Zahrádka, Sad nebo Louka.");
      if (s.fertilized.includes(st)) fail("Už pohnojeno.");
      if (count(a.cargo, "kompost") < 1) fail("Chybí Kompost.");
      add(a.cargo, "kompost", -1);
      s.fertilized.push(st);
      break;
    }
  }
}

export function giftOk(s: GameState, from: AnimalState, to: AnimalState) {
  if (from.id === to.id) return false;
  const d = loopDist(from.pos, to.pos);
  if (mod(s, "giftsSameSpace").length) return d === 0;
  const range = Math.max(1, ...mod(s, "giftRange").map((m) => m.n));
  return d <= range;
}

function resolvePending(c: Ctx, i: number) {
  const s = c.s;
  const p = s.pending as Pending;
  s.pending = null;
  switch (p.k) {
    case "pogoSwap":
      if (i === 1) {
        const d = s.weatherDecks[s.season];
        [d[0], d[1]] = [d[1], d[0]];
      }
      break;
    case "avalaPeek":
      if (i === 1 || i === 2) {
        const card = s.eventDeck.splice(i - 1, 1)[0];
        s.eventDeck.push(card);
      }
      break;
    case "yakulCancel":
      if (i === 1) {
        s.weather.canceled = true;
        animal(s, "yakul").usedYakulCancel = true;
        c.info("Yakul se postavil mezi počasí a ostatní.");
      }
      break;
    case "kvetaPremove": {
      const to = p.options[i];
      if (to === undefined) fail("Taková volba není.");
      const k = animal(s, "kveta");
      const r = reachable(s, "kveta", 2).get(to);
      if (r && to !== k.pos) moveAnimal(c, k, r.path, r.gates);
      break;
    }
    case "eventKeep":
      if (i === 1) s.reserve.push(p.card);
      else resolveEvent(c, p.card, p.actor);
      break;
    case "discardEvent":
      if (i === 1) s.eventDiscard.push(p.card);
      else if (EVENT_BY_ID[p.card].helper && s.reserve.length < RESERVE_MAX) s.pending = { k: "eventKeep", card: p.card, actor: p.actor };
      else resolveEvent(c, p.card, p.actor);
      break;
    case "project": {
      const id = p.options[i];
      const slot = s.projects.find((x) => x.id === id);
      if (!slot) fail("Taková volba není.");
      addWork(c, slot!, id === "solar" ? p.solarN : p.n, false);
      break;
    }
    case "orderWeather": {
      const perms = orderOptions(p.cards);
      const order = perms[i];
      if (!order) fail("Taková volba není.");
      s.weatherDecks[s.season].splice(0, p.cards.length, ...order);
      s.peek = Math.max(s.peek, p.cards.length);
      break;
    }
  }
  if (!s.pending && s.roundStep !== null) continueRound(c);
}

// ---------------------------------------------------------------------------
// Bouřkový modul (realtime běží v UI, engine dostává jen výsledky)
// ---------------------------------------------------------------------------

function stormAction(c: Ctx, action: Action) {
  const s = c.s;
  const st = s.storm!;
  switch (action.t) {
    case "stormRoll": {
      const m = st[action.animal];
      if (!m || m.stopped) fail("Tohle zvíře už v bouřce stojí.");
      if (m!.die !== null) fail("Nejdřív dojdi.");
      const r = d6(s.rng);
      m!.rolls += 1;
      if (r === 1) {
        m!.stomp += 1;
        c.info(`${ANIMAL_DEFS[action.animal].name} se lekl${ANIMAL_DEFS[action.animal].fem ? "a" : ""} hromu! Třikrát dupnout.`);
      } else m!.die = r;
      c.emit({ e: "dice", animal: action.animal, dice: [r] });
      break;
    }
    case "stormMove": {
      const m = st[action.animal];
      if (!m || m.die === null) fail("Nejdřív hoď.");
      const a = animal(s, action.animal);
      const route = reachable(s, a.id, m!.die!).get(action.to);
      if (!route) fail("Tam se nedoběhne.");
      moveAnimal(c, a, route!.path, []);
      m!.die = null;
      if (stationAt(a.pos) === "senik") {
        const items: Bag = {};
        for (const [k, v] of entries(a.cargo))
          if (isProduct(k)) {
            add(s.pantry, k, v);
            add(a.cargo, k, -v);
            items[k] = v;
          }
        if (total(items)) c.emit({ e: "delivered", animal: a.id, items });
      }
      break;
    }
    case "stormMek": {
      const m = st.yakul;
      if (!m) fail("Yakul ve hře není.");
      m!.stopped = true;
      m!.die = null;
      c.info("Mek! Yakul stojí a chrání okolí.");
      break;
    }
    case "stormEnd": {
      if (s.flags.soakPending) soak(c);
      s.storm = null;
      s.phase = "turn";
      s.flags.noMoveRound = true;
      c.emit({ e: "storm", status: "end" });
      continueRound(c);
      break;
    }
    default:
      fail("V bouřce se jen běhá.");
  }
}

// ---------------------------------------------------------------------------
// Konec hry
// ---------------------------------------------------------------------------

export function wishes(s: GameState): Partial<Record<AnimalId, boolean>> {
  const out: Partial<Record<AnimalId, boolean>> = {};
  for (const a of inGame(s)) {
    if (a.id === "karel") out.karel = a.hearts === 0;
    if (a.id === "pogo") out.pogo = a.pos === 1;
    if (a.id === "avala") out.avala = s.gates.sad.open && s.gates.maringotka.open;
    if (a.id === "kveta") out.kveta = othersOn(s, a.pos, a.id).length > 0;
    if (a.id === "flicek") out.flicek = count(s.pantry, "pelisek") >= 2;
    if (a.id === "yakul") out.yakul = s.stats.soaked === 0;
  }
  return out;
}

export function score(s: GameState): Result {
  const lines: ScoreLine[] = [];
  for (const p of PANTRY_ORDER) {
    const need = count(s.target, p);
    const have = count(s.pantry, p);
    const stars = have >= need ? 2 : have >= Math.ceil(need / 2) ? 1 : 0;
    lines.push({ label: `Spíž: ${p} ${have}/${need}`, stars });
  }
  for (const p of s.projects) if (p.done) lines.push({ label: `Projekt: ${PROJECT_BY_ID[p.id].name}`, stars: PROJECT_BY_ID[p.id].stars });
  for (const [id, ok] of Object.entries(wishes(s))) if (ok) lines.push({ label: `Přání: ${ANIMAL_DEFS[id as AnimalId].wish.name}`, stars: 1 });
  const hearts = inGame(s).reduce((acc, a) => acc + a.hearts, 0);
  if (hearts >= 5) lines.push({ label: `Srdíčka týmu: ${hearts}`, stars: Math.min(2, Math.floor(hearts / 5)) });
  if (s.stats.needStars) lines.push({ label: "Hvězdy z Potřeb", stars: s.stats.needStars });
  if (s.stats.needsDone >= 2) lines.push({ label: `Poděkování za ${s.stats.needsDone} splněné Potřeby`, stars: Math.floor(s.stats.needsDone / 2) });
  if (s.cfg.expert && s.pollinators >= 2) lines.push({ label: "Opylovači", stars: 1 });
  if (s.stats.neighborHelp >= 2) lines.push({ label: `Sousedská výpomoc (${s.stats.neighborHelp}×)`, stars: -Math.floor(s.stats.neighborHelp / 2) });
  const stars = lines.reduce((acc, l) => acc + l.stars, 0);
  const n = Math.max(2, Math.min(4, inGame(s).length)) as 2 | 3 | 4;
  const [good, great] = WINTER_TIERS[n];
  const tier = stars >= great ? "hojna" : stars >= good ? "dobra" : "hubena";
  return { stars, tier, lines };
}

function finish(c: Ctx) {
  const s = c.s;
  s.phase = "over";
  s.turn = null;
  s.result = score(s);
  c.emit({ e: "over", result: s.result });
}

export const isOver = (s: GameState) => s.phase === "over";
export const nextRandom = (s: GameState) => next(s.rng);
