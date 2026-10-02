/** 2D geometrie pro 3D tisk: body, afinní transformace (stejná konvence jako
 *  SVG `transform`), primitiva (elipsa, zaoblený obdélník, tah čáry) a malý
 *  převaděč SVG cest na polygony.
 *
 *  Všechno tady počítá v souřadnicích ZDROJE (herní jednotky, y dolů jako
 *  v SVG). Do milimetrů s osou y nahoru se převádí až v `toCross()`. */

export type Pt = [number, number];
export type Poly = Pt[];

/** SVG matice [a b c d e f]: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Mat = [number, number, number, number, number, number];

export const I: Mat = [1, 0, 0, 1, 0, 0];

export function mul(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export const translate = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
/** Rotace v radiánech; v souřadnicích s y dolů je kladný úhel po směru hodin
 *  — přesně jako `rotate(deg)` v SVG. */
export const rotate = (a: number, cx = 0, cy = 0): Mat => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return mul(translate(cx, cy), mul([c, s, -s, c, 0, 0], translate(-cx, -cy)));
};
export const scale = (sx: number, sy = sx): Mat => [sx, 0, 0, sy, 0, 0];

export const apply = (m: Mat, p: Pt): Pt => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
export const applyPoly = (m: Mat, poly: Poly): Poly => poly.map((p) => apply(m, p));

export function signedArea(poly: Poly): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

// ---------------------------------------------------------------- primitiva

const SEG = 72;

export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0, n = SEG): Poly {
  const m = rotate(rot, cx, cy);
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return apply(m, [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
  });
}

export const circle = (cx: number, cy: number, r: number, n = SEG) => ellipse(cx, cy, r, r, 0, n);

/** Obdélník se zaoblenými rohy jako SVG `<rect rx>`. */
export function roundRect(x: number, y: number, w: number, h: number, r: number, n = 12): Poly {
  r = Math.min(r, w / 2, h / 2);
  const out: Poly = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  // y dolů: začni vpravo nahoře a jdi po směru hodin (na obrazovce)
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return out;
}

/** Body kruhového oblouku — protějšek `arcPath()` z AnimalSvg (a `ctx.arc`). */
export function arcPoints(cx: number, cy: number, r: number, a0: number, a1: number, n = 48): Poly {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
  });
}

export function quad(p0: Pt, p1: Pt, p2: Pt, n = 24): Poly {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]] as Pt;
  });
}

export function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 24): Poly {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]] as Pt;
  });
}

/** Tah otevřené lomené čáry s kulatými konci (`stroke-linecap: round`)
 *  rozložený na obdélníčky a kolečka — sjednotí je až CrossSection. */
export function strokePolys(line: Poly, width: number): Poly[] {
  const r = width / 2;
  const out: Poly[] = [];
  for (let i = 0; i < line.length; i++) {
    out.push(circle(line[i][0], line[i][1], r, 20));
    if (i === 0) continue;
    const [x1, y1] = line[i - 1];
    const [x2, y2] = line[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) continue;
    const nx = (-dy / len) * r;
    const ny = (dx / len) * r;
    out.push([
      [x1 + nx, y1 + ny],
      [x2 + nx, y2 + ny],
      [x2 - nx, y2 - ny],
      [x1 - nx, y1 - ny],
    ]);
  }
  return out;
}

// ------------------------------------------------------- převod SVG cesty

/** Rozloží SVG `d` na uzavřené podcesty (polygony). Umí M L H V C Q A Z
 *  v absolutní i relativní podobě — přesně to, co používá `shapePath()`
 *  v `src/art/icons/Icons.tsx` a srdíčko z `HeartIcon`. */
export function pathToPolys(d: string, arcSeg = 32): Poly[] {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  let i = 0;
  const num = () => parseFloat(tokens[i++]);
  const isNum = () => i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i]);
  const polys: Poly[] = [];
  let cur: Poly = [];
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let cmd = "";
  const close = () => {
    if (cur.length > 2) polys.push(dedupe(cur));
    cur = [];
  };
  while (i < tokens.length) {
    if (!isNum()) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case "M": {
        close();
        x = ox + num();
        y = oy + num();
        sx = x;
        sy = y;
        cur.push([x, y]);
        cmd = rel ? "l" : "L"; // další dvojice za M jsou L
        break;
      }
      case "L":
        x = ox + num();
        y = oy + num();
        cur.push([x, y]);
        break;
      case "H":
        x = (rel ? x : 0) + num();
        cur.push([x, y]);
        break;
      case "V":
        y = (rel ? y : 0) + num();
        cur.push([x, y]);
        break;
      case "C": {
        const p1: Pt = [ox + num(), oy + num()];
        const p2: Pt = [ox + num(), oy + num()];
        const p3: Pt = [ox + num(), oy + num()];
        cur.push(...cubic([x, y], p1, p2, p3).slice(1));
        [x, y] = p3;
        break;
      }
      case "Q": {
        const p1: Pt = [ox + num(), oy + num()];
        const p2: Pt = [ox + num(), oy + num()];
        cur.push(...quad([x, y], p1, p2).slice(1));
        [x, y] = p2;
        break;
      }
      case "A": {
        const rx = num();
        const ry = num();
        const phi = (num() * Math.PI) / 180;
        const large = num() !== 0;
        const sweep = num() !== 0;
        const x2 = ox + num();
        const y2 = oy + num();
        cur.push(...svgArc([x, y], [x2, y2], rx, ry, phi, large, sweep, arcSeg));
        x = x2;
        y = y2;
        break;
      }
      case "Z":
        x = sx;
        y = sy;
        close();
        break;
      default:
        throw new Error(`pathToPolys: nepodporovaný příkaz ${cmd}`);
    }
  }
  close();
  return polys;
}

function dedupe(p: Poly): Poly {
  const out: Poly = [];
  for (const q of p) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last[0] - q[0], last[1] - q[1]) > 1e-6) out.push(q);
  }
  if (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 1e-6) out.pop();
  return out;
}

/** SVG oblouk (koncové body) → body; postup podle SVG 1.1, příloha F.6.5. */
function svgArc(p1: Pt, p2: Pt, rx: number, ry: number, phi: number, large: boolean, sweep: boolean, n: number): Poly {
  if (rx === 0 || ry === 0) return [p2];
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (p1[0] - p2[0]) / 2;
  const dy = (p1[1] - p2[1]) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let co = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) co = -co;
  const cxp = (co * rx * y1p) / ry;
  const cyp = (-co * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (p1[0] + p2[0]) / 2;
  const cy = sin * cxp + cos * cyp + (p1[1] + p2[1]) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dt > 0) dt -= Math.PI * 2;
  if (sweep && dt < 0) dt += Math.PI * 2;
  const out: Poly = [];
  for (let k = 1; k <= n; k++) {
    const t = t1 + (dt * k) / n;
    const ex = rx * Math.cos(t);
    const ey = ry * Math.sin(t);
    out.push([cos * ex - sin * ey + cx, sin * ex + cos * ey + cy]);
  }
  return out;
}
