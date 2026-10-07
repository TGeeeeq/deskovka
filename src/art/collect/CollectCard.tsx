import "./collect.css";
import type { CSSProperties } from "react";
import { ANIMAL_DEFS } from "@data/animals";
import { COLLECT_BY_ID, COLLECT_SEASON, GROUP, RARITY, SET, STATS, type CollectPrint, type Rarity } from "@data/collect";
import { AnimalSvg } from "../karel/AnimalSvg";
import { Marker, shapePath } from "../icons/Icons";
import type { CardMode } from "../cards/Cards";

const SKY: Record<string, [string, string]> = {
  jaro: ["#cfe6b8", "#8fbf6a"],
  leto: ["#fbe7a6", "#e4b54a"],
  podzim: ["#f3cfa3", "#c27a3e"],
  zima: ["#eef4f8", "#a9c4d4"],
};

const RARITY_INK: Record<Rarity, { fill: string; ink: string }> = {
  bezna: { fill: "#3d3326", ink: "#3d3326" },
  vzacna: { fill: "#d6a63a", ink: "#7a5512" },
  holo: { fill: "#8fb3c9", ink: "#2f4f63" },
  legenda: { fill: "#e2b23c", ink: "#7a5512" },
};

/** Značka vzácnosti: tvar nese informaci, barva jen pomáhá. */
export function RarityMark({ rarity, className }: { rarity: Rarity; className?: string }) {
  const c = RARITY_INK[rarity];
  const shape = { bezna: "circle", vzacna: "diamond", holo: "star", legenda: "star" } as const;
  return (
    <svg viewBox="-12 -12 24 24" className={className} role="img" aria-label={RARITY[rarity].name}>
      {rarity === "legenda" ? <circle r={11} fill="none" stroke={c.ink} strokeWidth={1.6} /> : null}
      <path d={shapePath(shape[rarity], rarity === "legenda" ? 7.5 : 9)} fill={c.fill} stroke={c.ink} strokeWidth={1.3} strokeLinejoin="round" />
    </svg>
  );
}

function Snow() {
  const flakes = [
    [8, 14], [22, 6], [37, 18], [50, 9], [14, 30], [44, 32], [29, 26], [56, 22],
  ];
  return (
    <svg className="nz-cc-snow" viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {flakes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={0.9} fill="#fff" opacity={0.9} />
      ))}
    </svg>
  );
}

/** Razítko akce: kruh s textem. Na fyzické kartě je to skutečné razítko z akce na Louce. */
function Stamp({ text }: { text: string }) {
  const id = `stamp-${text.replace(/\W+/g, "")}`;
  return (
    <svg className="nz-cc-stamp" viewBox="-30 -30 60 60" aria-label={`Razítko: ${text}`} role="img">
      <defs>
        <path id={id} d="M -21 0 A 21 21 0 1 1 21 0 A 21 21 0 1 1 -21 0" />
      </defs>
      <circle r={27} fill="none" stroke="currentColor" strokeWidth={2} />
      <circle r={16} fill="none" stroke="currentColor" strokeWidth={1} />
      <text fontSize={6.4} fontWeight={700} letterSpacing={0.6} fill="currentColor" fontFamily="Plus Jakarta Sans, sans-serif">
        <textPath href={`#${id}`} startOffset="0">
          {`${text.toUpperCase()} · NECH MĚ RŮST · `}
        </textPath>
      </text>
      <path d={shapePath("star", 9)} fill="currentColor" />
    </svg>
  );
}

export function CollectCardView({ print: p, mode }: { print: CollectPrint; mode?: CardMode }) {
  const c = COLLECT_BY_ID[p.card];
  const d = ANIMAL_DEFS[c.animal];
  const ring = d.marker.ring;
  const [skyA, skyB] = SKY[c.season];
  const legend = p.rarity === "legenda";
  const st: CSSProperties = { ["--cc-ring" as string]: ring, ["--cc-sky-a" as string]: skyA, ["--cc-sky-b" as string]: skyB };
  if (mode?.u) (st as Record<string, string>)["--u"] = `${mode.u}px`;
  if (mode?.bleed) (st as Record<string, string>)["--bleed"] = "3";
  const title = p.title ?? c.title;
  const quote = p.quote ?? c.quote;
  const code = `${GROUP[c.animal]}${COLLECT_SEASON[c.season].letter}`;

  return (
    <div className={`nz-card nz-cc nz-cc-${p.rarity} nz-cc-s-${c.season} ${mode?.print ? "nz-print" : ""}`} style={st} data-rarity={p.rarity}>
      <div className="nz-cc-art">
        <div className="nz-cc-foil" aria-hidden="true" />
        {c.season === "zima" ? <Snow /> : null}
        <div className="nz-cc-ground" />
        <AnimalSvg id={c.animal} wear={p.wear ?? c.wear} className="nz-cc-animal" />
      </div>
      <div className="nz-frame nz-cc-frame" />

      <div className="nz-cc-inner">
        <div className="nz-cc-head">
          <div className="nz-cc-code" aria-label={`Kvarteto ${code}`}>
            <span>{code}</span>
          </div>
          <div className="nz-cc-name">
            <div className="nz-kicker">
              {d.species} · {COLLECT_SEASON[c.season].name}
            </div>
            <div className="nz-title">{title}</div>
          </div>
          <Marker id={c.animal} className="nz-cc-marker" />
        </div>

        {legend && p.serial ? (
          <div className="nz-cc-serial">
            {String(p.serial.n).padStart(2, "0")}/{p.serial.of}
          </div>
        ) : null}

        <div className="nz-cc-spacer" />

        <div className="nz-cc-panel">
          <div className="nz-cc-stats">
            {STATS.map((s) => (
              <div key={s.id} className="nz-cc-stat">
                <span className="nz-cc-stat-name">{s.name}</span>
                <span className="nz-cc-bar">
                  <span style={{ width: `${c.stats[s.id]}%` }} />
                </span>
                <b>{c.stats[s.id]}</b>
              </div>
            ))}
          </div>
          <div className="nz-cc-quote">{quote}</div>
          <div className="nz-cc-foot">
            <span>
              {SET.name} · {String(c.no).padStart(2, "0")}/{SET.size}
            </span>
            <span className="nz-cc-rarity">
              {RARITY[p.rarity].name}
              <RarityMark rarity={p.rarity} className="nz-cc-mark" />
            </span>
          </div>
        </div>
      </div>

      {p.origin ? <Stamp text={p.origin} /> : null}
    </div>
  );
}

export function CollectBack({ mode }: { mode?: CardMode }) {
  const st: CSSProperties = {};
  if (mode?.u) (st as Record<string, string>)["--u"] = `${mode.u}px`;
  if (mode?.bleed) (st as Record<string, string>)["--bleed"] = "3";
  return (
    <div className={`nz-card nz-cc-back ${mode?.print ? "nz-print" : ""}`} style={st}>
      <div className="nz-frame" style={{ borderColor: "rgba(240,232,146,.6)" }} />
      <div className="nz-cc-back-inner">
        <svg viewBox="-12 -12 24 24" className="nz-cc-back-star" aria-hidden="true">
          <path d={shapePath("star", 10.5)} fill="#f0e892" />
        </svg>
        <div className="nz-cc-back-title">Kvarteto z Louky</div>
        <div className="nz-kicker" style={{ color: "#f0e892" }}>
          {SET.name} · Nech mě růst
        </div>
      </div>
    </div>
  );
}
