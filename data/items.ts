import type { ItemDef, ItemId, ProductId, ResourceId } from "./types";

export const RESOURCES: ResourceId[] = ["trava", "ovoce", "voda", "prouti", "bylinky", "hnuj", "vlna"];
export const PRODUCTS: ProductId[] = ["seno", "kompost", "susene", "krizaly", "pelisek"];

export const ITEMS: Record<ItemId, ItemDef> = {
  trava: { id: "trava", kind: "resource", name: "Tráva", plural: "Trávy", shape: "triangle", color: "#8bb04f", ink: "#3e5320", tokens: 30 },
  ovoce: { id: "ovoce", kind: "resource", name: "Ovoce", plural: "Ovoce", shape: "circle", color: "#c0492c", ink: "#5e1f10", tokens: 20 },
  voda: { id: "voda", kind: "resource", name: "Voda", plural: "Vody", shape: "drop", color: "#4f8fb0", ink: "#1f4558", tokens: 15 },
  prouti: { id: "prouti", kind: "resource", name: "Proutí", plural: "Proutí", shape: "bar", color: "#a0703e", ink: "#4d3317", tokens: 15 },
  bylinky: { id: "bylinky", kind: "resource", name: "Bylinky", plural: "Bylinek", shape: "leaf", color: "#8a6bb0", ink: "#3e2a5a", tokens: 15 },
  hnuj: { id: "hnuj", kind: "resource", name: "Hnůj", plural: "Hnoje", shape: "pentagon", color: "#6b4a2a", ink: "#2c1d0f", tokens: 15 },
  vlna: { id: "vlna", kind: "resource", name: "Vlna", plural: "Vlny", shape: "cloud", color: "#f2ede2", ink: "#6e6352", tokens: 10 },
  seno: { id: "seno", kind: "product", name: "Seno", plural: "Sena", shape: "square", color: "#e0bf5c", ink: "#6b5216", tokens: 15 },
  kompost: { id: "kompost", kind: "product", name: "Kompost", plural: "Kompostu", shape: "hexagon", color: "#4a3a28", ink: "#1a130b", tokens: 8 },
  susene: { id: "susene", kind: "product", name: "Sušené bylinky", plural: "Sušených bylinek", shape: "diamond", color: "#b39ad0", ink: "#4a3566", tokens: 8 },
  krizaly: { id: "krizaly", kind: "product", name: "Křížaly", plural: "Křížal", shape: "ring", color: "#e3a24a", ink: "#6b4512", tokens: 8 },
  pelisek: { id: "pelisek", kind: "product", name: "Pelíšek", plural: "Pelíšků", shape: "arch", color: "#c27a5a", ink: "#5a2c18", tokens: 6 },
};

export const isProduct = (id: ItemId): id is ProductId => ITEMS[id].kind === "product";
