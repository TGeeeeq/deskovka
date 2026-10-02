// node scripts/shot-sections.mjs <outdir> [w] [h] — snímky jednotlivých sekcí prezentace
import { chromium } from "playwright";
const [SP = ".", W = "1440", H = "900"] = process.argv.slice(2);
const b = await chromium.launch({ args: ["--use-gl=swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: +W, height: +H } });
await p.goto("http://localhost:4173/prezentace/", { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
const total = await p.evaluate(() => document.documentElement.scrollHeight);
let i = 0;
for (let y = +H; y < total; y += +H * 1.6) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${SP}/sec-${W}-${String(i++).padStart(2, "0")}.png` });
}
console.log("shots", i);
await b.close();
