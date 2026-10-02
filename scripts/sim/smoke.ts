import { newGame } from "../../src/engine/game";
import { playOut } from "../../src/engine/bot";
const t0 = Date.now();
const { state } = newGame({ animals: ["karel", "pogo", "avala", "kveta"], difficulty: "normalni", storm: true, stormTime: 60, expert: false, seed: process.argv[2] ?? "smoke-1" });
const end = playOut(state);
console.log(end.phase, end.result, end.pantry, end.stats, Date.now() - t0, "ms");
