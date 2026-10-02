import type { StationId } from "@data/types";

/** Kresby stanic perem a vodovkou. Lokální souřadnice v mm, rámeček ~±16.
 *  Jen cesty a výplně — žádné filtry, ať je tisk ostrý (Chromium filtry v PDF rastruje). */

const INK = "#3d3326";
const W = 0.9;

function Tree({ x = 0, y = 0, s = 1, fruit }: { x?: number; y?: number; s?: number; fruit?: string[] }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={1.5} cy={7.5} rx={6} ry={1.8} fill="#3d3a1a" opacity={0.22} />
      <line x1={0} y1={3} x2={0} y2={7.5} stroke={INK} strokeWidth={1.3} />
      <path d="M-6,1 C-8,-4 -4,-8 0,-7.5 C4,-8.5 8,-5 7,-1 C8,3 3,5 0,4.5 C-3,5.5 -7,4 -6,1 Z" fill="#6f8a45" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
      <path d="M-3.5,-2.5 C-3.5,-5 -1,-6 1,-5" fill="none" stroke="#a3b870" strokeWidth={1.1} strokeLinecap="round" />
      {fruit?.map((f, i) => (
        <circle key={i} cx={[-3, 2.5, 0, 4][i % 4]} cy={[0, -2, 2, 1][i % 4]} r={1.1} fill={f} stroke="#4a1a10" strokeWidth={0.3} />
      ))}
    </g>
  );
}

function Grass({ x, y }: { x: number; y: number }) {
  return <path d={`M${x - 2},${y} l1,-3 l1,3 M${x + 1},${y} l1.2,-4 l0.8,4`} stroke="#4f5f2a" strokeWidth={0.7} fill="none" strokeLinecap="round" />;
}

export function StationArt({ id }: { id: StationId }) {
  switch (id) {
    case "brana":
      return (
        <g>
          <ellipse cx={0} cy={9} rx={15} ry={3} fill="#3d3a1a" opacity={0.18} />
          <rect x={-13} y={-8} width={3} height={17} fill="#8a6a3e" stroke={INK} strokeWidth={W} />
          <rect x={10} y={-8} width={3} height={17} fill="#8a6a3e" stroke={INK} strokeWidth={W} />
          <path d="M-10,-4 H10 M-10,1 H10 M-10,6 H10 M-10,6 L10,-4" stroke={INK} strokeWidth={1.1} />
          <path d="M-20,9 q1,-7 6,-7 q6,0 6,7 Z" fill="#a8a196" stroke={INK} strokeWidth={W} />
          <path d="M-17,3 q2,-2 4,-1" stroke="#d6d0c4" strokeWidth={0.9} fill="none" />
        </g>
      );
    case "senik":
      return (
        <g>
          <ellipse cx={1} cy={10} rx={16} ry={3} fill="#3d3a1a" opacity={0.2} />
          <path d="M-14,9 V-3 L0,-13 L14,-3 V9 Z" fill="#c9a766" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
          <path d="M-16,-2 L0,-15 L16,-2" fill="none" stroke="#9a3b25" strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" />
          <path d="M-5,9 V0 H5 V9" fill="#6b4a2a" stroke={INK} strokeWidth={W} />
          <path d="M-5,0 L5,9 M5,0 L-5,9" stroke="#c9a766" strokeWidth={0.7} />
          <path d="M-12,9 q3,-5 6,0 M6,9 q3,-5 6,0" fill="#e0bf5c" stroke="#8a6a1e" strokeWidth={0.6} />
        </g>
      );
    case "kompost":
      return (
        <g>
          <ellipse cx={0} cy={9} rx={13} ry={2.6} fill="#3d3a1a" opacity={0.2} />
          <path d="M-11,9 V-2 H11 V9" fill="none" stroke="#8a6a3e" strokeWidth={2} />
          <path d="M-11,3 H11 M-11,-2 H11" stroke="#8a6a3e" strokeWidth={1.3} />
          <path d="M-9,8 q2,-11 9,-11 q7,0 9,11 Z" fill="#5a4128" stroke={INK} strokeWidth={W} />
          <path d="M-3,-2 q2,-3 4,0 M2,2 q2,-2 4,0" stroke="#7b9a4a" strokeWidth={1} fill="none" />
        </g>
      );
    case "louka":
      return (
        <g>
          <path d="M-17,8 Q0,-1 17,8 Z" fill="#b9c27d" stroke="#5c6a30" strokeWidth={W} />
          {[-12, -7, -2, 3, 8, 12].map((x, i) => (
            <Grass key={i} x={x} y={6 - (i % 2) * 2} />
          ))}
          <path d="M-14,0 Q-6,-9 4,-12" fill="none" stroke="#8a6a3e" strokeWidth={1.3} strokeLinecap="round" />
          <path d="M4,-12 q5,1 7,6" fill="none" stroke="#a8a196" strokeWidth={1.6} strokeLinecap="round" />
          <path d="M-4,-5 l1.5,-1 l1,1.5 l-1.5,1 Z" fill="#e2c44a" />
          <circle cx={9} cy={-1} r={1.2} fill="#f2ede2" stroke={INK} strokeWidth={0.3} />
        </g>
      );
    case "tresne":
      return (
        <g>
          <Tree x={-7} y={-1} s={1.05} fruit={["#b8323f", "#d4596a", "#b8323f"]} />
          <Tree x={7} y={2} s={0.95} fruit={["#b8323f", "#b8323f", "#d4596a"]} />
        </g>
      );
    case "sad":
      return (
        <g>
          <Tree x={-8} y={2} s={0.9} fruit={["#c0492c", "#d97a2c"]} />
          <Tree x={0} y={-4} s={1.1} fruit={["#c0492c", "#c0492c", "#e0a030"]} />
          <Tree x={8} y={3} s={0.85} fruit={["#d97a2c", "#c0492c"]} />
        </g>
      );
    case "svestky":
      return (
        <g>
          <Tree x={-7} y={0} s={1} fruit={["#5b3f86", "#5b3f86", "#7a5aa0"]} />
          <Tree x={7} y={1} s={1} fruit={["#c0492c", "#5b3f86"]} />
        </g>
      );
    case "potok":
      return (
        <g>
          <path d="M-18,6 C-8,0 -4,10 6,4 S14,2 18,6" fill="none" stroke="#93b7bd" strokeWidth={4} strokeLinecap="round" />
          <path d="M-18,6 C-8,0 -4,10 6,4 S14,2 18,6" fill="none" stroke="#3f5f6b" strokeWidth={0.6} strokeDasharray="2 2" />
          <line x1={-6} y1={2} x2={-6} y2={-6} stroke={INK} strokeWidth={1.4} />
          <path d="M-6,-6 C-12,-8 -14,0 -13,4 M-6,-6 C-9,-10 -3,-12 -1,-6 M-6,-6 C0,-9 4,-4 2,2 M-6,-6 C-8,-3 -9,2 -9,5" fill="none" stroke="#6f8a45" strokeWidth={1.3} strokeLinecap="round" />
          <path d="M8,-2 l2,-6 M11,-1 l1,-5" stroke="#5c6a30" strokeWidth={0.8} />
        </g>
      );
    case "zahradka":
      return (
        <g>
          <path d="M-2,8 V-2 A9,9 0 0 1 16,-2 V8 Z" fill="#e6efe4" stroke={INK} strokeWidth={W} />
          <path d="M7,-11 V8 M2,-9 V8 M12,-9 V8" stroke="#9fb5a0" strokeWidth={0.6} />
          <rect x={-17} y={2} width={13} height={6} rx={1.5} fill="#6b4a2a" stroke={INK} strokeWidth={W} />
          {[-15, -11, -7].map((x) => (
            <path key={x} d={`M${x},2 q-1.5,-3 0,-5 q1.5,2 0,5`} fill="#8a6bb0" stroke="#3e2a5a" strokeWidth={0.4} />
          ))}
          <path d="M-14,-1 q1,-3 3,-3" stroke="#6f8a45" strokeWidth={0.8} fill="none" />
        </g>
      );
    case "solar":
      return (
        <g>
          <path d="M-16,-3 L-2,-9 L2,1 L-12,7 Z" fill="#3f5f7a" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
          <path d="M-14,-1 L-0.5,-6.6 M-12.5,2 L1,-3.6 M-11.3,-6.3 L-7.3,4.6 M-6.7,-8 L-2.7,2.8" stroke="#8fb0c8" strokeWidth={0.5} />
          <line x1={-7} y1={5} x2={-7} y2={10} stroke={INK} strokeWidth={1.2} />
          <ellipse cx={9} cy={8} rx={6} ry={2} fill="#a8a196" stroke={INK} strokeWidth={W} />
          <path d="M3,8 V1 H15 V8" fill="#c2b9a8" stroke={INK} strokeWidth={W} />
          <path d="M5,1 V-8 H13 V1 M4,-8 H14" fill="none" stroke="#8a6a3e" strokeWidth={1.2} />
          <path d="M9,-8 V-2" stroke={INK} strokeWidth={0.6} />
          <rect x={7.5} y={-3} width={3} height={2.5} fill="#8a6a3e" stroke={INK} strokeWidth={0.4} />
        </g>
      );
    case "dilna":
      return (
        <g>
          <ellipse cx={0} cy={10} rx={15} ry={2.6} fill="#3d3a1a" opacity={0.2} />
          <path d="M-13,9 V-4 H13 V9 Z" fill="#b08a5a" stroke={INK} strokeWidth={W} />
          <path d="M-15,-3 L-11,-11 H11 L15,-3 Z" fill="#7a6a5a" stroke={INK} strokeWidth={W} strokeLinejoin="round" />
          <path d="M-13,0 H13 M-13,4 H13" stroke="#8a6a3e" strokeWidth={0.6} />
          <rect x={-3} y={0} width={7} height={9} fill="#5a3c28" stroke={INK} strokeWidth={0.6} />
          <path d="M8,1 l7,7 M10,-1 l2,2" stroke="#a8a196" strokeWidth={1.4} strokeLinecap="round" />
          <rect x={-11} y={1} width={5} height={6} fill="#f2ede2" stroke={INK} strokeWidth={0.5} />
        </g>
      );
    case "maringotka":
      return (
        <g>
          <ellipse cx={0} cy={10} rx={15} ry={2.6} fill="#3d3a1a" opacity={0.2} />
          <path d="M-14,5 V-3 Q0,-14 14,-3 V5 Z" fill="#2d5a3d" stroke={INK} strokeWidth={W} />
          <path d="M-14,-3 Q0,-14 14,-3" fill="none" stroke="#b85c3c" strokeWidth={2.2} />
          <rect x={-4} y={-4} width={7} height={6} fill="#f0e892" stroke={INK} strokeWidth={0.6} />
          <path d="M-0.5,-4 V2 M-4,-1 H3" stroke={INK} strokeWidth={0.5} />
          {[-9, 9].map((x) => (
            <g key={x}>
              <circle cx={x} cy={7} r={3.2} fill="#8a6a3e" stroke={INK} strokeWidth={W} />
              <path d={`M${x - 3},7 H${x + 3} M${x},4 V10`} stroke={INK} strokeWidth={0.5} />
            </g>
          ))}
          <path d="M14,1 L19,-1" stroke={INK} strokeWidth={1} />
        </g>
      );
  }
}
