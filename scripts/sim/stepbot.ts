import { newGame, apply } from "../../src/engine/game";
import { botNextAction } from "../../src/engine/bot";
let { state: s } = newGame({ animals: ["karel", "flicek", "yakul"], difficulty: "normalni", storm: true, stormTime: 60, expert: true, seed: "step" });
let n = 0;
while (s.phase !== "over" && n < 5000) { const a = botNextAction(s); if (!a) break; s = apply(s, a).state; n++; }
console.log(s.phase, n, s.result?.stars);
