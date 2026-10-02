import { useEffect, useRef, useState } from "react";
import { ANIMAL_DEFS } from "@data/animals";
import { WEATHER_BY_ID } from "@data/cards/weather";
import { SEASON_NAME, TIER_TEXT } from "@data/rules";
import { Board } from "@art/board/Board";
import { WeatherCardView } from "@art/cards/Cards";
import { AnimalSvg } from "@art/karel/AnimalSvg";
import { botNextAction } from "@engine/bot";
import { apply, newGame } from "@engine/game";
import type { AnimalId } from "@data/types";
import type { GameState } from "@engine/types";
import { Pawns, type MoveAnim } from "../game/ui/Pawns";
import { eventText } from "../game/labels";
import { Die } from "../game/ui/Dice";

const TEAM: AnimalId[] = ["karel", "pogo", "kveta", "yakul"];
const fresh = () => newGame({ animals: TEAM, difficulty: "normalni", storm: true, stormTime: 60, expert: false, seed: `prezentace-${Date.now()}` }).state;

/** Boti hrají skutečnou hru na skutečné desce. Běží, jen když je vidět. */
export function LiveDemo() {
  const host = useRef<HTMLDivElement>(null);
  const [s, setS] = useState<GameState>(() => fresh());
  const [visible, setVisible] = useState(false);
  const [moves, setMoves] = useState<Partial<Record<AnimalId, MoveAnim>>>({});
  const [line, setLine] = useState("Karel se rozhlíží. …Zima je ještě daleko. Zatím.");
  const [roll, setRoll] = useState(0);
  const nonce = useRef(1);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(
      () => {
        if (s.phase === "over") {
          setS(fresh());
          return;
        }
        const a = botNextAction(s, { stormRolls: 3 });
        if (!a) return;
        const r = apply(s, a);
        for (const e of r.events) {
          if (e.e === "moved") setMoves((m) => ({ ...m, [e.animal]: { path: e.path, nonce: nonce.current++ } }));
          if (e.e === "dice") setRoll((k) => k + 1);
          const txt = eventText(r.state, e);
          if (txt && e.e !== "hearts" && e.e !== "gained") setLine(txt);
        }
        setS(r.state);
      },
      s.phase === "over" ? 6000 : 720,
    );
    return () => clearTimeout(t);
  }, [s, visible]);

  const t = s.turn;
  const wx = s.weather.id ? WEATHER_BY_ID[s.weather.id] : null;
  return (
    <div ref={host} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-[18px] bg-[#2b4a35] p-2 shadow-lift">
        <Board className="block w-full" gates={s.gates} branches={s.branches} supply={s.stations} pantry={s.pantry} target={s.target} season={s.season} round={s.round} rounds={s.roundsPerSeason}>
          <Pawns s={s} moves={moves} />
        </Board>
      </div>
      <aside className="flex flex-col gap-4" aria-live="polite">
        <div className="rounded-[22px] bg-cream p-4 text-ink">
          <div className="text-xs font-bold uppercase tracking-wider text-terracotta">
            {SEASON_NAME[s.season]} · kolo {s.round}
          </div>
          {s.phase === "over" && s.result ? (
            <div className="mt-2">
              <div className="font-serif text-3xl font-bold text-moss-deep">{TIER_TEXT[s.result.tier].name}</div>
              <div className="mt-1">{s.result.stars} ★ · za chvíli začne nová hra</div>
            </div>
          ) : t ? (
            <div className="mt-2 flex items-center gap-3">
              <div className="h-14 w-16">
                <AnimalSvg id={t.animal} className="h-full w-full" />
              </div>
              <div>
                <div className="font-serif text-2xl font-bold">{ANIMAL_DEFS[t.animal].name}</div>
                <div className="flex gap-1">{t.dice.map((v, i) => <Die key={i} value={v} rollKey={roll * 10 + i} size={34} />)}</div>
              </div>
            </div>
          ) : s.phase === "storm" ? (
            <div className="mt-2 font-serif text-2xl font-bold text-sky">⛈ Bouřka — všichni běží!</div>
          ) : null}
          <p className="mt-3 min-h-12 text-[15px] leading-snug">{line}</p>
        </div>
        {wx ? (
          <div className="hidden justify-center lg:flex">
            <WeatherCardView id={wx.id} mode={{ u: 3.6 }} />
          </div>
        ) : null}
      </aside>
    </div>
  );
}
