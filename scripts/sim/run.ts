/** Simulace balancu: npm run sim -- --games 400 --animals 4 --difficulty normalni [--storm] [--expert]
 *  Bot je hladový (1 tah dopředu) — výsledky jsou SPODNÍ odhad, rodina u stolu hraje líp. */
import { Worker } from "node:worker_threads";
import { cpus } from "node:os";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ANIMAL_IDS } from "../../data/animals";
import { DIFFICULTIES, type DifficultyId } from "../../data/rules";
import type { AnimalId } from "../../data/types";

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const flag = (k: string) => args.includes(`--${k}`);
const games = Number(arg("games", "200"));
const nAnimals = Number(arg("animals", "4"));
const diffs = (arg("difficulty", "normalni") === "all" ? Object.keys(DIFFICULTIES) : [arg("difficulty", "normalni")]) as DifficultyId[];
const storm = flag("storm");
const expert = flag("expert");
const workers = Math.max(1, cpus().length);

type Row = { seed: string; stars: number; tier: string; pantry: Record<string, number>; target: Record<string, number>; stats: Record<string, number>; projectsDone: string[] };

function teamFor(i: number): AnimalId[] {
  const rot = [...ANIMAL_IDS.slice(i % 6), ...ANIMAL_IDS.slice(0, i % 6)];
  return rot.slice(0, nAnimals);
}

async function runDiff(difficulty: DifficultyId) {
  const byTeam = new Map<string, string[]>();
  for (let i = 0; i < games; i++) {
    const team = teamFor(i).join(",");
    byTeam.set(team, [...(byTeam.get(team) ?? []), `${difficulty}-${i}`]);
  }
  const jobs: Promise<Row[]>[] = [];
  const workerUrl = new URL("./worker.mjs", import.meta.url);
  for (const [team, seeds] of byTeam) {
    const chunk = Math.ceil(seeds.length / Math.max(1, Math.floor(workers / byTeam.size) || 1));
    for (let k = 0; k < seeds.length; k += chunk) {
      jobs.push(
        new Promise((res, rej) => {
          const w = new Worker(fileURLToPath(workerUrl), {
            execArgv: [],
            workerData: { cfg: { animals: team.split(","), difficulty, storm, stormTime: 60, expert }, seeds: seeds.slice(k, k + chunk), stormRolls: 3 },
          });
          w.on("message", res);
          w.on("error", rej);
        }),
      );
    }
  }
  const rows = (await Promise.all(jobs)).flat();
  const n = rows.length;
  const win = rows.filter((r) => r.tier !== "hubena").length / n;
  const great = rows.filter((r) => r.tier === "hojna").length / n;
  const ci = 1.96 * Math.sqrt((win * (1 - win)) / n);
  const avg = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0) / n;
  const prods = ["seno", "pelisek", "susene", "krizaly", "kompost"];
  const animalImpact: Record<string, number> = {};
  for (const id of ANIMAL_IDS) {
    const with_ = rows.filter((r) => teamFor(Number(r.seed.split("-").pop())).includes(id));
    if (with_.length) animalImpact[id] = with_.filter((r) => r.tier !== "hubena").length / with_.length - win;
  }
  const projects: Record<string, number> = {};
  for (const r of rows) for (const p of r.projectsDone) projects[p] = (projects[p] ?? 0) + 1 / n;
  const hist: Record<number, number> = {};
  for (const r of rows) hist[r.stars] = (hist[r.stars] ?? 0) + 1;
  return {
    difficulty,
    games: n,
    win,
    winCI: ci,
    great,
    target: DIFFICULTIES[difficulty].target,
    stars: avg((r) => r.stars),
    pantry: Object.fromEntries(prods.map((p) => [p, `${avg((r) => r.pantry[p] ?? 0).toFixed(2)}/${rows[0].target[p]}`])),
    needsDone: avg((r) => r.stats.needsDone),
    needsFailed: avg((r) => r.stats.needsFailed),
    joint: avg((r) => r.stats.joint),
    unlocks: avg((r) => r.stats.unlocks),
    idleShare: avg((r) => r.stats.idleTurns / Math.max(1, r.stats.turns)),
    soaked: avg((r) => r.stats.soaked),
    projects,
    animalImpact,
    hist,
  };
}

const t0 = Date.now();
const reports = [];
for (const d of diffs) reports.push(await runDiff(d));
const meta = { games, animals: nAnimals, storm, expert, ms: Date.now() - t0 };
console.log(JSON.stringify({ meta, reports }, null, 1));
mkdirSync("out/sim", { recursive: true });
writeFileSync(`out/sim/report-${nAnimals}z-${diffs.join("+")}${storm ? "-storm" : ""}${expert ? "-expert" : ""}.json`, JSON.stringify({ meta, reports }, null, 1));
