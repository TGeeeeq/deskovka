import { SHORTCUTS, SPACES } from "@data/board";

export type XY = { x: number; y: number };

export const CENTER: XY = { x: 250, y: 252 };
export const spaceXY = (n: number): XY => ({ x: SPACES[n - 1].x, y: SPACES[n - 1].y });

/** Bod posunutý od pole směrem ke středu desky (kresby stanic). */
export function inward(n: number, d: number): XY {
  const p = spaceXY(n);
  const dx = CENTER.x - p.x;
  const dy = CENTER.y - p.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: p.x + (dx / l) * d, y: p.y + (dy / l) * d };
}

export function outward(n: number, d: number): XY {
  return inward(n, -d);
}

/** Uzavřená hladká křivka přes všechna pole (Catmull-Rom → Bézier). */
export function loopPath(): string {
  const pts = SPACES.map((s) => ({ x: s.x, y: s.y }));
  const n = pts.length;
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** Zkratka jako oblouk, který se vyhne středovému panelu. */
export function shortcutPath(id: string): { d: string; mid: XY } {
  const sc = SHORTCUTS.find((s) => s.id === id)!;
  const a = spaceXY(sc.a);
  const b = spaceXY(sc.b);
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const dx = m.x - CENTER.x;
  const dy = m.y - CENTER.y;
  const l = Math.hypot(dx, dy) || 1;
  const bow = id === "potok" ? -34 : id === "sad" ? 50 : 28;
  const c = { x: m.x + (dx / l) * bow, y: m.y + (dy / l) * bow };
  const mid = { x: (a.x + 2 * c.x + b.x) / 4, y: (a.y + 2 * c.y + b.y) / 4 };
  return { d: `M${a.x} ${a.y} Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x} ${b.y}`, mid };
}

/** Místo pro figurky na poli — víc zvířat se rozestoupí. */
export function pawnSlot(n: number, i: number, of: number): XY {
  const p = spaceXY(n);
  if (of <= 1) return p;
  const a = -Math.PI / 2 + (i / of) * Math.PI * 2;
  const r = of === 2 ? 9 : 12;
  return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
}
