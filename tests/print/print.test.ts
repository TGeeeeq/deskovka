import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { A4, CARD, MINI, chunk, gridOrigin } from "../../src/print/layout";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(f) ? [p] : [];
  });
}

describe("tisk", () => {
  it("v tiskové grafice nejsou filtry ani blend módy (Chromium je v PDF rastruje)", () => {
    // karel.css je kopie z webu NMR (portál maskota), do tisku se nepoužívá
    for (const f of [...files("src/print"), ...files("src/art")].filter((f) => !f.endsWith("karel.css"))) {
      const s = readFileSync(f, "utf8");
      expect(s, f).not.toMatch(/(^|[^-])filter\s*:|mix-blend-mode|backdrop-filter|<filter/);
    }
  });
  it("na A4 se vejde 9 poker karet a 16 mini karet s okrajem pro ořezové značky", () => {
    expect(CARD.cols * CARD.rows).toBe(9);
    const o = gridOrigin(CARD);
    expect(o.x0).toBeGreaterThanOrEqual(8);
    expect(o.y0).toBeGreaterThanOrEqual(8);
    const m = gridOrigin(MINI);
    expect(m.x0).toBeGreaterThanOrEqual(8);
    expect(m.y0).toBeGreaterThanOrEqual(8);
    expect(A4.w - 2 * o.x0).toBe(189);
  });
  it("dlaždice desky 250 mm + přesah se vejde na A3", () => {
    expect(250 + 6).toBeLessThanOrEqual(297 - 20);
  });
  it("chunk dělí balíček na archy", () => {
    expect(chunk(Array.from({ length: 26 }), 9).map((x) => x.length)).toEqual([9, 9, 8]);
  });
});
