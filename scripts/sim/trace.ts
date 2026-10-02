import { newGame } from "../../src/engine/game";
import { botStep, goalStation } from "../../src/engine/bot";
import { stationAt } from "../../data/board";
let { state: s } = newGame({ animals: ["karel", "pogo", "avala", "kveta"], difficulty: "normalni", storm: false, stormTime: 60, expert: false, seed: process.argv[2] ?? "s1" });
for (let i = 0; i < 3000 && s.phase !== "over"; i++) {
  const prev = s;
  const g = prev.turn && prev.turn.stage === "assign" ? goalStation(prev, prev.turn.animal) : null;
  s = botStep(s);
  if (prev.turn && prev.turn.stage === "assign") {
    const id = prev.turn.animal;
    const a = s.animals[id]!;
    console.log(`${prev.season}${prev.round} ${id}`.padEnd(14), prev.weather.id, prev.turn.dice.join(","), "goal", g, "->", a.pos, stationAt(a.pos) ?? "", JSON.stringify(a.cargo), "P", JSON.stringify(s.pantry), "L", JSON.stringify(s.stations.louka));
  }
}
console.log(s.result?.stars, s.stats);
