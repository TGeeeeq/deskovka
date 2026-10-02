import "./cards.css";
import type { CSSProperties, ReactNode } from "react";
import { ANIMAL_DEFS, UNLOCK_COST } from "@data/animals";
import { STATIONS } from "@data/board";
import { EVENT_BY_ID, WHO_NAME } from "@data/cards/events";
import { FACTS } from "@data/cards/facts";
import { NEED_BY_ID } from "@data/cards/needs";
import { PROJECT_BY_ID } from "@data/cards/projects";
import { WEATHER_BY_ID, WEATHER_ICON_NAME } from "@data/cards/weather";
import { SEASON_NAME } from "@data/rules";
import type { AnimalId, Bag, ItemId, SeasonId, StationId } from "@data/types";
import { AnimalSvg } from "../karel/AnimalSvg";
import { HeartIcon, ItemIcon, Marker, StarIcon, WeatherGlyph } from "../icons/Icons";

export type CardMode = { print?: boolean; bleed?: boolean; u?: number };

export const SEASON_COLOR: Record<SeasonId, string> = { jaro: "#6f9e4c", leto: "#d9a32a", podzim: "#b8602c" };
const WHO_COLOR = { tomas: "#2d5a3d", maruska: "#7a5aa0", tony: "#3f6a78", louka: "#c89858" } as const;

function Frame({ mode, className = "", style, children }: { mode?: CardMode; className?: string; style?: CSSProperties; children: ReactNode }) {
  const st: CSSProperties = { ...style };
  if (mode?.u) (st as Record<string, string>)["--u"] = `${mode.u}px`;
  if (mode?.bleed) (st as Record<string, string>)["--bleed"] = "3";
  return (
    <div className={`nz-card ${mode?.print ? "nz-print" : ""} ${className}`} style={st}>
      {children}
    </div>
  );
}

function Items({ bag }: { bag: Bag }) {
  return (
    <span className="nz-row">
      {(Object.entries(bag) as [ItemId, number][])
        .filter(([, n]) => n !== 0)
        .map(([k, n]) => (
          <span key={k} className="nz-chip">
            {n < 0 ? "−" : ""}
            {Math.abs(n) > 1 ? Math.abs(n) : ""}
            <ItemIcon id={k} className="nz-ico" />
          </span>
        ))}
    </span>
  );
}

const st = (id: StationId) => STATIONS[id].short;

export function WeatherCardView({ id, mode }: { id: string; mode?: CardMode }) {
  const c = WEATHER_BY_ID[id];
  const color = SEASON_COLOR[c.season];
  return (
    <Frame mode={mode}>
      <div className="nz-band" style={{ background: color }} />
      <div className="nz-frame" />
      <div className="nz-inner">
        <div style={{ color: "#fffaf0" }}>
          <div className="nz-kicker">
            Počasí · {SEASON_NAME[c.season]}
            {c.harsh ? " · drsné" : ""}
          </div>
          <div className="nz-title">{c.name}</div>
        </div>
        <div className="nz-corner" style={{ background: "#fbf3dc", borderRadius: "50%", padding: "calc(0.4 * var(--u))", width: "calc(10.5 * var(--u))", height: "calc(10.5 * var(--u))" }}>
          <WeatherGlyph icon={c.icon} className="nz-wx" />
        </div>
        <div className="nz-text nz-row" style={{ marginTop: "calc(3 * var(--u))", fontWeight: 700, justifyContent: "space-between" }}>
          <span>{WEATHER_ICON_NAME[c.icon]}</span>
          {c.need ? <span className="nz-chip" style={{ background: "#f5d9cc" }}>+ nová Potřeba</span> : null}
        </div>
        <div className="nz-text" style={{ display: "flex", flexDirection: "column", gap: "calc(0.8 * var(--u))" }}>
          {Object.entries(c.refill).map(([sid, bag]) => (
            <div key={sid} className="nz-row">
              <span style={{ minWidth: "calc(15 * var(--u))", fontWeight: 600 }}>{st(sid as StationId)}</span>
              <Items bag={bag!} />
            </div>
          ))}
        </div>
        <div className="nz-text" style={{ background: c.harsh ? "#f5d9cc" : "#f1ead2", borderRadius: "calc(1.6 * var(--u))", padding: "calc(1.2 * var(--u))" }}>
          {c.text}
        </div>
        <div style={{ flex: 1, display: "grid", placeItems: "center", opacity: 0.16, minHeight: 0 }} aria-hidden>
          <WeatherGlyph icon={c.icon} className="nz-wx-big" />
        </div>
        <div className="nz-flavor" style={{ marginTop: 0 }}>{c.flavor}</div>
      </div>
    </Frame>
  );
}

function Portrait({ who, color }: { who: string; color: string }) {
  const initials = who
    .split(/\s+a\s+|\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      style={{
        width: "calc(11 * var(--u))",
        height: "calc(11 * var(--u))",
        borderRadius: "50%",
        background: "#fbf3dc",
        border: `calc(0.6 * var(--u)) solid ${color}`,
        display: "grid",
        placeItems: "center",
        fontFamily: "Fraunces, serif",
        fontWeight: 700,
        fontSize: "calc(4.4 * var(--u))",
        color,
        flex: "none",
      }}
    >
      {initials}
    </span>
  );
}

function needReqText(id: string) {
  const c = NEED_BY_ID[id];
  const r = c.req;
  if (r.k === "deliver") return { where: st(r.station), items: r.items, together: r.together };
  if (r.k === "geese") return { where: "pole s husami", items: r.items };
  if (r.k === "care") return { where: st(r.station), special: "akce síly 4 (ve dvou)" };
  if (r.k === "rest") return { where: st(r.station), special: r.withOther ? "odpočinek ve dvou" : "odpočinek" };
  if (r.k === "escort") return { where: `${st(r.from)} → ${st(r.to)}`, special: "doprovod Lucinky" };
  return { where: st(r.station), special: "nikdo tam nekončí tah" };
}

export function NeedCardView({ id, due, mode }: { id: string; due?: number; mode?: CardMode }) {
  const c = NEED_BY_ID[id];
  const r = needReqText(id);
  const color = "#b85c3c";
  return (
    <Frame mode={mode}>
      <div className="nz-band" style={{ background: color, height: "calc((var(--bleed) + 20) * var(--u))" }} />
      <div className="nz-frame" />
      <div className="nz-inner">
        <div className="nz-row" style={{ color: "#fffaf0", flexWrap: "nowrap" }}>
          <Portrait who={c.who} color={color} />
          <div>
            <div className="nz-kicker">Potřeba · {c.who}</div>
            <div className="nz-title" style={{ fontSize: "calc(4.2 * var(--u))" }}>
              {c.name}
            </div>
          </div>
        </div>
        <div className="nz-row nz-text" style={{ marginTop: "calc(2 * var(--u))", justifyContent: "space-between" }}>
          <span className="nz-chip"><b>Kde:</b> {r.where}</span>
          <span className="nz-chip" title="Lhůta v kolech">
            <b>Lhůta:</b> {due ?? c.deadline}
          </span>
        </div>
        <div className="nz-text" style={{ background: "#f1ead2", borderRadius: "calc(1.6 * var(--u))", padding: "calc(1.2 * var(--u))", display: "flex", flexDirection: "column", gap: "calc(0.8 * var(--u))" }}>
          {"items" in r && r.items ? <Items bag={r.items} /> : null}
          {"special" in r && r.special ? <b>{r.special}</b> : null}
          {"together" in r && r.together ? <b>Přinesou dvě zvířata spolu.</b> : null}
          <span>{c.text}</span>
        </div>
        <div className="nz-text">
          <b>Odměna:</b> {c.reward}
        </div>
        <div className="nz-flavor">{c.flavor}</div>
      </div>
    </Frame>
  );
}

export function EventCardView({ id, mode }: { id: string; mode?: CardMode }) {
  const c = EVENT_BY_ID[id];
  const color = WHO_COLOR[c.who];
  return (
    <Frame mode={mode}>
      <div className="nz-band" style={{ background: color }} />
      <div className="nz-frame" />
      <div className="nz-inner">
        <div style={{ color: "#fffaf0" }}>
          <div className="nz-kicker">
            {c.helper ? "Pomocník" : "Událost"} · {WHO_NAME[c.who]}
          </div>
          <div className="nz-title">{c.name}</div>
        </div>
        <div className="nz-corner">
          <Portrait who={WHO_NAME[c.who]} color={color} />
        </div>
        <div className="nz-text" style={{ marginTop: "calc(7.5 * var(--u))", fontSize: "calc(3.3 * var(--u))", fontWeight: 600 }}>
          {c.text}
        </div>
        {c.helper ? (
          <div className="nz-text" style={{ background: "#e8efe6", borderRadius: "calc(1.6 * var(--u))", padding: "calc(1 * var(--u))" }}>
            Smí se nechat v záloze (nejvýš 2) a zahrát později.
          </div>
        ) : null}
        <div className="nz-flavor">{c.flavor}</div>
      </div>
    </Frame>
  );
}

export function ProjectCardView({ id, work, mat, done, mode }: { id: string; work?: number; mat?: Bag; done?: boolean; mode?: CardMode }) {
  const c = PROJECT_BY_ID[id];
  return (
    <Frame mode={mode} style={done ? { outline: "calc(0.8 * var(--u)) solid #2d5a3d" } : undefined}>
      <div className="nz-band" style={{ background: "#1f3d2a" }} />
      <div className="nz-frame" />
      <div className="nz-inner">
        <div style={{ color: "#f0e892" }}>
          <div className="nz-kicker">Projekt Louky · {st(c.station)}</div>
          <div className="nz-title" style={{ color: "#fffaf0" }}>
            {c.name}
          </div>
        </div>
        <div className="nz-corner nz-row" style={{ gap: 0 }}>
          {Array.from({ length: c.stars }, (_, i) => (
            <StarIcon key={i} className="nz-ico" />
          ))}
        </div>
        <div className="nz-text" style={{ marginTop: "calc(2.5 * var(--u))", display: "flex", flexDirection: "column", gap: "calc(1 * var(--u))" }}>
          {Object.keys(c.materials).length ? (
            <div className="nz-row">
              <b>Materiál:</b>
              {(Object.entries(c.materials) as [ItemId, number][]).map(([k, n]) => (
                <span key={k} className="nz-chip">
                  {mat ? `${mat[k] ?? 0}/` : ""}
                  {n}
                  <ItemIcon id={k} className="nz-ico" />
                </span>
              ))}
            </div>
          ) : null}
          {c.altCost ? <div>Plus 1 Křížaly nebo Tonyho karta ze zálohy.</div> : null}
          <div className="nz-row">
            <b>Práce:</b>
            {Array.from({ length: c.work }, (_, i) => (
              <span
                key={i}
                style={{
                  width: "calc(3.4 * var(--u))",
                  height: "calc(3.4 * var(--u))",
                  border: "calc(0.3 * var(--u)) solid #3d3326",
                  borderRadius: "calc(0.6 * var(--u))",
                  background: work !== undefined && i < work ? "#8a6a3e" : "#fffaf0",
                }}
              />
            ))}
          </div>
          {c.needsJoint ? <div>Aspoň jednou ve dvou (síla 4).</div> : null}
        </div>
        <div className="nz-text" style={{ background: "#e8efe6", borderRadius: "calc(1.6 * var(--u))", padding: "calc(1.2 * var(--u))" }}>
          {c.bonus}
        </div>
        <div className="nz-flavor">{c.flavor}</div>
      </div>
    </Frame>
  );
}

export function FactCardView({ index, mode }: { index: number; mode?: CardMode }) {
  const f = FACTS[index];
  return (
    <Frame mode={mode} className="nz-mini">
      <div className="nz-band" style={{ background: "#c89858", height: "calc((var(--bleed) + 12) * var(--u))" }} />
      <div className="nz-frame" />
      <div className="nz-inner">
        <div className="nz-kicker" style={{ color: "#fffaf0" }}>
          Věděli jste?
        </div>
        <div className="nz-text" style={{ marginTop: "calc(6 * var(--u))", fontSize: "calc(3.2 * var(--u))" }}>
          {f.text}
        </div>
        <div className="nz-flavor" style={{ fontSize: "calc(2.4 * var(--u))" }}>
          Nech mě růst · Louka
        </div>
      </div>
    </Frame>
  );
}

export function AnimalBoardView({ id, mode, unlocked }: { id: AnimalId; mode?: CardMode; unlocked?: boolean }) {
  const d = ANIMAL_DEFS[id];
  const block = (title: string, name: string, text: string, tone: string) => (
    <div style={{ background: tone, borderRadius: "calc(1.8 * var(--u))", padding: "calc(1.4 * var(--u)) calc(1.8 * var(--u))" }}>
      <div className="nz-kicker" style={{ fontSize: "calc(2.3 * var(--u))" }}>
        {title}
      </div>
      <div style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "calc(3.6 * var(--u))" }}>{name}</div>
      <div className="nz-text">{text}</div>
    </div>
  );
  return (
    <Frame mode={mode} className="nz-board">
      <div className="nz-band" style={{ background: d.marker.ring, height: "calc((var(--bleed) + 40) * var(--u))" }} />
      <div className="nz-frame" />
      <div className="nz-inner" style={{ gap: "calc(1.8 * var(--u))" }}>
        <div className="nz-row" style={{ justifyContent: "space-between", color: "#fffaf0" }}>
          <div>
            <div className="nz-kicker">{d.species}</div>
            <div className="nz-title" style={{ fontSize: "calc(8 * var(--u))" }}>
              {d.name}
            </div>
            <div className="nz-text">Unese {d.cargo} · kamarád{ANIMAL_DEFS[d.friend].fem ? "ka" : ""}: {ANIMAL_DEFS[d.friend].name}</div>
          </div>
          <Marker id={id} className="nz-ico" />
        </div>
        <div style={{ height: "calc(30 * var(--u))", marginTop: "calc(-6 * var(--u))", display: "flex", justifyContent: "flex-end" }}>
          <AnimalSvg id={id} className="h-full w-auto" />
        </div>
        {block("Schopnost", d.power.name, d.power.text, "#f1ead2")}
        {block("Povaha", d.quirk.name, d.quirk.text, "#f6efe0")}
        <div style={{ opacity: unlocked === false ? 0.55 : 1 }}>
          {block(`Druhá schopnost · za ${UNLOCK_COST} srdíčka`, d.second.name, d.second.text, "#e8efe6")}
        </div>
        {block("Přání ★", d.wish.name, d.wish.text, "#f5e6c8")}
        <div className="nz-row nz-text" style={{ gap: "calc(0.6 * var(--u))" }}>
          {Array.from({ length: 6 }, (_, i) => (
            <HeartIcon key={i} filled={false} className="nz-ico" />
          ))}
          <span style={{ marginLeft: "calc(1 * var(--u))" }}>srdíčka (nejvýš 6)</span>
        </div>
        <div className="nz-flavor">„{d.quote}“</div>
      </div>
    </Frame>
  );
}

export function CardBack({ kind, mode }: { kind: "weather" | "need" | "event" | "project" | "fact"; mode?: CardMode }) {
  const label = { weather: "Počasí", need: "Potřeba", event: "Událost", project: "Projekt", fact: "Věděli jste?" }[kind];
  const color = { weather: "#2d5a3d", need: "#b85c3c", event: "#c89858", project: "#1f3d2a", fact: "#c89858" }[kind];
  return (
    <Frame mode={mode} className={`nz-back ${kind === "fact" ? "nz-mini" : ""}`} style={{ background: color }}>
      <div className="nz-frame" style={{ borderColor: "rgba(255,250,240,.55)" }} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: "calc(6.4 * var(--u))", color: "#fffaf0" }}>Než přijde zima</div>
          <div className="nz-kicker" style={{ color: "#f0e892", marginTop: "calc(1.5 * var(--u))" }}>
            {label}
          </div>
        </div>
      </div>
    </Frame>
  );
}
