import { SHORTCUTS, SHORTCUT_COST, SPACE_COUNT } from "@data/board";
import type { AnimalId } from "@data/types";
import type { GameState } from "./types";

export const wrap = (n: number) => ((((n - 1) % SPACE_COUNT) + SPACE_COUNT) % SPACE_COUNT) + 1;

/** Vzdálenost po smyčce (bez zkratek). */
export const loopDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % SPACE_COUNT;
  return Math.min(d, SPACE_COUNT - d);
};

export const adjacent = (a: number, b: number) => loopDist(a, b) <= 1;

export type Route = { path: number[]; cost: number; gates: string[] };

/** Všechna pole, kam se zvíře dostane za `max` bodů pohybu jedním směrem.
 *  Zkratka stojí 2 body a směr nemění. */
export function reachable(s: GameState, id: AnimalId, max: number, opts: { ignoreBlockers?: boolean } = {}): Map<number, Route> {
  const a = s.animals[id]!;
  const out = new Map<number, Route>();
  const consider = (r: Route) => {
    const end = r.path[r.path.length - 1];
    const prev = out.get(end);
    if (!prev || r.cost < prev.cost || (r.cost === prev.cost && r.gates.length < prev.gates.length)) out.set(end, r);
  };
  const stopsAt = (n: number) => {
    if (opts.ignoreBlockers) return false;
    if (id !== "karel" && id !== "yakul" && s.branches.includes(n)) return true;
    if (id === "yakul" && s.wheelbarrow.pos === n && s.wheelbarrow.carrier === null) return true;
    return false;
  };

  const walk = (path: number[], cost: number, dir: number, gates: string[]) => {
    consider({ path, cost, gates });
    const here = path[path.length - 1];
    if (path.length > 1 && stopsAt(here)) return;
    const steps: { to: number; c: number; dir: number; gate?: string }[] = [];
    for (const d of dir === 0 ? [1, -1] : [dir]) steps.push({ to: wrap(here + d), c: 1, dir: d });
    for (const sc of SHORTCUTS) {
      const other = sc.a === here ? sc.b : sc.b === here ? sc.a : null;
      if (other === null) continue;
      if (sc.only && !sc.only.includes(id)) continue;
      let c = SHORTCUT_COST;
      let gate: string | undefined;
      if (sc.gate) {
        const g = s.gates[sc.id as "sad" | "maringotka"];
        if (!g.open) {
          if (id === "avala") gate = sc.id;
          else if (id === "karel") {
            gate = sc.id;
            c += 1;
          } else continue;
        }
      }
      steps.push({ to: other, c, dir, gate });
    }
    for (const st of steps) {
      if (cost + st.c > max) continue;
      if (path.includes(st.to)) continue;
      walk([...path, st.to], cost + st.c, st.dir, st.gate ? [...gates, st.gate] : gates);
    }
  };
  walk([a.pos], 0, 0, []);

  if (id === "yakul" && !a.unlocked && !opts.ignoreBlockers) {
    for (const [n] of out) {
      if (n === a.pos) continue;
      if (Object.values(s.animals).some((o) => o && o.id !== id && o.pos === n)) out.delete(n);
    }
  }
  return out;
}

/** Nejkratší vzdálenost s využitím otevřených zkratek (pro bota a nápovědu). */
export function distance(s: GameState, id: AnimalId, from: number, to: number): number {
  const dist = new Map<number, number>([[from, 0]]);
  const queue: number[] = [from];
  while (queue.length) {
    const n = queue.shift()!;
    const d = dist.get(n)!;
    const nb: [number, number][] = [
      [wrap(n + 1), 1],
      [wrap(n - 1), 1],
    ];
    for (const sc of SHORTCUTS) {
      const other = sc.a === n ? sc.b : sc.b === n ? sc.a : null;
      if (other === null) continue;
      if (sc.only && !sc.only.includes(id)) continue;
      if (sc.gate && !s.gates[sc.id as "sad" | "maringotka"].open && id !== "avala" && id !== "karel") continue;
      nb.push([other, SHORTCUT_COST]);
    }
    for (const [m, c] of nb) {
      const nd = d + c;
      if (nd < (dist.get(m) ?? Infinity)) {
        dist.set(m, nd);
        queue.push(m);
      }
    }
  }
  return dist.get(to) ?? Infinity;
}
