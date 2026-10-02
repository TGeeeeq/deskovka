/** Zápis binárního STL a skládání tiskových desek. */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Manifold } from "manifold-3d";
import { W } from "./wasm";

export function stlBuffer(m: Manifold, name = "nez-prijde-zima"): Buffer {
  const mesh = m.getMesh();
  const { vertProperties: vp, triVerts: tv, numProp: np } = mesh;
  const nTri = tv.length / 3;
  const buf = Buffer.alloc(84 + nTri * 50);
  buf.write(name.slice(0, 79), 0, "ascii");
  buf.writeUInt32LE(nTri, 80);
  let o = 84;
  for (let t = 0; t < nTri; t++) {
    const p = [0, 1, 2].map((k) => {
      const v = tv[t * 3 + k] * np;
      return [vp[v], vp[v + 1], vp[v + 2]];
    });
    const ux = p[1][0] - p[0][0];
    const uy = p[1][1] - p[0][1];
    const uz = p[1][2] - p[0][2];
    const vx = p[2][0] - p[0][0];
    const vy = p[2][1] - p[0][1];
    const vz = p[2][2] - p[0][2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    for (const f of [nx, ny, nz, ...p[0], ...p[1], ...p[2]]) {
      buf.writeFloatLE(f, o);
      o += 4;
    }
    buf.writeUInt16LE(0, o);
    o += 2;
  }
  return buf;
}

export function writeStl(path: string, m: Manifold, name?: string): void {
  const st = m.status();
  if (st !== "NoError") throw new Error(`${path}: Manifold status ${st}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stlBuffer(m, name));
}

/** Rozloží díly na desku `bed × bed` mm po řádcích (podle obrysových
 *  obdélníků, mezera `gap`) a vycentruje na počátek. Díly položí na z = 0.
 *  Když se nevejdou, vyhodí chybu — deska se nesmí potichu oříznout. */
export function plate(parts: Manifold[], bed = 220, gap = 4, margin = 5): Manifold {
  const { Manifold } = W();
  const usable = bed - 2 * margin;
  const placed: Manifold[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  let maxX = 0;
  for (const p of parts) {
    const b = p.boundingBox();
    const w = b.max[0] - b.min[0];
    const h = b.max[1] - b.min[1];
    if (x > 0 && x + w > usable) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    if (w > usable || y + h > usable) throw new Error(`Deska ${bed} mm: díly se nevejdou (${parts.length} ks)`);
    placed.push(p.translate([x - b.min[0], y - b.min[1], -b.min[2]]));
    x += w + gap;
    rowH = Math.max(rowH, h);
    maxX = Math.max(maxX, x - gap);
  }
  const all = Manifold.compose(placed);
  return all.translate([-maxX / 2, -(y + rowH) / 2, 0]);
}

/** Kopie téhož dílu (sdílí síť — skládání je bez booleovských operací). */
export const copies = (m: Manifold, n: number): Manifold[] => Array.from({ length: n }, () => m);
