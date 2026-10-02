import type { Bag, ItemId } from "@data/types";

export const count = (b: Bag, id: ItemId) => b[id] ?? 0;
export const total = (b: Bag) => Object.values(b).reduce((s, n) => s + (n ?? 0), 0);

export function add(b: Bag, id: ItemId, n: number) {
  const v = (b[id] ?? 0) + n;
  if (v <= 0) delete b[id];
  else b[id] = v;
}

export function has(b: Bag, need: Bag) {
  return Object.entries(need).every(([k, v]) => count(b, k as ItemId) >= (v ?? 0));
}

export function sub(b: Bag, need: Bag) {
  for (const [k, v] of Object.entries(need)) add(b, k as ItemId, -(v ?? 0));
}

export const entries = (b: Bag) => Object.entries(b).filter(([, v]) => (v ?? 0) > 0) as [ItemId, number][];
