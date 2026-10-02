// Průchod hrou v prohlížeči: node scripts/walk.mjs <outdir> [w] [h]
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const out = process.argv[2];
const W = +(process.argv[3] ?? 1366), H = +(process.argv[4] ?? 900);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
const clear = async () => {
  for (let i = 0; i < 6; i++) {
    await p.waitForTimeout(300);
    const r = p.getByRole("button", { name: "Rozumím" });
    if (await r.count()) { await r.first().click({ timeout: 1500, force: true }).catch(() => {}); continue; }
    if (await p.locator('[aria-label="Karta"]').count()) { await p.keyboard.press("Escape"); await p.locator('[aria-label="Karta"]').click({ position: { x: 5, y: 5 } }).catch(() => {}); continue; }
  }
};
const step = async (name, fn) => { try { await fn(); } catch (e) { errs.push(`${name}: ${e.message.split("\n")[0]}`); } };
await p.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await p.screenshot({ path: `${out}/01-menu.png` });
await p.getByRole("button", { name: "Nová hra" }).click();
await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/02-setup.png`, fullPage: true });
await p.getByRole("button", { name: /Jdeme na Louku/ }).click();
await p.waitForTimeout(3200);
await clear();
await step("roll", () => p.getByRole("button", { name: /Hodit/ }).click({ timeout: 4000 }));
await p.waitForTimeout(900); await clear();
await p.screenshot({ path: `${out}/04-rolled.png` });
await step("assign", () => p.getByRole("button", { name: /^Jdu o/ }).first().click({ timeout: 4000 }));
await p.waitForTimeout(400); await clear();
await p.screenshot({ path: `${out}/05-move.png` });
await step("move", async () => { const s = p.locator('svg g[role="button"]'); const n = await s.count(); await s.nth(Math.max(0, n - 2)).click({ timeout: 4000 }); });
await p.waitForTimeout(1600); await clear();
await p.screenshot({ path: `${out}/06-act.png` });
console.log(errs.join("\n") || "no errors");
await b.close();
