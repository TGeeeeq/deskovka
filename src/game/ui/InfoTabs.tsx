import { useState } from "react";
import { ANIMAL_DEFS } from "@data/animals";
import { STATIONS, stationAt } from "@data/board";
import { EVENT_BY_ID } from "@data/cards/events";
import { AnimalBoardView, EventCardView, NeedCardView, ProjectCardView } from "@art/cards/Cards";
import { Marker } from "@art/icons/Icons";
import { AnimalSvg } from "@art/karel/AnimalSvg";
import type { GameEvent, GameState } from "@engine/types";
import type { AnimalId } from "@data/types";
import { eventText } from "../labels";
import { Cargo, Hearts } from "./TurnPanel";

type Tab = "needs" | "projects" | "animals" | "log";

export function InfoTabs({ s, log, onCard }: { s: GameState; log: { seq: number; events: GameEvent[] }[]; onCard: (node: React.ReactNode) => void }) {
  const [tab, setTab] = useState<Tab>("needs");
  const tabs: [Tab, string][] = [
    ["needs", `Potřeby (${s.needs.length})`],
    ["projects", "Projekty"],
    ["animals", "Zvířata"],
    ["log", "Historie"],
  ];
  return (
    <section className="rounded-[22px] border border-border bg-surface p-3 shadow-soft">
      <div role="tablist" className="flex gap-1 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`min-h-10 whitespace-nowrap rounded-full px-3 text-sm font-semibold ${tab === id ? "bg-moss text-cream" : "bg-surface-alt text-ink"}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {tab === "needs" ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {s.needs.length === 0 ? <p className="text-sm text-text-muted">Teď nikdo nic nepotřebuje. …Zatím.</p> : null}
            {s.needs.map((n) => (
              <button key={n.id} onClick={() => onCard(<NeedCardView id={n.id} due={n.due} mode={{ u: 5.4 }} />)} aria-label={`Potřeba, zvětšit`}>
                <NeedCardView id={n.id} due={n.due} mode={{ u: 2.6 }} />
              </button>
            ))}
            {s.reserve.map((id) => (
              <button key={id} onClick={() => onCard(<EventCardView id={id} mode={{ u: 5.4 }} />)} aria-label={`Záloha: ${EVENT_BY_ID[id].name}`}>
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-text-muted">V záloze</div>
                <EventCardView id={id} mode={{ u: 2.3 }} />
              </button>
            ))}
          </div>
        ) : null}
        {tab === "projects" ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {s.projects.map((p) => (
              <button key={p.id} onClick={() => onCard(<ProjectCardView id={p.id} work={p.work} mat={p.mat} done={p.done} mode={{ u: 5.4 }} />)}>
                <ProjectCardView id={p.id} work={p.work} mat={p.mat} done={p.done} mode={{ u: 2.6 }} />
                {p.done ? <div className="mt-1 text-center text-sm font-bold text-moss">Hotovo ✓</div> : null}
              </button>
            ))}
          </div>
        ) : null}
        {tab === "animals" ? (
          <div className="flex flex-col gap-2">
            {s.seat.map((id: AnimalId) => {
              const a = s.animals[id]!;
              const st = stationAt(a.pos);
              return (
                <button key={id} className="flex items-center gap-3 rounded-[14px] border border-border p-2 text-left hover:bg-surface-alt" onClick={() => onCard(<AnimalBoardView id={id} unlocked={a.unlocked} mode={{ u: 3.6 }} />)}>
                  <div className="h-10 w-12 shrink-0">
                    <AnimalSvg id={id} className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <Marker id={id} size={20} /> {ANIMAL_DEFS[id].name}
                      <span className="text-sm font-normal text-text-muted">· {st ? STATIONS[st].short : `pole ${a.pos}`}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Hearts n={a.hearts} />
                      <Cargo s={s} id={id} compact />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
        {tab === "log" ? (
          <ol className="max-h-72 overflow-y-auto text-sm leading-relaxed">
            {log
              .slice(-60)
              .reverse()
              .flatMap((entry) =>
                entry.events
                  .map((e, i) => {
                    const txt = eventText(s, e);
                    return txt ? (
                      <li key={`${entry.seq}-${i}`} className={e.e === "round" ? "mt-2 font-semibold text-moss" : ""}>
                        {txt}
                      </li>
                    ) : null;
                  })
                  .filter(Boolean)
                  .reverse(),
              )}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
