/** Čistá matematika tiskových archů (testuje se bez prohlížeče). */
export const A4 = { w: 210, h: 297 } as const;
export const BLEED = 3;
export type Grid = { cols: number; rows: number; w: number; h: number };
export const CARD: Grid = { cols: 3, rows: 3, w: 63, h: 88 };
export const MINI: Grid = { cols: 4, rows: 4, w: 44, h: 68 };

export function gridOrigin(g: Grid, page = A4) {
  return { x0: (page.w - g.cols * g.w) / 2, y0: (page.h - g.rows * g.h) / 2 };
}

export function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
