import { useMemo, useState } from "react";
import { ANIMAL_DEFS, UNLOCK_COST } from "@data/animals";
import { STATIONS, stationAt } from "@data/board";
import { ITEMS, isProduct } from "@data/items";
import { strengthOf } from "@data/rules";
import type { AnimalId, ItemId } from "@data/types";
import { AnimalSvg } from "@art/karel/AnimalSvg";
import { HeartIcon, ItemIcon, Marker } from "@art/icons/Icons";
import { capacity, effectiveMove, giftOk, load, strength } from "@engine/game";
import type { Action, GameState } from "@engine/types";
import { actionLabel, nm } from "../labels";
import { Btn } from "./Btn";
import { Die } from "./Dice";

export function Cargo({ s, id, compact }: { s: GameState; id: AnimalId; compact?: boolean }) {
  const a = s.animals[id]!;
  const items = (Object.entries(a.cargo) as [ItemId, number][]).filter(([, n]) => n > 0);
  const cap = capacity(s, a);
  const used = load(a);
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={`Náklad ${used} z ${cap}`}>
      {items.map(([k, n]) => (
        <span key={k} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm ${isProduct(k) ? "border-amber bg-[#fff4dc]" : "border-border bg-surface"}`}>
          <ItemIcon id={k} size={compact ? 16 : 20} />
          <b>{n}</b>
          {!compact ? <span className="text-text-muted">{ITEMS[k].name}</span> : null}
        </span>
      ))}
      {a.lucinka ? <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-sm">🐑 Lucinka</span> : null}
      {s.wheelbarrow.carrier === id ? <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-sm">🛞 Kolečko</span> : null}
      {Array.from({ length: Math.max(0, cap - used) }, (_, i) => (
        <span key={i} className="inline-block h-5 w-5 rounded-full border border-dashed border-text-muted/40" aria-hidden />
      ))}
    </div>
  );
}

export function Hearts({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} srdíček`}>
      {Array.from({ length: Math.max(n, 0) }, (_, i) => (
        <HeartIcon key={i} size={18} />
      ))}
      {n === 0 ? <span className="text-sm text-text-muted">0 ♥</span> : null}
    </span>
  );
}

function ActiveHeader({ s, id, bot }: { s: GameState; id: AnimalId; bot: boolean }) {
  const d = ANIMAL_DEFS[id];
  const a = s.animals[id]!;
  const st = stationAt(a.pos);
  return (
    <div className="flex items-center gap-3">
      <div className="h-16 w-20 shrink-0">
        <AnimalSvg id={id} className="h-full w-full" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Marker id={id} size={24} />
          <h2 className="text-2xl font-bold leading-none text-moss-deep">{d.name}</h2>
          {bot ? <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold">bot</span> : null}
        </div>
        <div className="mt-1 text-sm text-text-muted">
          {st ? STATIONS[st].name : `pole ${a.pos}`} · <Hearts n={a.hearts} /> {a.unlocked ? "· odemčeno ✨" : ""}
        </div>
      </div>
    </div>
  );
}

const MAIN = new Set(["gather", "gatherCraft", "craft", "work", "rest", "openGate", "scout", "edge", "care", "clearBranch"]);

/** Akce zúžené na rozumný výběr: u sbírání jen největší dávky. */
function pickMain(legal: Action[]) {
  const mains = legal.filter((a) => MAIN.has(a.t));
  const gathers = mains.filter((a) => a.t === "gather") as Extract<Action, { t: "gather" }>[];
  const max = Math.max(0, ...gathers.map((g) => Object.values(g.take).reduce((x, y) => x + (y ?? 0), 0)));
  const keep = gathers.filter((g) => Object.values(g.take).reduce((x, y) => x + (y ?? 0), 0) >= Math.max(1, max - 1));
  const gc = (mains.filter((a) => a.t === "gatherCraft") as Extract<Action, { t: "gatherCraft" }>[]).slice(0, 3);
  return [...mains.filter((a) => a.t !== "gather" && a.t !== "gatherCraft"), ...gc, ...keep.slice(0, 5)];
}

export function TurnPanel({ s, legal, dispatch, bot, rollKey }: { s: GameState; legal: Action[]; dispatch: (a: Action) => void; bot: boolean; rollKey: number }) {
  const t = s.turn!;
  const a = s.animals[t.animal]!;
  const has = (k: Action["t"]) => legal.some((x) => x.t === k);
  const [giftOpen, setGiftOpen] = useState(false);
  const mains = useMemo(() => pickMain(legal), [legal]);
  const helpers = legal.filter((x) => x.t === "help") as Extract<Action, { t: "help" }>[];
  const free = legal.filter((x) => !MAIN.has(x.t) && !["roll", "assign", "reroll", "move", "help", "endTurn", "skipAction"].includes(x.t));

  return (
    <section className="rounded-[22px] border border-border bg-surface p-4 shadow-soft" aria-live="polite">
      <ActiveHeader s={s} id={t.animal} bot={bot} />
      <div className="mt-3">
        <Cargo s={s} id={t.animal} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {t.stage === "roll" ? (
          <Btn tone="primary" big disabled={bot} onClick={() => dispatch({ t: "roll" })}>
            🎲 Hodit {t.noMove ? "kostkou (po bouřce se nechodí)" : "dvěma kostkami"}
          </Btn>
        ) : null}

        {t.dice.length ? (
          <div className="flex items-center gap-4 rounded-[14px] bg-surface-alt p-3">
            {t.dice.map((v, i) => {
              const tone = t.moveDie !== null ? (i === t.dice.indexOf(t.moveDie) && (t.dice[0] !== t.dice[1] || i === 0) ? "move" : "str") : t.noMove ? "str" : "plain";
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <Die value={v} rollKey={rollKey * 10 + i} tone={tone} />
                  {t.stage === "assign" && has("reroll") && !bot ? (
                    <button className="text-xs font-semibold text-terracotta underline" onClick={() => dispatch({ t: "reroll", die: i })}>
                      přehodit {a.rerollFree ? "(zdarma)" : "(−♥)"}
                    </button>
                  ) : null}
                </div>
              );
            })}
            {t.moveDie !== null || t.noMove ? (
              <div className="text-sm leading-snug">
                {!t.noMove ? (
                  <div>
                    <b className="text-moss">Pohyb:</b> {effectiveMove(s, t.animal, t.moveDie ?? 0)} {t.moved ? `(ušel ${t.moved})` : ""}
                  </div>
                ) : null}
                <div>
                  <b className="text-terracotta">Síla:</b> {strength(s, "other") || strengthOf(t.strDie ?? 1)}
                  {t.helper ? ` (s pomocí: ${nm(t.helper)})` : ""}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {t.stage === "assign" && !bot ? (
          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map((m) => (
              <Btn key={m} tone="primary" onClick={() => dispatch({ t: "assign", move: m })}>
                Jdu o {effectiveMove(s, t.animal, t.dice[m])} · síla {strengthOf(t.dice[1 - m])}
              </Btn>
            ))}
          </div>
        ) : null}

        {t.stage === "move" && !bot ? (
          <div className="rounded-[14px] bg-accent/40 p-3 text-[15px]">
            Klepni na <b>zvýrazněné pole</b> na desce.{" "}
            <button className="font-semibold text-moss underline" onClick={() => dispatch({ t: "move", to: a.pos })}>
              Zůstat tady
            </button>
          </div>
        ) : null}

        {t.stage === "act" && !bot ? (
          <div className="flex flex-col gap-2">
            {helpers.length ? (
              <div className="flex flex-wrap gap-2">
                {helpers.map((h) => (
                  <Btn key={h.helper} tone="accent" onClick={() => dispatch(h)}>
                    🤝 {actionLabel(s, h)}
                  </Btn>
                ))}
              </div>
            ) : null}
            {mains.map((m, i) => (
              <Btn key={i} tone="primary" className="justify-start text-left" onClick={() => dispatch(m)}>
                {actionLabel(s, m)}
              </Btn>
            ))}
            <Btn tone="ghost" onClick={() => dispatch({ t: "skipAction" })}>
              Bez akce
            </Btn>
          </div>
        ) : null}

        {(t.stage === "act" || t.stage === "end" || t.stage === "move") && !bot && free.length ? (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted">Kdykoli v tahu</div>
            <div className="flex flex-wrap gap-2">
              {free.map((f, i) => (
                <Btn key={i} tone={f.t === "deliver" || f.t === "fulfill" ? "accent" : "secondary"} onClick={() => dispatch(f)}>
                  {actionLabel(s, f)}
                </Btn>
              ))}
            </div>
          </div>
        ) : null}

        {(t.stage === "act" || t.stage === "end") && !bot ? (
          <div className="flex flex-wrap gap-2">
            <Btn tone="ghost" onClick={() => setGiftOpen((v) => !v)}>
              🎁 Dary
            </Btn>
            <Btn tone="primary" big className="flex-1" onClick={() => dispatch({ t: "endTurn" })}>
              Konec tahu →
            </Btn>
          </div>
        ) : null}
        {giftOpen ? <GiftBox s={s} dispatch={dispatch} /> : null}
        {!a.unlocked && a.hearts >= UNLOCK_COST && !bot ? <p className="text-sm text-moss">Máš {a.hearts} srdíčka — můžeš odemknout druhou schopnost.</p> : null}
      </div>
    </section>
  );
}

function GiftBox({ s, dispatch }: { s: GameState; dispatch: (a: Action) => void }) {
  const me = s.animals[s.turn!.animal]!;
  const others = s.seat.filter((id) => id !== me.id).map((id) => s.animals[id]!);
  const near = others.filter((o) => giftOk(s, me, o));
  if (!near.length) return <p className="text-sm text-text-muted">Nikdo není dost blízko na dar (stejné nebo sousední pole).</p>;
  return (
    <div className="flex flex-col gap-2 rounded-[14px] bg-surface-alt p-3">
      {near.map((o) => (
        <div key={o.id} className="flex flex-wrap items-center gap-2 text-sm">
          <b className="w-16">{nm(o.id)}</b>
          {(Object.entries(me.cargo) as [ItemId, number][]).map(([k]) => (
            <button key={`g${k}`} className="rounded-full border border-border bg-surface px-2 py-1" onClick={() => dispatch({ t: "give", from: me.id, to: o.id, item: k, n: 1 })}>
              dát <ItemIcon id={k} size={16} />
            </button>
          ))}
          {(Object.entries(o.cargo) as [ItemId, number][]).map(([k]) => (
            <button key={`t${k}`} className="rounded-full border border-border bg-surface px-2 py-1" onClick={() => dispatch({ t: "give", from: o.id, to: me.id, item: k, n: 1 })}>
              vzít <ItemIcon id={k} size={16} />
            </button>
          ))}
          {me.hearts > 0 ? (
            <button className="rounded-full border border-border bg-surface px-2 py-1" onClick={() => dispatch({ t: "giveHeart", from: me.id, to: o.id })}>
              dát <HeartIcon size={14} />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
