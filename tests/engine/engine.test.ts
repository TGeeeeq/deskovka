import { describe, expect, it } from "vitest";
import { apply, newGame } from "@engine/game";
import { legalActions } from "@engine/legal";
import { playOut } from "@engine/bot";
import type { GameConfig, GameState } from "@engine/types";
import { ANIMAL_IDS } from "@data/animals";

const cfg = (over: Partial<GameConfig> = {}): GameConfig => ({
  animals: ["karel", "pogo", "avala", "kveta"],
  difficulty: "normalni",
  storm: false,
  stormTime: 60,
  expert: false,
  seed: "test",
  ...over,
});

/** Náhodný hráč s pevným semínkem — hledá zaseknutí a výjimky. */
function randomPlay(s: GameState, seed: number, max = 3000) {
  let x = seed;
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  const log: unknown[] = [];
  for (let i = 0; i < max && s.phase !== "over"; i++) {
    const acts = legalActions(s);
    expect(acts.length).toBeGreaterThan(0);
    const end = acts.find((a) => a.t === "endTurn");
    const pick = end && rnd() < 0.35 ? end : acts[Math.floor(rnd() * acts.length)];
    log.push(pick);
    s = apply(s, pick).state;
  }
  return { s, log };
}

describe("engine", () => {
  it("je deterministický: stejné semínko a akce = stejný stav", () => {
    const a = randomPlay(newGame(cfg({ seed: "det" })).state, 7);
    let s = newGame(cfg({ seed: "det" })).state;
    for (const act of a.log) s = apply(s, act as never).state;
    expect(JSON.stringify(s)).toEqual(JSON.stringify(a.s));
  });

  it("stav přežije JSON (save/load)", () => {
    const s = newGame(cfg()).state;
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  for (const n of [2, 3, 4]) {
    for (const storm of [false, true]) {
      for (const expert of [false, true]) {
        it(`náhodná hra doběhne: ${n} zvířata, bouřka ${storm}, expert ${expert}`, () => {
          const animals = ANIMAL_IDS.slice(n === 2 ? 4 : 0, n === 2 ? 6 : n);
          const { s } = randomPlay(newGame(cfg({ animals, storm, expert, seed: `r${n}${storm}${expert}` })).state, n * 13 + (storm ? 1 : 0));
          expect(s.phase).toBe("over");
          expect(s.result).not.toBeNull();
        });
      }
    }
  }

  it("bot dohraje hru se všemi moduly", () => {
    const s = playOut(newGame(cfg({ animals: ["flicek", "yakul", "kveta"], storm: true, expert: true, difficulty: "hrdinska" })).state);
    expect(s.phase).toBe("over");
  });

  it("seno nejde sušit v dešti", () => {
    let s = newGame(cfg({ seed: "rain" })).state;
    s = { ...s, pending: null, roundStep: null, weather: { id: "J3", icon: "dest", mods: [], canceled: false } };
    s.animals.karel!.pos = 8;
    s.animals.karel!.cargo = { trava: 2 };
    s.turn = { ...s.turn!, animal: "karel", stage: "act", dice: [4, 4], moveDie: 4, strDie: 4 };
    expect(() => apply(s, { t: "craft", recipe: "seno" })).toThrow(/počasí/);
  });
});
