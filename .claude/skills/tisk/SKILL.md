---
name: tisk
description: Tisková výroba hry Než přijde zima — rozměry, spadávka, zákazy (filtry, emoji), PDF pipeline, 3D tisk a právní minimum (EN 71/CE). Použij při úpravách src/print, src/art, scripts/print, scripts/3d nebo při přípravě výroby.
---

# Tisk a výroba

- Podrobný návod: `docs/TISK.md` (papír, řezání, deska z A3, rozpis ceny) a `docs/3D.md` (figurky, slicer, M600).
- `npm run print` → `out/print/*.pdf` + `README.txt`; skript kontroluje rozměr každé strany a spadne při odchylce.
- `npm run models` → `out/3d/*.stl` (siluety z `src/art/karel/anatomy.ts`, tvary žetonů z `shapePath` v `src/art/icons/Icons.tsx`).

## Rozměry

- Poker karta 63×88 mm, se spadávkou 69×94. Mini 44×68. Tabulka zvířete A6 105×148. Deska 500×500 (+3 mm).
- Bezpečná zóna 3 mm od ořezu. PnP: 9 karet na A4 na sebe bez mezer, ořezové značky jen v okraji, ruby zrcadlené (dlouhá hrana).
- Karty jsou HTML v jednotkách `--u` (`mode={{ print: true, bleed: true }}` = 1 mm). Deska je SVG `viewBox 0 0 500 500` v mm.

## Zákazy

- **Žádné CSS/SVG filtry, `mix-blend-mode`, `backdrop-filter`** v `src/art` a `src/print` (Chromium je v PDF rastruje). Hlídá `tests/print/print.test.ts`.
- **Žádná emoji v tiskových textech** (tiskový Chromium nemá barevná emoji). Ikony počasí v pravidlech se nahrazují SVG v `src/print/PrintApp.tsx`.
- Playwright je připnutý na **1.56.1** (Chromium v `/opt/pw-browsers`); nikdy `playwright install`.

## Barvy a zákon

- RGB pro domácí a digitální tisk; CMYK (FOGRA39, PDF/X) až před ofsetem (`--cmyk`, potřebuje Ghostscript).
- První vydání (3–5 ks) jen pro hraní na Louce → bez CE. Prodej/darování/odměny ze sbírky → EN 71-1/2/3 + CE, 3D díly z filamentu se shodou EN 71-3. Vždy „nevhodné pro děti do 3 let“ (drobné díly).
