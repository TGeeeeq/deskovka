import { useCallback, useRef, useState } from "react";
import { RuleError, apply, newGame } from "@engine/game";
import type { Action, GameConfig, GameEvent, GameState } from "@engine/types";
import type { AnimalId } from "@data/types";

export type Setup = { cfg: GameConfig; bots: AnimalId[]; names?: Partial<Record<AnimalId, string>> };

export type Session = {
  setup: Setup;
  initial: GameState;
  state: GameState;
  actions: Action[];
  /** Index první akce, za kterou už nejde vrátit (hod, karta). */
  undoFloor: number;
  log: { seq: number; events: GameEvent[] }[];
};

const SAVE_KEY = "nz.save.v1";

const sealing = (events: GameEvent[]) => events.some((e) => e.e === "dice" || e.e === "weather" || e.e === "event" || (e.e === "need" && e.status === "new") || e.e === "round");

function replay(setup: Setup, actions: Action[]): Session {
  const { state: initial, events } = newGame(setup.cfg);
  let state = initial;
  let undoFloor = 0;
  const log: Session["log"] = [{ seq: 0, events }];
  actions.forEach((a, i) => {
    const r = apply(state, a);
    state = r.state;
    if (sealing(r.events)) undoFloor = i + 1;
    log.push({ seq: i + 1, events: r.events });
  });
  return { setup, initial, state, actions, undoFloor, log };
}

export function loadSaved(): Setup & { actions: Action[] } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v?.setup?.cfg || !Array.isArray(v.actions)) return null;
    return { ...v.setup, actions: v.actions };
  } catch {
    return null;
  }
}

export function clearSaved() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* nic */
  }
}

/** Komprimovaný odkaz na hru (playtest → přesně přehratelný bug report). */
export async function exportGame(s: Session): Promise<string> {
  const json = JSON.stringify({ setup: s.setup, actions: s.actions });
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = "";
  buf.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function importGame(code: string): Promise<(Setup & { actions: Action[] }) | null> {
  try {
    const b64 = code.trim().replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const v = JSON.parse(await new Response(stream).text());
    return { ...v.setup, actions: v.actions };
  } catch {
    return null;
  }
}

export function useSession(onEvents: (events: GameEvent[], state: GameState) => void) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<Session | null>(null);
  const cb = useRef(onEvents);
  cb.current = onEvents;

  const commit = useCallback((s: Session | null) => {
    ref.current = s;
    setSessionState(s);
    if (!s) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ setup: s.setup, actions: s.actions }));
    } catch {
      /* plné úložiště nebo soukromý režim — hra jede dál */
    }
  }, []);

  const start = useCallback(
    (setup: Setup, actions: Action[] = []) => {
      const s = replay(setup, actions);
      commit(s);
      setError(null);
      cb.current(s.log[s.log.length - 1].events, s.state);
    },
    [commit],
  );

  const dispatch = useCallback(
    (a: Action) => {
      const cur = ref.current;
      if (!cur) return false;
      try {
        const r = apply(cur.state, a);
        const actions = [...cur.actions, a];
        commit({
          ...cur,
          state: r.state,
          actions,
          undoFloor: sealing(r.events) ? actions.length : cur.undoFloor,
          log: [...cur.log, { seq: actions.length, events: r.events }],
        });
        setError(null);
        cb.current(r.events, r.state);
        return true;
      } catch (e) {
        if (e instanceof RuleError) {
          setError(e.message);
          return false;
        }
        throw e;
      }
    },
    [commit],
  );

  const undo = useCallback(() => {
    const cur = ref.current;
    if (!cur || cur.actions.length <= cur.undoFloor) return;
    commit(replay(cur.setup, cur.actions.slice(0, -1)));
  }, [commit]);

  const quit = useCallback(() => {
    ref.current = null;
    setSessionState(null);
  }, []);

  return { session, error, setError, start, dispatch, undo, quit, ref };
}
