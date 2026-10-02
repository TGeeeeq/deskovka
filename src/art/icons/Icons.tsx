import type React from "react";
import { ANIMAL_DEFS } from "@data/animals";
import { ITEMS } from "@data/items";
import type { AnimalId, ItemId, ShapeId, WeatherIcon as WeatherIconId } from "@data/types";

/** Tvar žetonu v rámečku −12…12. Každá surovina má vlastní tvar,
 *  aby se daly rozlišit i bez barvy (barvoslepost, šero v maringotce). */
export function shapePath(shape: ShapeId, r = 10): string {
  const k = r / 10;
  const P = (pts: [number, number][]) => "M" + pts.map(([x, y]) => `${(x * k).toFixed(2)} ${(y * k).toFixed(2)}`).join(" L") + " Z";
  const poly = (n: number, rot = -Math.PI / 2, rr = 10) =>
    P(Array.from({ length: n }, (_, i) => [Math.cos(rot + (i / n) * Math.PI * 2) * rr, Math.sin(rot + (i / n) * Math.PI * 2) * rr]));
  switch (shape) {
    case "triangle":
      return P([[0, -10.5], [10, 8], [-10, 8]]);
    case "circle":
      return `M${-10 * k} 0 a${10 * k} ${10 * k} 0 1 0 ${20 * k} 0 a${10 * k} ${10 * k} 0 1 0 ${-20 * k} 0 Z`;
    case "drop":
      return `M0 ${-11 * k} C ${7 * k} ${-3 * k} ${9 * k} ${1 * k} ${9 * k} ${4 * k} A ${9 * k} ${9 * k} 0 0 1 ${-9 * k} ${4 * k} C ${-9 * k} ${1 * k} ${-7 * k} ${-3 * k} 0 ${-11 * k} Z`;
    case "bar":
      return `M${-10 * k} ${-4 * k} h${20 * k} a${4 * k} ${4 * k} 0 0 1 0 ${8 * k} h${-20 * k} a${4 * k} ${4 * k} 0 0 1 0 ${-8 * k} Z`;
    case "leaf":
      return `M${-10 * k} ${6 * k} C ${-10 * k} ${-6 * k} ${2 * k} ${-11 * k} ${10 * k} ${-10 * k} C ${11 * k} ${-2 * k} ${6 * k} ${10 * k} ${-10 * k} ${6 * k} Z`;
    case "pentagon":
      return poly(5);
    case "hexagon":
      return poly(6, 0);
    case "cloud":
      return `M${-9 * k} ${6 * k} a${4.5 * k} ${4.5 * k} 0 0 1 ${1 * k} ${-8.8 * k} a${6 * k} ${6 * k} 0 0 1 ${11 * k} ${-2.5 * k} a${5 * k} ${5 * k} 0 0 1 ${6 * k} ${6 * k} a${3.5 * k} ${3.5 * k} 0 0 1 ${-1 * k} ${5.3 * k} Z`;
    case "square":
      return `M${-9 * k} ${-9 * k} h${18 * k} v${18 * k} h${-18 * k} Z`;
    case "diamond":
      return P([[0, -11], [9, 0], [0, 11], [-9, 0]]);
    case "ring":
      return `M${-10 * k} 0 a${10 * k} ${10 * k} 0 1 0 ${20 * k} 0 a${10 * k} ${10 * k} 0 1 0 ${-20 * k} 0 Z M${-4.5 * k} 0 a${4.5 * k} ${4.5 * k} 0 1 1 ${9 * k} 0 a${4.5 * k} ${4.5 * k} 0 1 1 ${-9 * k} 0 Z`;
    case "arch":
      return `M${-9 * k} ${9 * k} v${-9 * k} l${9 * k} ${-9 * k} l${9 * k} ${9 * k} v${9 * k} Z`;
    case "star":
      return P(Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const rr = i % 2 ? 4.6 : 10.5;
        return [Math.cos(a) * rr, Math.sin(a) * rr] as [number, number];
      }));
  }
}

/** Malý symbol uvnitř žetonu — čte se i při nejmenší velikosti. */
function Glyph({ id }: { id: ItemId }) {
  const c = "rgba(255,255,255,.85)";
  switch (id) {
    case "trava":
      return <path d="M-3 5 L-1 -3 M1 5 L2 -4 M4 5 L6 0" stroke={c} strokeWidth={1.6} strokeLinecap="round" fill="none" />;
    case "ovoce":
      return <path d="M0 -4 Q2 -8 5 -8" stroke="#2f5a1c" strokeWidth={1.8} fill="none" strokeLinecap="round" />;
    case "voda":
      return <path d="M-3 3 Q0 6 3 3" stroke={c} strokeWidth={1.6} fill="none" strokeLinecap="round" />;
    case "prouti":
      return <path d="M-7 0 H7" stroke="rgba(255,255,255,.5)" strokeWidth={1.2} strokeDasharray="2 2" />;
    case "bylinky":
      return <path d="M-6 4 Q0 -1 7 -7" stroke={c} strokeWidth={1.3} fill="none" />;
    case "hnuj":
      return <circle r={2} fill="rgba(255,255,255,.35)" />;
    case "vlna":
      return <path d="M-4 1 q2 -3 4 0 q2 -3 4 0" stroke="#9c8f78" strokeWidth={1.2} fill="none" />;
    case "seno":
      return <path d="M-6 -3 H6 M-6 0 H6 M-6 3 H6" stroke="#9a7a24" strokeWidth={1.1} />;
    case "kompost":
      return <path d="M-3 2 L0 -3 L3 2 Z" fill="#7b9a4a" />;
    case "susene":
      return <path d="M0 -5 V5 M-3 -1 L0 -4 L3 -1" stroke={c} strokeWidth={1.2} fill="none" />;
    case "krizaly":
      return null;
    case "pelisek":
      return <path d="M-4 6 V2 a4 4 0 0 1 8 0 V6" stroke="#f3e2c8" strokeWidth={1.4} fill="none" />;
  }
}

export function ItemIcon({ id, size = 22, title, className }: { id: ItemId; size?: number; title?: string; className?: string }) {
  const it = ITEMS[id];
  return (
    <svg viewBox="-12.5 -12.5 25 25" width={className ? undefined : size} height={className ? undefined : size} role="img" aria-label={title ?? it.name} className={className ?? "inline-block shrink-0"}>
      <path d={shapePath(it.shape)} fill={it.color} stroke={it.ink} strokeWidth={1.2} fillRule="evenodd" strokeLinejoin="round" />
      {it.kind === "product" ? <path d={shapePath(it.shape, 7.4)} fill="none" stroke="rgba(255,255,255,.45)" strokeWidth={0.9} fillRule="evenodd" /> : null}
      <Glyph id={id} />
    </svg>
  );
}

export function HeartIcon({ size = 18, filled = true, className }: { size?: number; filled?: boolean; className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" width={className ? undefined : size} height={className ? undefined : size} aria-hidden="true" className={className ?? "inline-block shrink-0"}>
      <path
        d="M0 9 C -9 3 -11 -3 -7 -7 C -4 -10 -1 -8 0 -5 C 1 -8 4 -10 7 -7 C 11 -3 9 3 0 9 Z"
        fill={filled ? "#c4553b" : "none"}
        stroke="#7a2a18"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {filled ? <path d="M-5 -4 Q-4 -6 -2 -6" stroke="#f2b3a2" strokeWidth={1.4} fill="none" strokeLinecap="round" /> : null}
    </svg>
  );
}

export function StarIcon({ size = 18, filled = true, className }: { size?: number; filled?: boolean; className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" width={className ? undefined : size} height={className ? undefined : size} aria-hidden="true" className={className ?? "inline-block shrink-0"}>
      <path d={shapePath("star", 10.5)} fill={filled ? "#e2b23c" : "none"} stroke="#7a5512" strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}

/** Značka hráče: tvar + číslice v barevném kroužku. Barva nikdy nenese informaci sama. */
export function Marker({ id, size = 28, className }: { id: AnimalId; size?: number; className?: string }) {
  const m = ANIMAL_DEFS[id].marker;
  return (
    <svg viewBox="-14 -14 28 28" width={className ? undefined : size} height={className ? undefined : size} role="img" aria-label={`${ANIMAL_DEFS[id].name}, značka ${m.numeral}`} className={className ?? "inline-block shrink-0"}>
      <circle r={13} fill="#fffaf0" stroke={m.ring} strokeWidth={3} />
      <path d={shapePath(m.shape, 8.5)} fill={m.ring} opacity={0.22} />
      <text y={4.6} textAnchor="middle" fontSize={13} fontWeight={700} fill={m.ring} fontFamily="Fraunces, Georgia, serif">
        {m.numeral}
      </text>
    </svg>
  );
}

export function WeatherGlyph({ icon, size = 40, className }: { icon: WeatherIconId; size?: number; className?: string }) {
  const sun = (
    <g>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <line key={i} x1={Math.cos(a) * 11} y1={Math.sin(a) * 11} x2={Math.cos(a) * 15} y2={Math.sin(a) * 15} stroke="#c98a12" strokeWidth={2.2} strokeLinecap="round" />;
      })}
      <circle r={8} fill="#f2c14a" stroke="#c98a12" strokeWidth={1.6} />
    </g>
  );
  const cloud = (dx = 0, dy = 0, fill = "#f4f1ea") => (
    <path
      transform={`translate(${dx} ${dy})`}
      d="M-11 6 a5 5 0 0 1 1 -9.5 a7 7 0 0 1 13 -2 a6 6 0 0 1 7.5 6.5 a4.5 4.5 0 0 1 -1.5 5 Z"
      fill={fill}
      stroke="#6e6a5f"
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  );
  const drops = (
    <g stroke="#3f7fa8" strokeWidth={2} strokeLinecap="round">
      <line x1={-6} y1={10} x2={-8} y2={15} />
      <line x1={0} y1={10} x2={-2} y2={15} />
      <line x1={6} y1={10} x2={4} y2={15} />
    </g>
  );
  let body: React.ReactElement;
  switch (icon) {
    case "slunce":
      body = sun;
      break;
    case "polojasno":
      body = (
        <g>
          <g transform="translate(-5 -5) scale(.8)">{sun}</g>
          {cloud(3, 3)}
        </g>
      );
      break;
    case "dest":
      body = (
        <g>
          {cloud(0, -3, "#dfe3e6")}
          {drops}
        </g>
      );
      break;
    case "bourka":
      body = (
        <g>
          {cloud(0, -4, "#a9b0b8")}
          <path d="M1 3 L-4 11 L1 11 L-2 18 L7 7 L2 7 L5 3 Z" fill="#f2c14a" stroke="#8a5d08" strokeWidth={1.2} strokeLinejoin="round" />
        </g>
      );
      break;
    case "vitr":
      body = (
        <g fill="none" stroke="#5f7f6b" strokeWidth={2.4} strokeLinecap="round">
          <path d="M-14 -5 H6 a4 4 0 1 0 -4 -4" />
          <path d="M-14 2 H11 a4 4 0 1 1 -4 4" />
          <path d="M-12 9 H2" />
        </g>
      );
      break;
    case "mraz":
      body = (
        <g stroke="#4f86b0" strokeWidth={2} strokeLinecap="round">
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI;
            return <line key={i} x1={Math.cos(a) * -13} y1={Math.sin(a) * -13} x2={Math.cos(a) * 13} y2={Math.sin(a) * 13} />;
          })}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            const x = Math.cos(a) * 9;
            const y = Math.sin(a) * 9;
            return <circle key={i} cx={x} cy={y} r={1.6} fill="#4f86b0" stroke="none" />;
          })}
        </g>
      );
      break;
  }
  return (
    <svg viewBox="-17 -17 34 34" width={className ? undefined : size} height={className ? undefined : size} aria-hidden="true" className={className ?? "inline-block shrink-0"}>
      {body}
    </svg>
  );
}
