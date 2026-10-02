import { memo, type ReactNode } from "react";
import { SHORTCUTS, SPACES, STATIONS } from "@data/board";
import { ITEMS } from "@data/items";
import { PANTRY_ORDER, SEASONS, SEASON_NAME } from "@data/rules";
import type { Bag, ItemId, SeasonId, StationId } from "@data/types";
import { shapePath } from "../icons/Icons";
import { CENTER, inward, loopPath, outward, shortcutPath, spaceXY } from "./geometry";
import { StationArt } from "./StationArt";

const INK = "#3d3326";
const PAPER = "#ead7a4";
export const BOARD_VIEWBOX = "0 0 500 500";

/** Malý tvar žetonu do SVG desky (bez vlastního <svg>). */
export function TokenShape({ id, x, y, r = 4.2, count }: { id: ItemId; x: number; y: number; r?: number; count?: number }) {
  const it = ITEMS[id];
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={shapePath(it.shape, r)} fill={it.color} stroke={it.ink} strokeWidth={0.5} fillRule="evenodd" strokeLinejoin="round" />
      {count !== undefined && count > 1 ? (
        <g transform={`translate(${r * 0.95} ${r * 0.85})`}>
          <circle r={2.6} fill="#fffaf0" stroke={INK} strokeWidth={0.35} />
          <text y={1.05} textAnchor="middle" fontSize={3.1} fontWeight={700} fill={INK} fontFamily="Plus Jakarta Sans, sans-serif">
            {count}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function PenTree({ x, y, s = 1, kind = 0 }: { x: number; y: number; s?: number; kind?: number }) {
  return kind ? (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={2} cy={5} rx={4.5} ry={2.5} fill="#3d3a1a" opacity={0.22} />
      <path d="M0,-8 L3,-3 L1.8,-3 L4.8,2 L3,2 L5.5,6 L-5.5,6 L-3,2 L-4.8,2 L-1.8,-3 L-3,-3 Z" fill="#5c7a3c" stroke="#2a3616" strokeWidth={0.7} strokeLinejoin="round" />
    </g>
  ) : (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={2} cy={4} rx={6} ry={3.4} fill="#3d3a1a" opacity={0.22} />
      <path d="M-5,0.7 C-6.3,-3.5 -2.8,-7 0,-6.3 C2.8,-7 6.3,-4.2 5.6,-0.7 C6.3,2.8 2.8,4.9 0,4.2 C-2.8,4.9 -5.6,3.5 -5,0.7 Z" fill="#6f8a45" stroke="#2f3a18" strokeWidth={0.75} strokeLinejoin="round" />
      <path d="M-2.8,-2.1 C-2.8,-4.2 -0.7,-4.9 0.7,-4.2" fill="none" stroke="#a3b870" strokeWidth={0.9} strokeLinecap="round" />
    </g>
  );
}

/** Pseudonáhoda bez Math.random — deska musí vypadat pokaždé stejně (tisk = web). */
function prng(seed: number) {
  let x = seed;
  return () => {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
}

const FIELDS = [
  "M14 14 L120 14 L104 70 L60 96 L14 104 Z",
  "M380 14 L486 14 L486 108 L438 96 L396 66 Z",
  "M14 400 L56 392 L96 440 L122 486 L14 486 Z",
  "M486 396 L486 486 L376 486 L404 444 L446 408 Z",
  "M14 150 L40 150 L30 206 L14 214 Z",
  "M486 190 L470 184 L476 260 L486 262 Z",
];
const FIELD_COLORS = ["#dcc07f", "#d0ad6b", "#e2cd94", "#c9a766", "#d7c48c", "#c2a263"];

const BoardArt = memo(function BoardArt() {
  const rnd = prng(42);
  const trees: { x: number; y: number; s: number; k: number }[] = [];
  // les podél horního okraje a remízky v rozích
  for (let i = 0; i < 46; i++) {
    const x = 120 + rnd() * 262;
    const y = 18 + rnd() * 22;
    trees.push({ x, y, s: 0.9 + rnd() * 0.5, k: rnd() < 0.35 ? 1 : 0 });
  }
  for (let i = 0; i < 16; i++) trees.push({ x: 20 + rnd() * 26, y: 230 + rnd() * 150, s: 0.8 + rnd() * 0.4, k: rnd() < 0.5 ? 1 : 0 });
  for (let i = 0; i < 14; i++) trees.push({ x: 458 + rnd() * 26, y: 280 + rnd() * 110, s: 0.8 + rnd() * 0.4, k: rnd() < 0.5 ? 1 : 0 });
  for (let i = 0; i < 12; i++) trees.push({ x: 180 + rnd() * 140, y: 462 + rnd() * 20, s: 0.75 + rnd() * 0.35, k: 0 });
  trees.sort((a, b) => a.y - b.y);
  const loop = loopPath();

  return (
    <g>
      <defs>
        <radialGradient id="nz-paper" cx="50%" cy="48%" r="72%">
          <stop offset="0" stopColor="#f1e2b8" />
          <stop offset="0.72" stopColor={PAPER} />
          <stop offset="1" stopColor="#d6bd83" />
        </radialGradient>
        <pattern id="nz-hatch" width={3.2} height={3.2} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1={0} y1={0} x2={0} y2={3.2} stroke="#6b4b22" strokeWidth={0.35} strokeOpacity={0.25} />
        </pattern>
        <pattern id="nz-hatch-x" width={3.6} height={3.6} patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
          <line x1={0} y1={0} x2={0} y2={3.6} stroke="#6b4b22" strokeWidth={0.3} strokeOpacity={0.18} />
        </pattern>
        <pattern id="nz-grass" width={9} height={8} patternUnits="userSpaceOnUse">
          <path d="M2,6 l0.7,-2 l0.7,2 M6.5,3 l0.7,-2 l0.7,2" fill="none" stroke="#4f5f2a" strokeWidth={0.45} strokeOpacity={0.4} strokeLinecap="round" />
        </pattern>
      </defs>

      <rect x={0} y={0} width={500} height={500} fill="url(#nz-paper)" />
      {FIELDS.map((d, i) => (
        <g key={i}>
          <path d={d} fill={FIELD_COLORS[i % FIELD_COLORS.length]} />
          <path d={d} fill={i % 2 ? "url(#nz-hatch)" : "url(#nz-hatch-x)"} stroke="#6b4b22" strokeOpacity={0.5} strokeWidth={0.6} />
        </g>
      ))}

      {/* Louka uvnitř smyčky */}
      <ellipse cx={CENTER.x} cy={CENTER.y} rx={176} ry={170} fill="#cdcf93" opacity={0.85} />
      <ellipse cx={CENTER.x} cy={CENTER.y} rx={176} ry={170} fill="url(#nz-grass)" stroke="#5c6a30" strokeOpacity={0.35} strokeWidth={0.7} />

      {/* Potok: od lesa nahoře přes údolí k levému okraji */}
      <path d="M352 14 C346 40 330 58 318 84 C300 120 252 112 214 128 C170 146 118 140 70 176 C48 192 30 196 14 196" fill="none" stroke="#e9dcb4" strokeWidth={9} strokeLinecap="round" />
      <path d="M352 14 C346 40 330 58 318 84 C300 120 252 112 214 128 C170 146 118 140 70 176 C48 192 30 196 14 196" fill="none" stroke="#93b7bd" strokeWidth={5.6} strokeLinecap="round" />
      <path d="M352 14 C346 40 330 58 318 84 C300 120 252 112 214 128 C170 146 118 140 70 176 C48 192 30 196 14 196" fill="none" stroke="#3f5f6b" strokeWidth={0.5} strokeDasharray="3 3" strokeOpacity={0.6} />

      {trees.map((t, i) => (
        <PenTree key={i} x={t.x} y={t.y} s={t.s} kind={t.k} />
      ))}

      {/* Pěšina */}
      <path d={loop} fill="none" stroke="#f3e6c4" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
      <path d={loop} fill="none" stroke="#b79a64" strokeWidth={0.8} strokeDasharray="1.6 2.4" />

      {/* Zkratky */}
      {SHORTCUTS.map((sc) => {
        const { d } = shortcutPath(sc.id);
        return (
          <g key={sc.id}>
            <path d={d} fill="none" stroke="#f3e6c4" strokeWidth={7} strokeLinecap="round" opacity={0.9} />
            <path d={d} fill="none" stroke={sc.gate ? "#8a6a3e" : "#3f6a78"} strokeWidth={1.1} strokeDasharray={sc.gate ? "4 2.4" : "1.2 2.4"} strokeLinecap="round" />
          </g>
        );
      })}

      {/* Kresby stanic směrem do louky */}
      {Object.values(STATIONS).map((st) => {
        const p = inward(st.space, st.id === "brana" ? 30 : 32);
        return (
          <g key={st.id} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
            <StationArt id={st.id} />
          </g>
        );
      })}

      {/* Rám s ornamentem */}
      <rect x={6} y={6} width={488} height={488} fill="none" stroke={INK} strokeWidth={2.2} />
      <rect x={10.5} y={10.5} width={479} height={479} fill="none" stroke={INK} strokeWidth={0.6} />
      {[
        [10.5, 10.5],
        [489.5, 10.5],
        [10.5, 489.5],
        [489.5, 489.5],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r={5} fill={PAPER} stroke={INK} strokeWidth={0.8} />
          <path d="M-3,0 L0,-3 L3,0 L0,3 Z" fill="#9a3b25" />
        </g>
      ))}

      {/* Větrná růžice */}
      <g transform="translate(456 456)">
        <circle r={15} fill="none" stroke={INK} strokeWidth={0.5} />
        <path d="M0,-17 L3,0 L0,17 L-3,0 Z" fill={INK} />
        <path d="M-17,0 L0,3 L17,0 L0,-3 Z" fill="#8a7a5e" />
        <text y={-19.5} textAnchor="middle" fontSize={6} fontFamily="Fraunces, serif" fill={INK}>
          S
        </text>
      </g>
    </g>
  );
});

function SpaceMark({ n, active, onClick }: { n: number; active: boolean; onClick?: () => void }) {
  const sp = SPACES[n - 1];
  const r = sp.kind === "station" ? 12.5 : sp.kind === "event" ? 8.5 : 7;
  const st = sp.station ? STATIONS[sp.station] : null;
  return (
    <g
      transform={`translate(${sp.x} ${sp.y})`}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? `Jít na pole ${n}${st ? `, ${st.name}` : sp.kind === "event" ? ", událost" : ""}` : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
    >
      {active ? <circle r={r + 5} fill="#f0e892" stroke="#b8862a" strokeWidth={1.3} className="nz-pulse" /> : null}
      <circle r={r} fill={sp.kind === "station" ? "#fff7e2" : sp.kind === "event" ? "#f0e0b0" : "#f6ecd0"} stroke={INK} strokeWidth={sp.kind === "station" ? 1.4 : 0.9} />
      {sp.kind === "event" ? (
        <text y={3.6} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#9a3b25" fontFamily="Fraunces, serif">
          ?
        </text>
      ) : null}
      {sp.kind === "station" ? <circle r={r - 2.2} fill="none" stroke="#b79a64" strokeWidth={0.5} strokeDasharray="1 1.2" /> : null}
      <text x={0} y={sp.kind === "station" ? -r + 4.4 : sp.kind === "event" ? -r - 1.2 : 1.4} textAnchor="middle" fontSize={sp.kind === "path" ? 4.2 : 3.6} fill="#8a7a5e" fontFamily="Plus Jakarta Sans, sans-serif">
        {sp.kind === "path" ? n : sp.kind === "event" ? "" : n}
      </text>
    </g>
  );
}

function StationLabel({ id }: { id: StationId }) {
  const st = STATIONS[id];
  const p = outward(st.space, 21);
  const name = st.short;
  const w = name.length * 3.05 + 8;
  return (
    <g transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
      <rect x={-w / 2} y={-4.2} width={w} height={8.4} rx={1.6} fill="#fbf3dc" stroke={INK} strokeWidth={0.6} />
      <text y={1.9} textAnchor="middle" fontSize={5} fontFamily="Fraunces, serif" fontWeight={600} fill={INK}>
        {name}
      </text>
    </g>
  );
}

function Gate({ id, open, lock }: { id: "sad" | "maringotka"; open: boolean; lock: boolean }) {
  const { mid } = shortcutPath(id);
  return (
    <g transform={`translate(${mid.x.toFixed(1)} ${mid.y.toFixed(1)})`} aria-label={`${id === "sad" ? "Vrata do sadu" : "Vrata u maringotky"}: ${open ? "otevřená" : "zavřená"}`}>
      <rect x={-8} y={-6} width={16} height={12} rx={2} fill="#fbf3dc" stroke={INK} strokeWidth={0.7} />
      <rect x={-6.5} y={-4} width={1.5} height={8} fill="#8a6a3e" />
      <rect x={5} y={-4} width={1.5} height={8} fill="#8a6a3e" />
      {open ? (
        <path d="M-5,-3 L-1,-5 M-5,0 L-1,-2 M-5,3 L-1,1" stroke={INK} strokeWidth={0.9} />
      ) : (
        <path d="M-5,-2.5 H5 M-5,0.5 H5 M-5,3 H5" stroke={INK} strokeWidth={0.9} />
      )}
      {lock ? <circle cx={8} cy={-6} r={2.4} fill="#2d5a3d" stroke={INK} strokeWidth={0.4} /> : null}
    </g>
  );
}

function Branches({ n }: { n: number }) {
  const p = spaceXY(n);
  return (
    <g transform={`translate(${p.x + 6} ${p.y - 7})`} aria-label={`Větve na poli ${n}`}>
      <path d="M-6,3 L6,-3 M-4,-2 L-1,1 M2,-1 L4,2 M-5,4 L5,1" stroke="#5a3c28" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M3,-3 q2,-2 3,0 M-3,3 q-2,1 -2,-1" stroke="#6f8a45" strokeWidth={1} fill="none" />
    </g>
  );
}

/** Střed desky: název, ukazatel kol a Zimní spíž. */
function Center({ season, round, rounds, pantry, target }: { season?: SeasonId; round?: number; rounds: number; pantry?: Bag; target?: Bag }) {
  const seasonColor: Record<SeasonId, string> = { jaro: "#7fae5a", leto: "#e0b23c", podzim: "#c06a2c" };
  const trackW = 3 * rounds * 13 + 2 * 8;
  const x0 = CENTER.x - trackW / 2;
  const maxRow = 6;
  return (
    <g>
      {/* kartuše */}
      <g transform="translate(250 112)">
        <path d="M-78,-16 H78 Q86,-16 86,-8 V8 Q86,16 78,16 H-78 Q-86,16 -86,8 V-8 Q-86,-16 -78,-16 Z" fill="#fbf3dc" stroke={INK} strokeWidth={1.2} />
        <path d="M-82,-12 H82 M-82,12 H82" stroke={INK} strokeWidth={0.35} />
        <text y={4.5} textAnchor="middle" fontSize={15.5} fontFamily="Fraunces, serif" fontWeight={700} fill="#1f3d2a">
          Než přijde zima
        </text>
        <text y={23.5} textAnchor="middle" fontSize={4.6} fontFamily="Plus Jakarta Sans, sans-serif" letterSpacing={1.4} fill="#5a4a34">
          LOUKA · VLKANEČ · NECH MĚ RŮST
        </text>
      </g>

      {/* ukazatel kol */}
      <g transform={`translate(0 150)`}>
        {SEASONS.map((s, si) => (
          <g key={s}>
            <text x={x0 + si * (rounds * 13 + 8) + (rounds * 13) / 2} y={-5} textAnchor="middle" fontSize={4.6} fontFamily="Fraunces, serif" fill={INK}>
              {SEASON_NAME[s]}
            </text>
            {Array.from({ length: rounds }, (_, r) => {
              const cx = x0 + si * (rounds * 13 + 8) + r * 13 + 6.5;
              const here = season === s && round === r + 1;
              const past = season ? SEASONS.indexOf(season) > si || (season === s && (round ?? 0) > r + 1) : false;
              return (
                <g key={r}>
                  <circle cx={cx} cy={4} r={5} fill={past ? seasonColor[s] : "#fbf3dc"} stroke={INK} strokeWidth={0.7} opacity={past ? 0.55 : 1} />
                  {here ? <circle cx={cx} cy={4} r={6.6} fill="none" stroke="#9a3b25" strokeWidth={1.4} /> : null}
                  <text x={cx} y={5.6} textAnchor="middle" fontSize={4} fill={INK} fontFamily="Plus Jakarta Sans, sans-serif">
                    {r + 1}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
        <g transform={`translate(${x0 + trackW + 10} 4)`}>
          <path d={shapePath("star", 5.5)} fill="#dfe8ef" stroke="#4f86b0" strokeWidth={0.6} />
          <text x={9} y={1.8} fontSize={4.4} fontFamily="Fraunces, serif" fill={INK}>
            Zima
          </text>
        </g>
      </g>

      {/* Zimní spíž */}
      <g transform="translate(250 258)">
        <rect x={-102} y={-62} width={204} height={134} rx={6} fill="#fbf3dc" stroke={INK} strokeWidth={1.1} />
        <rect x={-98} y={-58} width={196} height={126} rx={4} fill="none" stroke={INK} strokeWidth={0.35} />
        <text y={65} textAnchor="middle" fontSize={3.5} fontFamily="Plus Jakarta Sans, sans-serif" fill="#5a4a34">
          Seno a bylinky schnou za sucha · Křížaly i za polojasna · V dešti nic neschne
        </text>
        <text y={-47} textAnchor="middle" fontSize={8.6} fontFamily="Fraunces, serif" fontWeight={700} fill="#1f3d2a">
          Zimní spíž
        </text>
        <text y={-40} textAnchor="middle" fontSize={3.6} fontFamily="Plus Jakarta Sans, sans-serif" fill="#5a4a34">
          plný řádek ★★ · polovina ★
        </text>
        {PANTRY_ORDER.map((p, i) => {
          const y = -28 + i * 19;
          const need = target?.[p] ?? 0;
          const have = pantry?.[p] ?? 0;
          return (
            <g key={p} transform={`translate(-90 ${y})`}>
              <TokenShape id={p} x={6} y={0} r={5.2} />
              <text x={14} y={1.6} fontSize={4.8} fontFamily="Plus Jakarta Sans, sans-serif" fontWeight={600} fill={INK}>
                {ITEMS[p].name}
              </text>
              {Array.from({ length: maxRow }, (_, k) => {
                const cx = 68 + k * 17.5;
                const filled = k < have;
                const isTarget = target ? k < need : true;
                return (
                  <g key={k}>
                    <rect x={cx - 7} y={-7} width={14} height={14} rx={2.4} fill={isTarget ? "#f3e6c4" : "#f8f1de"} stroke={INK} strokeWidth={isTarget ? 0.7 : 0.35} strokeDasharray={isTarget ? undefined : "1.2 1.2"} />
                    {filled ? <TokenShape id={p} x={cx} y={0} r={5} /> : null}
                    {target && k === Math.ceil(need / 2) - 1 ? <text x={cx} y={-8.5} textAnchor="middle" fontSize={3.4} fill="#9a3b25">★</text> : null}
                    {target && k === need - 1 ? <text x={cx} y={-8.5} textAnchor="middle" fontSize={3.4} fill="#9a3b25">★★</text> : null}
                  </g>
                );
              })}
              {have > maxRow ? (
                <text x={68 + maxRow * 17.5 - 3} y={2} fontSize={4.4} fill={INK}>
                  +{have - maxRow}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>

    </g>
  );
}

export type BoardProps = {
  highlight?: number[];
  onSpace?: (n: number) => void;
  gates?: Record<"sad" | "maringotka", { open: boolean; lock: boolean }>;
  branches?: number[];
  supply?: Partial<Record<StationId, Bag>>;
  pantry?: Bag;
  target?: Bag;
  season?: SeasonId;
  round?: number;
  rounds?: number;
  children?: ReactNode;
  className?: string;
  title?: string;
};

export function Board({ highlight = [], onSpace, gates, branches = [], supply, pantry, target, season, round, rounds = 3, children, className, title }: BoardProps) {
  const hl = new Set(highlight);
  return (
    <svg viewBox={BOARD_VIEWBOX} className={className} role="img" aria-label={title ?? "Herní deska Louky"}>
      <BoardArt />
      <Center season={season} round={round} rounds={rounds} pantry={pantry} target={target} />
      {gates ? (
        <>
          <Gate id="sad" open={gates.sad.open} lock={gates.sad.lock} />
          <Gate id="maringotka" open={gates.maringotka.open} lock={gates.maringotka.lock} />
        </>
      ) : null}
      {SPACES.map((sp) => (
        <SpaceMark key={sp.n} n={sp.n} active={hl.has(sp.n)} onClick={onSpace && hl.has(sp.n) ? () => onSpace(sp.n) : undefined} />
      ))}
      {Object.values(STATIONS).map((st) => (
        <StationLabel key={st.id} id={st.id} />
      ))}
      {branches.map((b) => (
        <Branches key={b} n={b} />
      ))}
      {supply
        ? Object.entries(supply).map(([st, bag]) => {
            const items = Object.entries(bag ?? {}).filter(([, v]) => (v ?? 0) > 0) as [ItemId, number][];
            if (!items.length) return null;
            const p = inward(STATIONS[st as StationId].space, 15);
            return (
              <g key={st} aria-label={`Zásoby ${STATIONS[st as StationId].short}`}>
                {items.map(([k, v], i) => (
                  <TokenShape key={k} id={k} x={p.x + (i - (items.length - 1) / 2) * 10} y={p.y} r={3.8} count={v} />
                ))}
              </g>
            );
          })
        : null}
      {children}
    </svg>
  );
}
