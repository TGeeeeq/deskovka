// Snímky prezentace + kontrola vodorovného přetečení: node scripts/shot-prez.mjs <outdir>
import { chromium } from "playwright";
const SP = process.argv[2] ?? ".";
const b = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
for (const [name, w, h] of [["desk", 1440, 900], ["mob", 390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 150)));
  await p.goto("http://localhost:4173/prezentace/", { waitUntil: "networkidle" });
  await p.waitForTimeout(4500);
  await p.screenshot({ path: `${SP}/prez-${name}-hero.png` });
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += h * 0.8) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(200);
  }
  const over = await p.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((e) => e.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(e).position !== "fixed")
      .slice(0, 5)
      .map((e) => `${e.tagName}.${String(e.className).slice(0, 40)}`),
  );
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${SP}/prez-${name}-full.png`, fullPage: true });
  console.log(name, "height", H, "overflow", JSON.stringify(over), errs.slice(0, 5).join(" | "));
  await p.close();
}
await b.close();
