// Screenshot helper: node scripts/shot.mjs <url> <out.png> [width] [height]
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const [url, out, w = "1280", h = "900"] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1.5 });
p.on("pageerror", (e) => console.error("PAGEERROR", e.message));
p.on("console", (m) => m.type() === "error" && console.error("CONSOLE", m.text()));
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(Number(process.env.WAIT ?? 600));
await p.screenshot({ path: out });
await b.close();
