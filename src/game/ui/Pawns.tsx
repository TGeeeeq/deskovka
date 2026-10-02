import { motion } from "motion/react";
import { ANIMAL_DEFS } from "@data/animals";
import type { AnimalId, ItemId } from "@data/types";
import { AnimalSvg } from "@art/karel/AnimalSvg";
import { viewBoxAttr } from "@art/karel/anatomy";
import { TokenShape } from "@art/board/Board";
import { pawnSlot, spaceXY, type XY } from "@art/board/geometry";
import type { GameState } from "@engine/types";
import { useReducedMotion } from "../useMedia";

export type MoveAnim = { path: number[]; nonce: number };

function Pawn({ id, at, path, active, faceLeft, nonce, carrying }: { id: AnimalId; at: XY; path?: XY[]; active: boolean; faceLeft: boolean; nonce: number; carrying: number }) {
  const reduced = useReducedMotion();
  const m = ANIMAL_DEFS[id].marker;
  const xs = path && !reduced ? [...path.map((p) => p.x), at.x] : at.x;
  const ys = path && !reduced ? [...path.map((p) => p.y), at.y] : at.y;
  const dur = path && !reduced ? Math.min(2.4, 0.2 * path.length + 0.15) : 0.35;
  return (
    <motion.g key={nonce} initial={false} animate={{ x: xs, y: ys }} transition={{ duration: dur, ease: "easeInOut" }} style={{ pointerEvents: "none" }}>
      <g transform="scale(1.3)">
      <ellipse cx={0} cy={1.5} rx={8.5} ry={3.4} fill={m.ring} opacity={active ? 0.95 : 0.75} stroke="#3d3326" strokeWidth={0.5} />
      {active ? <ellipse cx={0} cy={1.5} rx={11} ry={4.6} fill="none" stroke="#f0e892" strokeWidth={1.4} className="nz-pulse" /> : null}
      <g className={active ? "karel-bob" : undefined}>
        <svg x={-12.5} y={-19.5} width={25} height={21.5} viewBox={viewBoxAttr} overflow="visible">
          <g transform={faceLeft ? "translate(24 0) scale(-1 1)" : undefined}>
            <AnimalSvg id={id} shadow={false} className="" />
          </g>
        </svg>
      </g>
      <g transform="translate(8.5 -15)">
        <circle r={3.6} fill="#fffaf0" stroke={m.ring} strokeWidth={0.9} />
        <text y={1.45} textAnchor="middle" fontSize={4.2} fontWeight={700} fill={m.ring} fontFamily="Fraunces, serif">
          {m.numeral}
        </text>
      </g>
      {carrying > 0 ? (
        <g transform="translate(-9 -14)">
          <circle r={3.3} fill="#3d3326" />
          <text y={1.3} textAnchor="middle" fontSize={3.6} fontWeight={700} fill="#fffaf0" fontFamily="Plus Jakarta Sans, sans-serif">
            {carrying}
          </text>
        </g>
      ) : null}
      </g>
    </motion.g>
  );
}

export function Pawns({ s, moves, extra }: { s: GameState; moves: Partial<Record<AnimalId, MoveAnim>>; extra?: { wheelbarrow?: boolean } }) {
  const ids = s.seat;
  const groups = new Map<number, AnimalId[]>();
  for (const id of ids) {
    const a = s.animals[id]!;
    groups.set(a.pos, [...(groups.get(a.pos) ?? []), id]);
  }
  const activeId = s.turn?.animal;
  return (
    <g>
      {s.geese !== null ? (
        <g transform={`translate(${spaceXY(s.geese).x - 9} ${spaceXY(s.geese).y + 8})`} aria-label="Husy">
          <ellipse cx={0} cy={2} rx={6} ry={2} fill="#3d3a1a" opacity={0.2} />
          <path d="M-5,1 q0,-4 4,-4 q2,-5 3,-6 l1.5,0.5 q-1,2 -2,6 q4,1 3,4 Z" fill="#f7f3ea" stroke="#3d3326" strokeWidth={0.5} />
          <path d="M3.5,-9 l2,0.8" stroke="#e08a2a" strokeWidth={1} />
        </g>
      ) : null}
      {s.lucinka !== null ? (
        <g transform={`translate(${spaceXY(s.lucinka).x + 10} ${spaceXY(s.lucinka).y + 8})`} aria-label="Lucinka">
          <circle r={3.6} fill="#f2ede2" stroke="#6e6352" strokeWidth={0.6} />
          <circle cx={3} cy={-1} r={1.8} fill="#9a8268" />
        </g>
      ) : null}
      {s.wheelbarrow.pos !== null && !s.wheelbarrow.carrier && extra?.wheelbarrow !== false ? (
        <g transform={`translate(${spaceXY(s.wheelbarrow.pos).x - 10} ${spaceXY(s.wheelbarrow.pos).y - 9})`} aria-label="Kolečko">
          <path d="M-5,0 H4 L2,3 H-4 Z" fill="#8a6a3e" stroke="#3d3326" strokeWidth={0.5} />
          <circle cx={3} cy={4} r={1.6} fill="#3d3326" />
          <path d="M-5,0 L-8,-2" stroke="#3d3326" strokeWidth={0.7} />
        </g>
      ) : null}
      {ids.map((id) => {
        const a = s.animals[id]!;
        const g = groups.get(a.pos)!;
        const at = pawnSlot(a.pos, g.indexOf(id), g.length);
        const mv = moves[id];
        const path = mv && mv.path[mv.path.length - 1] === a.pos ? mv.path.slice(0, -1).map((n) => spaceXY(n)) : undefined;
        const cx = spaceXY(a.pos).x;
        const carrying = Object.values(a.cargo).reduce((x, y) => x + (y ?? 0), 0) + (a.lucinka ? 1 : 0);
        return <Pawn key={id} id={id} at={at} path={path} active={id === activeId} faceLeft={cx > 250} nonce={mv?.nonce ?? 0} carrying={carrying} />;
      })}
    </g>
  );
}

export type Floaty = { key: number; x: number; y: number; item?: ItemId; text?: string; n: number };

export function Floaties({ items }: { items: Floaty[] }) {
  return (
    <g style={{ pointerEvents: "none" }}>
      {items.map((f) => (
        <motion.g key={f.key} initial={{ x: f.x, y: f.y, opacity: 0 }} animate={{ x: f.x, y: f.y - 16, opacity: [0, 1, 1, 0] }} transition={{ duration: 1.6, ease: "easeOut" }}>
          <rect x={-9} y={-5.5} width={18} height={11} rx={5.5} fill="#fffaf0" stroke="#3d3326" strokeWidth={0.5} />
          {f.item ? <TokenShape id={f.item} x={-3.5} y={0} r={3.2} /> : null}
          <text x={f.item ? 3.5 : 0} y={1.7} textAnchor="middle" fontSize={4.8} fontWeight={700} fill="#1f3d2a" fontFamily="Plus Jakarta Sans, sans-serif">
            {f.text ?? `${f.n > 0 ? "+" : ""}${f.n}`}
          </text>
        </motion.g>
      ))}
    </g>
  );
}
