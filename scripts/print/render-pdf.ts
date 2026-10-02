/** Tisková PDF: npm run print [-- --skip-build] [--cmyk]
 *  vite build → vite preview → Chromium (Playwright) page.pdf → pdf-lib (čísla stran, booklet, kontrola rozměrů). */
import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { preview } from "vite";

const args = process.argv.slice(2);
const OUT = "out/print";
const MM = 72 / 25.4;

type Job = { route: string; file: string; w: number; h: number; numbers?: boolean };
const JOBS: Job[] = [
  { route: "pnp", file: "karty-pnp-a4.pdf", w: 210, h: 297 },
  { route: "pnp-lice", file: "karty-pnp-a4-jen-lice.pdf", w: 210, h: 297 },
  { route: "karty-pocasi", file: "karty-pocasi-spadavka.pdf", w: 69, h: 94 },
  { route: "karty-potreby", file: "karty-potreby-spadavka.pdf", w: 69, h: 94 },
  { route: "karty-udalosti", file: "karty-udalosti-spadavka.pdf", w: 69, h: 94 },
  { route: "karty-projekty", file: "karty-projekty-spadavka.pdf", w: 69, h: 94 },
  { route: "karty-fakty", file: "karty-vedeli-jste-spadavka.pdf", w: 50, h: 74 },
  { route: "zvirata", file: "tabulky-zvirat-a4.pdf", w: 297, h: 210 },
  { route: "zvirata-spadavka", file: "tabulky-zvirat-spadavka.pdf", w: 111, h: 154 },
  { route: "deska", file: "deska-506mm-spadavka.pdf", w: 506, h: 506 },
  { route: "deska-a3", file: "deska-4x-a3.pdf", w: 297, h: 420 },
  { route: "zetony", file: "zetony-a4.pdf", w: 210, h: 297 },
  { route: "pravidla", file: "pravidla-a5.pdf", w: 148, h: 210, numbers: true },
  { route: "karta-pomoci", file: "karta-pomoci-a4.pdf", w: 210, h: 297 },
];

async function addPageNumbers(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.getPages().forEach((p, i) => {
    if (i === 0) return;
    const t = String(i + 1);
    const w = font.widthOfTextAtSize(t, 8);
    p.drawText(t, { x: p.getWidth() / 2 - w / 2, y: 7 * MM, size: 8, font, color: rgb(0.35, 0.3, 0.22) });
  });
  return doc.save();
}

/** A5 → A4 na šířku pro sešitovou vazbu (počet stran zaokrouhlen na násobek 4). */
async function booklet(bytes: Uint8Array) {
  const src = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  const n = Math.ceil(src.getPageCount() / 4) * 4;
  const pages = await out.embedPages(src.getPages());
  const W = 297 * MM;
  const H = 210 * MM;
  for (let s = 0; s < n / 2; s++) {
    const left = s % 2 === 0 ? n - 1 - s : s;
    const right = s % 2 === 0 ? s : n - 1 - s;
    const page = out.addPage([W, H]);
    [left, right].forEach((idx, k) => {
      const p = pages[idx];
      if (p) page.drawPage(p, { x: k * (W / 2), y: 0, width: W / 2, height: H });
    });
  }
  return out.save();
}

async function check(file: string, w: number, h: number) {
  const doc = await PDFDocument.load(readFileSync(`${OUT}/${file}`));
  doc.getPages().forEach((p, i) => {
    const pw = p.getWidth() / MM;
    const ph = p.getHeight() / MM;
    if (Math.abs(pw - w) > 0.8 || Math.abs(ph - h) > 0.8) throw new Error(`${file} strana ${i + 1}: ${pw.toFixed(1)}×${ph.toFixed(1)} mm, čekáno ${w}×${h}`);
  });
  return doc.getPageCount();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  if (!args.includes("--skip-build")) execSync("npx vite build", { stdio: "inherit" });
  const server = await preview({ preview: { port: 4185, strictPort: false }, logLevel: "warn" });
  const url = server.resolvedUrls?.local[0] ?? "http://localhost:4185/";
  const browser = await chromium.launch();
  const report: string[] = [];
  try {
    for (const job of JOBS) {
      const page = await browser.newPage();
      await page.goto(`${url}tisk/#${job.route}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      let pdf: Uint8Array = await page.pdf({ preferCSSPageSize: true, printBackground: true });
      if (job.numbers) pdf = await addPageNumbers(pdf);
      writeFileSync(`${OUT}/${job.file}`, pdf);
      const pages = await check(job.file, job.w, job.h);
      report.push(`${job.file.padEnd(36)} ${String(pages).padStart(3)} str.  ${job.w}×${job.h} mm`);
      if (job.route === "pravidla") {
        writeFileSync(`${OUT}/pravidla-booklet-a4.pdf`, await booklet(pdf));
        report.push(`${"pravidla-booklet-a4.pdf".padEnd(36)} ${String(await check("pravidla-booklet-a4.pdf", 297, 210)).padStart(3)} str.  297×210 mm (oboustranně, přeložit)`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise<void>((r) => server.httpServer.close(() => r()));
  }
  if (args.includes("--cmyk")) {
    const gs = spawnSync("gs", ["--version"]);
    if (gs.status !== 0) report.push("CMYK: Ghostscript (gs) není nainstalovaný — PDF zůstávají v RGB. Pro ofset: gs -sDEVICE=pdfwrite -dPDFX -sColorConversionStrategy=CMYK -sOutputICCProfile=ISOcoated_v2_eci.icc");
    else
      for (const job of JOBS)
        execSync(`gs -q -dNOPAUSE -dBATCH -dPDFX -sDEVICE=pdfwrite -sColorConversionStrategy=CMYK -sProcessColorModel=DeviceCMYK -sOutputFile=${OUT}/cmyk-${job.file} ${OUT}/${job.file}`);
  }
  const readme = `Než přijde zima — tisková data (vygenerováno ${new Date().toISOString().slice(0, 10)})\n\n${report.join("\n")}\n\nPostup: docs/TISK.md. Vše je v RGB (domácí a digitální tisk). Tiskni na 100 %, bez přizpůsobení stránce.\nPrvní vydání jen pro hraní na Louce — ne k prodeji ani darování (to vyžaduje EN 71 + CE).\n`;
  writeFileSync(`${OUT}/README.txt`, readme);
  console.log(readme);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
