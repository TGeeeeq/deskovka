import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { STATIONS } from "@data/board";
import { WEATHER_BY_ID, WEATHER_ICON_NAME } from "@data/cards/weather";
import { EventCardView, NeedCardView, WeatherCardView } from "@art/cards/Cards";
import { WeatherGlyph } from "@art/icons/Icons";
import { Board } from "@art/board/Board";
import { inward, spaceXY } from "@art/board/geometry";
import { SEASON_NAME } from "@data/rules";
import type { AnimalId } from "@data/types";
import type { TipId } from "@data/tutorial";
import { botNextAction } from "@engine/bot";
import { effectiveMove } from "@engine/game";
import { isLegal, legalActions } from "@engine/legal";
import { reachable, wrap } from "@engine/move";
import type { Action, GameEvent, GameState } from "@engine/types";
import { isMuted, play, setMuted } from "./audio";
import { Btn } from "./ui/Btn";
import { KarelGuide, Modal, PendingDialog, StormPanel } from "./ui/Dialogs";
import { InfoTabs } from "./ui/InfoTabs";
import { Floaties, Pawns, type Floaty, type MoveAnim } from "./ui/Pawns";
import { TurnPanel } from "./ui/TurnPanel";
import { exportGame, useSession, type Setup } from "./session";
import { EndScreen } from "./EndScreen";

const TIP_KEY = "nz.tips.seen";
/** ?rychlost=10 zrychlí boty i automatické karty (testy, prezentace). */
const SPEED = (() => {
  try {
    return Math.max(1, Number(new URLSearchParams(location.search).get("rychlost")) || 1);
  } catch {
    return 1;
  }
})();
function seenTips(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(TIP_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function markTip(id: string) {
  try {
    const s = seenTips();
    s.add(id);
    localStorage.setItem(TIP_KEY, JSON.stringify([...s]));
  } catch {
    /* nic */
  }
}

/** Kdo teď rozhoduje — podle toho se pozná, jestli hraje bot. */
function decider(s: GameState): AnimalId | null {
  const p = s.pending;
  if (p) {
    if (p.k === "pogoSwap") return "pogo";
    if (p.k === "avalaPeek") return "avala";
    if (p.k === "yakulCancel") return "yakul";
    if (p.k === "kvetaPremove") return "kveta";
    if (p.k === "eventKeep" || p.k === "discardEvent") return p.actor;
    return s.turn?.animal ?? s.hat;
  }
  return s.turn?.animal ?? null;
}

/** Schopnosti, které jdou použít mimo seznam kandidátů (chrochtání, hýkání, kohout). */
function abilityActions(s: GameState): Action[] {
  const out: Action[] = [];
  if (!s.turn || s.pending) return out;
  const f = s.animals.flicek;
  if (f?.unlocked && !f.usedGrunt) {
    out.push({ t: "grunt", kind: "food" }, { t: "grunt", kind: "luck" });
    for (const id of s.seat) if (id !== "flicek") out.push({ t: "grunt", kind: "scratch", target: id });
  }
  if (s.turn.animal === "karel") for (const id of s.seat) if (id !== "karel") out.push({ t: "hykani", target: id });
  for (const id of s.seat) {
    const a = s.animals[id]!;
    if (a.freeStep > 0) for (const to of reachable(s, id, a.freeStep).keys()) if (to !== a.pos) out.push({ t: "freeStep", animal: id, to });
  }
  if (s.wheelbarrow.carrier === s.turn.animal) out.push({ t: "dropWheelbarrow" });
  for (const st of ["zahradka", "sad", "louka"] as const) out.push({ t: "fertilize", station: st });
  return out.filter((a) => isLegal(s, a));
}

export function GameScreen({ setup, resume, onExit, onTitle }: { setup: Setup; resume?: Action[]; onExit: () => void; onTitle: () => void }) {
  const [moves, setMoves] = useState<Partial<Record<AnimalId, MoveAnim>>>({});
  const [floaties, setFloaties] = useState<Floaty[]>([]);
  const [popup, setPopup] = useState<ReactNode>(null);
  const [zoom, setZoom] = useState<ReactNode>(null);
  const [tip, setTip] = useState<TipId | null>(null);
  const [guide, setGuide] = useState(() => {
    try {
      return localStorage.getItem("nz.guide") !== "off";
    } catch {
      return true;
    }
  });
  const [muted, setMutedState] = useState(isMuted());
  const [stormSel, setStormSel] = useState<AnimalId | null>(null);
  const [rollKey, setRollKey] = useState(0);
  const [menu, setMenu] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const nonce = useRef(1);
  const tipQueue = useRef<TipId[]>([]);
  const guideRef = useRef(guide);
  guideRef.current = guide;

  const wantTip = useCallback((id: TipId) => {
    if (!guideRef.current) return;
    if (seenTips().has(id) || tipQueue.current.includes(id)) return;
    tipQueue.current.push(id);
    setTip((cur) => cur ?? tipQueue.current[0] ?? null);
  }, []);
  const closeTip = () => {
    if (tip) markTip(tip);
    tipQueue.current = tipQueue.current.filter((x) => x !== tip);
    setTip(tipQueue.current[0] ?? null);
  };

  const onEvents = useCallback(
    (events: GameEvent[], s: GameState) => {
      const fl: Floaty[] = [];
      for (const e of events) {
        if (e.e === "moved") {
          setMoves((m) => ({ ...m, [e.animal]: { path: e.path, nonce: nonce.current++ } }));
          play("step");
        } else if (e.e === "dice") {
          setRollKey((k) => k + 1);
          play("dice");
        } else if (e.e === "gained" && e.animal) {
          const p = typeof e.from === "string" && e.from in STATIONS ? inward(STATIONS[e.from as keyof typeof STATIONS].space, 6) : spaceXY(s.animals[e.animal]!.pos);
          fl.push({ key: nonce.current++, x: p.x, y: p.y - 10, item: e.item, n: e.n });
          play("gain");
        } else if (e.e === "crafted") {
          const p = spaceXY(s.animals[e.animal]!.pos);
          fl.push({ key: nonce.current++, x: p.x, y: p.y - 18, item: e.product, n: e.n });
          play("gain");
        } else if (e.e === "delivered") {
          fl.push({ key: nonce.current++, x: 250, y: 220, text: "do spíže!", n: 0 });
          play("deliver");
          wantTip("senik");
        } else if (e.e === "hearts" && e.n > 0) {
          const p = spaceXY(s.animals[e.animal]!.pos);
          fl.push({ key: nonce.current++, x: p.x + 8, y: p.y - 22, text: `+${e.n}♥`, n: e.n });
          play("heart");
          wantTip("hearts");
        } else if (e.e === "weather") {
          const c = WEATHER_BY_ID[e.card];
          setPopup(<WeatherCardView id={e.card} mode={{ u: 5 }} />);
          play(c.icon === "bourka" ? "thunder" : c.icon === "dest" ? "rain" : "card");
          if (c.icon === "dest") wantTip("rain");
        } else if (e.e === "event") {
          setPopup(<EventCardView id={e.card} mode={{ u: 5 }} />);
          play("card");
          wantTip("event");
        } else if (e.e === "need" && e.status === "new") {
          setPopup(<NeedCardView id={e.card} mode={{ u: 5 }} />);
          play("card");
          wantTip("need");
        } else if (e.e === "need" && e.status === "done") {
          play("deliver");
        } else if (e.e === "need" && e.status === "failed") {
          play("fail");
        } else if (e.e === "project" && e.status === "done") {
          play("bray");
        } else if (e.e === "season") {
          play("season");
          wantTip("season");
        } else if (e.e === "storm" && e.status === "start") {
          wantTip("storm");
        } else if (e.e === "unlock") {
          play("win");
        } else if (e.e === "over") {
          play("bray");
        }
      }
      if (fl.length) {
        setFloaties((cur) => [...cur.slice(-12), ...fl]);
        const keys = new Set(fl.map((f) => f.key));
        setTimeout(() => setFloaties((cur) => cur.filter((f) => !keys.has(f.key))), 1800);
      }
    },
    [wantTip],
  );

  const { session, error, setError, start, dispatch, undo } = useSession(onEvents);

  useEffect(() => {
    start(setup, resume ?? []);
    wantTip("welcome");
  }, [setup, resume, start, wantTip]);

  const s = session?.state ?? null;
  const legal = useMemo(() => (s ? [...legalActions(s), ...abilityActions(s)] : []), [s]);
  const who = s ? decider(s) : null;
  const botTurn = !!s && !!who && setup.bots.includes(who) && s.phase !== "storm";

  // Tipy podle fáze tahu
  useEffect(() => {
    if (!s?.turn || botTurn) return;
    const st = s.turn.stage;
    if (st === "roll") wantTip("roll");
    if (st === "assign") wantTip("assign");
    if (st === "move") wantTip("move");
    if (st === "act") {
      wantTip("act");
      if (legal.some((a) => a.t === "help")) wantTip("help");
      if (legal.some((a) => a.t === "unlock")) wantTip("unlock");
    }
    if (s.pending?.k === "kvetaPremove") wantTip("kveta");
  }, [s, botTurn, legal, wantTip]);

  // Bot hraje s prodlevou, ať se dá sledovat
  useEffect(() => {
    if (!s || s.phase === "over" || popup) return;
    if (s.phase === "storm") {
      const humans = s.seat.filter((id) => !setup.bots.includes(id));
      const botIds = s.seat.filter((id) => setup.bots.includes(id));
      for (const id of botIds) {
        const m = s.storm?.[id];
        if (!m || m.stopped) continue;
        if (m.die !== null || m.rolls < 4) {
          const t = setTimeout(() => {
            const a = botNextAction({ ...s, storm: { [id]: s.storm![id]! } }, { stormRolls: 4 });
            if (a && a.t !== "stormEnd") dispatch(a);
          }, 650 / SPEED);
          return () => clearTimeout(t);
        }
      }
      if (!humans.length) {
        const t = setTimeout(() => dispatch({ t: "stormEnd" }), 700 / SPEED);
        return () => clearTimeout(t);
      }
      return;
    }
    if (!botTurn) return;
    const t = setTimeout(() => {
      const a = botNextAction(s);
      if (a) dispatch(a);
    }, (s.turn?.stage === "roll" ? 650 : 900) / SPEED);
    return () => clearTimeout(t);
  }, [s, botTurn, popup, dispatch, setup.bots]);

  // Karta počasí/události sama zmizí
  useEffect(() => {
    if (!popup) return;
    const t = setTimeout(() => setPopup(null), 2600 / SPEED);
    return () => clearTimeout(t);
  }, [popup]);

  if (!s || !session) return null;
  if (s.phase === "over" && s.result) return <EndScreen s={s} setup={setup} onAgain={onExit} onTitle={onTitle} />;

  const t = s.turn;
  const highlight: number[] = [];
  let onSpace: ((n: number) => void) | undefined;
  if (s.phase === "storm" && stormSel && s.storm?.[stormSel]?.die) {
    const die = s.storm[stormSel]!.die!;
    highlight.push(...reachable(s, stormSel, die).keys());
    onSpace = (n) => {
      dispatch({ t: "stormMove", animal: stormSel, to: n });
      setStormSel(null);
    };
  } else if (s.pending?.k === "kvetaPremove" && !botTurn) {
    highlight.push(...s.pending.options);
    const opts = s.pending.options;
    onSpace = (n) => dispatch({ t: "choose", i: opts.indexOf(n) });
  } else if (t?.stage === "move" && !botTurn) {
    highlight.push(...reachable(s, t.animal, effectiveMove(s, t.animal, t.moveDie ?? 0)).keys());
    onSpace = (n) => dispatch({ t: "move", to: n });
  }
  const wx = s.weather.id ? WEATHER_BY_ID[s.weather.id] : null;
  const canUndo = session.actions.length > session.undoFloor;

  return (
    <div className="min-h-dvh bg-cream lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1fr)_400px] lg:overflow-hidden">
      <div className="relative flex items-center justify-center p-2 lg:p-4">
        <Board
          className="aspect-square h-auto max-h-[calc(100dvh-1rem)] w-full max-w-[calc(100dvh-1rem)] drop-shadow-[0_20px_40px_rgba(31,61,42,.25)]"
          highlight={highlight}
          onSpace={onSpace}
          gates={s.gates}
          branches={s.branches}
          supply={s.stations}
          pantry={s.pantry}
          target={s.target}
          season={s.season}
          round={s.round}
          rounds={s.roundsPerSeason}
        >
          <Pawns s={s} moves={moves} />
          <Floaties items={floaties} />
        </Board>
      </div>

      <aside className="flex flex-col gap-3 p-3 lg:overflow-y-auto lg:p-4" aria-label="Ovládání hry">
        <header className="flex items-center gap-2 rounded-[22px] bg-moss px-3 py-2 text-cream shadow-soft">
          <button className="flex items-center gap-2 text-left" onClick={() => wx && setZoom(<WeatherCardView id={wx.id} mode={{ u: 5.4 }} />)} aria-label="Zobrazit počasí">
            {wx ? <WeatherGlyph icon={s.turn?.icon ?? wx.icon} size={40} /> : null}
            <div className="leading-tight">
              <div className="text-xs uppercase tracking-wider text-accent">
                {SEASON_NAME[s.season]} · kolo {s.round}/{s.roundsPerSeason}
              </div>
              <div className="font-serif text-lg font-bold">{wx?.name ?? "—"}</div>
              <div className="text-xs opacity-80">{wx ? `${WEATHER_ICON_NAME[s.turn?.icon ?? wx.icon]}${s.weather.canceled ? " · zvrat zrušen" : ""}` : ""}</div>
            </div>
          </button>
          <div className="ml-auto flex gap-1">
            <button className="grid h-11 w-11 place-items-center rounded-full bg-moss-deep" onClick={undo} disabled={!canUndo} aria-label="Vrátit tah" title="Vrátit (ne přes hod ani kartu)">
              ↶
            </button>
            <button
              className="grid h-11 w-11 place-items-center rounded-full bg-moss-deep"
              onClick={() => {
                setMuted(!muted);
                setMutedState(!muted);
              }}
              aria-label={muted ? "Zapnout zvuk" : "Vypnout zvuk"}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <button className="grid h-11 w-11 place-items-center rounded-full bg-moss-deep" onClick={() => setMenu(true)} aria-label="Nabídka">
              ☰
            </button>
          </div>
        </header>

        {wx && (s.weather.mods.length && !s.weather.canceled) ? <p className="rounded-[14px] bg-surface-alt px-3 py-2 text-sm">{wx.text}</p> : null}
        {s.weather.mods.some((m) => m.k === "chooseIcon") && t && !t.acted && !botTurn ? (
          <div className="flex gap-2">
            <Btn onClick={() => dispatch({ t: "icon", icon: "slunce" })}>☀ Svítí mi</Btn>
            <Btn onClick={() => dispatch({ t: "icon", icon: "dest" })}>🌧 Prší mi</Btn>
          </div>
        ) : null}
        {error ? (
          <div role="alert" className="flex items-center justify-between rounded-[14px] bg-[#f5d9cc] px-3 py-2 text-sm">
            {error}
            <button onClick={() => setError(null)} aria-label="Zavřít">
              ✕
            </button>
          </div>
        ) : null}

        {s.phase === "storm" ? <StormPanel s={s} dispatch={dispatch} selected={stormSel} onSelect={setStormSel} bots={setup.bots} /> : null}
        {s.phase === "turn" && t && !s.pending ? <TurnPanel s={s} legal={legal} dispatch={dispatch} bot={botTurn} rollKey={rollKey} /> : null}
        {s.pending && botTurn ? <p className="rounded-[14px] bg-surface p-3 text-sm">Bot přemýšlí…</p> : null}

        <InfoTabs s={s} log={session.log} onCard={setZoom} />
        <p className="px-2 text-xs text-text-muted">
          Hra se ukládá jen v tomto zařízení (klíč nz.save.v1 v úložišti prohlížeče). Nic se neposílá na server.
        </p>
      </aside>

      <PendingDialog s={s} dispatch={dispatch} bot={botTurn} />
      <Modal open={!!popup} onClose={() => setPopup(null)} label="Karta">
        <div className="drop-shadow-2xl">{popup}</div>
      </Modal>
      <Modal open={!!zoom} onClose={() => setZoom(null)} label="Detail karty">
        <div onClick={() => setZoom(null)}>{zoom}</div>
      </Modal>
      <Modal open={menu} onClose={() => setMenu(false)} label="Nabídka">
        <div className="flex w-[min(92vw,420px)] flex-col gap-2 rounded-[22px] bg-cream p-5 shadow-lift">
          <h2 className="text-2xl font-bold text-moss-deep">Nabídka</h2>
          <Btn
            onClick={() => {
              const next = !guide;
              setGuide(next);
              try {
                localStorage.setItem("nz.guide", next ? "on" : "off");
              } catch {
                /* nic */
              }
            }}
          >
            Karlův průvodce: {guide ? "zapnutý" : "vypnutý"}
          </Btn>
          <Btn
            onClick={() => {
              try {
                localStorage.removeItem(TIP_KEY);
              } catch {
                /* nic */
              }
              wantTip("welcome");
              setMenu(false);
            }}
          >
            Zopakovat Karlovy rady
          </Btn>
          <Btn onClick={async () => setExported(await exportGame(session))}>Exportovat hru (pro playtest)</Btn>
          {exported ? (
            <textarea readOnly className="h-24 rounded-[14px] border border-border p-2 text-xs" value={`${location.origin}${location.pathname}#hra=${exported}`} onFocus={(e) => e.currentTarget.select()} />
          ) : null}
          <Btn tone="danger" onClick={onTitle}>
            Uložit a odejít do menu
          </Btn>
        </div>
      </Modal>
      <KarelGuide tip={popup ? null : tip} onClose={closeTip} />
      <span className="sr-only" aria-live="polite">
        {t ? `Na tahu ${t.animal}` : ""}
      </span>
      <span hidden>{wrap(1)}</span>
    </div>
  );
}
