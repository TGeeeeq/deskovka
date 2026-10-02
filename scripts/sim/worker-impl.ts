import { parentPort, workerData } from "node:worker_threads";
import { newGame } from "../../src/engine/game";
import { playOut } from "../../src/engine/bot";
import type { GameConfig } from "../../src/engine/types";

type Job = { cfg: Omit<GameConfig, "seed">; seeds: string[]; stormRolls: number };
const job = workerData as Job;
const out = [];
for (const seed of job.seeds) {
  const { state } = newGame({ ...job.cfg, seed });
  const end = playOut(state, { stormRolls: job.stormRolls });
  out.push({
    seed,
    stars: end.result?.stars ?? -99,
    tier: end.result?.tier ?? "hubena",
    pantry: end.pantry,
    target: end.target,
    stats: end.stats,
    projectsDone: end.projects.filter((p) => p.done).map((p) => p.id),
    lines: end.result?.lines ?? [],
  });
}
parentPort!.postMessage(out);
