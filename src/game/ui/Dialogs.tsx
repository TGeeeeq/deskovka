import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ANIMAL_DEFS } from "@data/animals";
import { PROJECT_BY_ID } from "@data/cards/projects";
import { WEATHER_BY_ID } from "@data/cards/weather";
import { TIPS, type TipId } from "@data/tutorial";
import type { AnimalId } from "@data/types";
import { EventCardView, WeatherCardView } from "@art/cards/Cards";
import { AnimalSvg } from "@art/karel/AnimalSvg";
import { orderOptions } from "@engine/game";
import type { Action, GameState } from "@engine/types";
import { nm, spaceName } from "../labels";
import { play } from "../audio";
import { Btn } from "./Btn";
import { Die } from "./Dice";

export function Modal({ open, onClose, children, label }: { open: boolean; onClose?: () => void; children: ReactNode; label: string }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] max-w-[min(96vw,980px)] overflow-auto">
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Sheet({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[22px] bg-cream p-5 shadow-lift">
      <h2 className="mb-3 text-2xl font-bold text-moss-deep">{title}</h2>
      {children}
    </div>
  );
}

/** Rozhodnutí, na které hra čeká (karty, schopnosti). */
export function PendingDialog({ s, dispatch, bot }: { s: GameState; dispatch: (a: Action) => void; bot: boolean }) {
  const p = s.pending;
  if (!p) return null;
  const choose = (i: number) => dispatch({ t: "choose", i });
  const body = (() => {
    switch (p.k) {
      case "pogoSwap":
        return (
          <Sheet title="Pogo na svém kameni">
            <p className="mb-3">Pogo nahlédla na dvě příští karty počasí. Prohodit je?</p>
            <div className="mb-4 flex gap-3">
              {p.cards.map((c) => (
                <WeatherCardView key={c} id={c} mode={{ u: 3 }} />
              ))}
            </div>
            <div className="flex gap-2">
              <Btn onClick={() => choose(0)}>Nechat</Btn>
              <Btn tone="primary" onClick={() => choose(1)}>
                Prohodit
              </Btn>
            </div>
          </Sheet>
        );
      case "avalaPeek":
        return (
          <Sheet title="Avala slyší auto o dvě zatáčky dřív">
            <p className="mb-3">Jednu z příštích Událostí smíte dát pod balíček.</p>
            <div className="mb-4 flex gap-3">
              {p.cards.map((c) => (
                <EventCardView key={c} id={c} mode={{ u: 3 }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => choose(0)}>Nechat obě</Btn>
              <Btn tone="primary" onClick={() => choose(1)}>
                Pod balíček první
              </Btn>
              <Btn tone="primary" onClick={() => choose(2)}>
                Pod balíček druhou
              </Btn>
            </div>
          </Sheet>
        );
      case "yakulCancel":
        return (
          <Sheet title="Yakul se staví mezi počasí a ostatní">
            <div className="mb-4 flex gap-4">
              <WeatherCardView id={p.card} mode={{ u: 3.4 }} />
              <p className="max-w-xs">Jednou za období smí Yakul zrušit zvrat drsné karty. Zásoby z karty se doplní, ale její zvrat neplatí.</p>
            </div>
            <div className="flex gap-2">
              <Btn onClick={() => choose(0)}>Ne, šetřit na později</Btn>
              <Btn tone="primary" onClick={() => choose(1)}>
                Mek! Zrušit zvrat
              </Btn>
            </div>
          </Sheet>
        );
      case "kvetaPremove":
        return (
          <Sheet title="Květa vyráží dřív">
            <p className="mb-3">Kam Květa popojde, než začnou tahy?</p>
            <div className="flex flex-wrap gap-2">
              {p.options.map((n, i) => (
                <Btn key={n} tone={n === s.animals.kveta?.pos ? "secondary" : "primary"} onClick={() => choose(i)}>
                  {n === s.animals.kveta?.pos ? "Zůstat" : spaceName(n)}
                </Btn>
              ))}
            </div>
          </Sheet>
        );
      case "eventKeep":
        return (
          <Sheet title="Přišel pomocník">
            <div className="mb-4 flex gap-4">
              <EventCardView id={p.card} mode={{ u: 3.6 }} />
              <p className="max-w-xs">Zahrát hned, nebo nechat v záloze (nejvýš 2 karty) a zahrát v kterémkoli tahu?</p>
            </div>
            <div className="flex gap-2">
              <Btn tone="primary" onClick={() => choose(0)}>
                Hned
              </Btn>
              <Btn onClick={() => choose(1)}>Do zálohy</Btn>
            </div>
          </Sheet>
        );
      case "discardEvent":
        return (
          <Sheet title="Patricie nám dala šanci">
            <div className="mb-4 flex gap-4">
              <EventCardView id={p.card} mode={{ u: 3.6 }} />
              <p className="max-w-xs">Tuhle Událost smíte zahodit.</p>
            </div>
            <div className="flex gap-2">
              <Btn tone="primary" onClick={() => choose(0)}>
                Vyhodnotit
              </Btn>
              <Btn onClick={() => choose(1)}>Zahodit</Btn>
            </div>
          </Sheet>
        );
      case "project":
        return (
          <Sheet title="Na který projekt?">
            <div className="flex flex-wrap gap-2">
              {p.options.map((id, i) => (
                <Btn key={id} tone="primary" onClick={() => choose(i)}>
                  {PROJECT_BY_ID[id].name} (+{id === "solar" ? p.solarN : p.n} Práce)
                </Btn>
              ))}
            </div>
          </Sheet>
        );
      case "orderWeather": {
        const perms = orderOptions(p.cards);
        return (
          <Sheet title="Tonyho aplikace: seřaď počasí">
            <div className="mb-3 flex gap-3">
              {p.cards.map((c) => (
                <WeatherCardView key={c} id={c} mode={{ u: 2.6 }} />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {perms.map((perm, i) => (
                <Btn key={i} onClick={() => choose(i)} className="justify-start">
                  {perm.map((c) => WEATHER_BY_ID[c].name).join(" → ")}
                </Btn>
              ))}
            </div>
          </Sheet>
        );
      }
    }
  })();
  return (
    <Modal open={!bot} label="Rozhodnutí">
      {body}
    </Modal>
  );
}

/** Bouřkový modul: realtime, všichni najednou, mluví se jen zvířecími zvuky. */
export function StormPanel({ s, dispatch, selected, onSelect, bots }: { s: GameState; dispatch: (a: Action) => void; selected: AnimalId | null; onSelect: (id: AnimalId | null) => void; bots: AnimalId[] }) {
  const limit = s.cfg.stormTime;
  const [left, setLeft] = useState(limit || 0);
  const ended = useRef(false);
  useEffect(() => {
    play("thunder");
    if (!limit) return;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const l = Math.max(0, limit - Math.floor((Date.now() - t0) / 1000));
      setLeft(l);
      if (l % 12 === 0 && l > 0) play("thunder");
      if (l === 0 && !ended.current) {
        ended.current = true;
        clearInterval(iv);
        dispatch({ t: "stormEnd" });
      }
    }, 250);
    return () => clearInterval(iv);
  }, [limit, dispatch]);
  return (
    <section className="rounded-[22px] border-2 border-sky bg-[#e6eef2] p-4 shadow-lift" aria-live="polite">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-sky">⛈ Bouřka!</h2>
        {limit ? <div className={`text-4xl font-bold tabular-nums ${left <= 10 ? "text-terracotta" : "text-ink"}`}>{left}s</div> : <div className="text-sm">bez časomíry</div>}
      </div>
      <p className="mt-1 text-[15px]">Všichni najednou! Schovejte seno na Seník nebo do Maringotky. Mluví se jen zvířecími zvuky. Na jedničku se zvíře lekne hromu — třikrát dupnout a házet znovu.</p>
      <div className="mt-3 grid gap-2">
        {s.seat.map((id) => {
          const m = s.storm?.[id];
          if (!m) return null;
          const isBot = bots.includes(id);
          return (
            <div key={id} className={`flex items-center gap-3 rounded-[14px] border p-2 ${selected === id ? "border-moss bg-surface" : "border-border bg-surface/70"}`}>
              <div className="h-10 w-12 shrink-0">
                <AnimalSvg id={id} className="h-full w-full" />
              </div>
              <div className="w-20 font-semibold">
                {nm(id)}
                <div className="text-xs text-text-muted">{ANIMAL_DEFS[id].sound}</div>
              </div>
              {m.stopped ? (
                <span className="text-sm">stojí a chrání okolí</span>
              ) : m.die !== null ? (
                <>
                  <Die value={m.die} rollKey={m.rolls} size={40} tone="move" />
                  <span className="text-sm">{isBot ? "běží…" : selected === id ? "klepni na pole" : <button className="font-semibold text-moss underline" onClick={() => onSelect(id)}>vybrat a jít</button>}</span>
                </>
              ) : (
                <Btn tone="primary" disabled={isBot} onClick={() => { play("dice"); onSelect(id); dispatch({ t: "stormRoll", animal: id }); }}>
                  🎲 Hoď {m.stomp ? `(dupnuto ${m.stomp}×)` : ""}
                </Btn>
              )}
              {id === "yakul" && !m.stopped && !isBot ? (
                <Btn tone="accent" onClick={() => dispatch({ t: "stormMek" })}>
                  Mek!
                </Btn>
              ) : null}
            </div>
          );
        })}
      </div>
      <Btn tone="secondary" className="mt-3 w-full" onClick={() => dispatch({ t: "stormEnd" })}>
        Bouřka přešla →
      </Btn>
    </section>
  );
}

/** Karel radí — tip se ukáže jednou, pak už jen na vyžádání. */
export function KarelGuide({ tip, onClose }: { tip: TipId | null; onClose: () => void }) {
  const t = tip ? TIPS[tip] : null;
  return (
    <AnimatePresence>
      {t ? (
        <motion.aside
          key={tip}
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -40, opacity: 0 }}
          className="pointer-events-auto fixed bottom-3 left-3 z-40 flex max-w-[min(92vw,460px)] items-end gap-2 lg:left-auto lg:right-3 lg:max-w-[392px]"
          aria-live="polite"
        >
          <div className="h-24 w-28 shrink-0 karel-walking">
            <AnimalSvg id="karel" className="h-full w-full" />
          </div>
          <div className="relative rounded-[18px] border border-border bg-surface p-3 shadow-lift">
            <div className="text-base font-bold text-moss-deep">{t.title}</div>
            <p className="text-[15px] leading-snug">{t.text}</p>
            {t.quip ? <p className="mt-1 text-sm italic text-text-muted">{t.quip}</p> : null}
            <div className="mt-2 text-right">
              <button className="min-h-10 rounded-full bg-moss px-4 text-sm font-semibold text-cream" onClick={onClose}>
                Rozumím
              </button>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
