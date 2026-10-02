# Tisk prvního vydání (3–5 kusů)

První vydání je **jen pro hraní na Louce**: neprodává se a nedaruje. Proto nepotřebuje
posouzení bezpečnosti hraček (EN 71) ani značku CE. Jakmile by hra šla ven (prodej,
dar, odměna ze sbírky), je obojí povinné. Viz konec tohoto návodu.

## Jak vyrobit tisková data

```bash
npm run print          # vite build → Chromium → PDF do out/print/
npm run print -- --skip-build
npm run print -- --cmyk   # jen pokud je nainstalovaný Ghostscript (gs); jinak vypíše postup
```

Náhled všech tiskových sad je na `/tisk/` (v běžící hře `npm run preview` → `http://localhost:4173/tisk/`).

| Soubor (`out/print/`) | Co to je | Na co tisknout |
| --- | --- | --- |
| `karty-pnp-a4.pdf` | 68 poker karet + ruby, 9 na A4 | Matný karton 300–350 g/m², oboustranně, **otočit po dlouhé hraně** |
| `karty-pnp-a4-jen-lice.pdf` | totéž bez rubů | Když tiskárna neumí oboustranně (ruby pak zakryjí neprůhledné obaly) |
| `karty-*-spadavka.pdf` | 1 karta na stranu, 69×94 mm se spadávkou 3 mm | Pro tiskárnu (JerryLabs, ABone…) |
| `tabulky-zvirat-a4.pdf` | 6 tabulek zvířat A6, 2 na A4 na šířku | Karton 300 g/m² |
| `deska-506mm-spadavka.pdf` | celá deska 500×500 mm + 3 mm spadávka | Velkoformát v copy shopu nebo tiskárně |
| `deska-4x-a3.pdf` | deska jako 4 dlaždice A3 s přesahem a ořezovými značkami | Domácí/kancelářský tisk A3, papír 120–160 g/m² |
| `zetony-a4.pdf` | papírové žetony surovin, srdíčka, Práce a značky | Karton 300 g/m² (nebo 3D tisk — `docs/3D.md`) |
| `pravidla-a5.pdf` | pravidla A5 s obálkou a čísly stran | Na čtení z obrazovky / tisk po stranách |
| `pravidla-booklet-a4.pdf` | totéž seřazené pro sešitovou vazbu | A4 na šířku, oboustranně (po krátké hraně), přeložit a sešít |
| `karta-pomoci-a4.pdf` | 4× karta pomoci (1 strana A4) | Papír 160 g/m², ideálně zalaminovat |

**Vždy tiskni na 100 %** (vypni „Přizpůsobit stránce“). Každý arch má kalibrační proužek
50 mm — změř ho pravítkem, než nařežeš celou sadu.

## Rozpis na jeden kus hry

| Díl | Množství | Odhad ceny / kus |
| --- | --- | --- |
| Karty (líce + ruby) | 8 archů A4 poker + 2 archy mini („Věděli jste“) → 20 stran | ~80–120 Kč (karton + toner) |
| Obaly na karty 63,5×88 mm | 68 ks (+24 mini 44×68, nepovinné) | ~100–150 Kč |
| Tabulky zvířat | 3 archy | ~25 Kč |
| Deska | 4× A3 + lepenka 2 mm + knihařská páska, **nebo** velkoformát | ~150 Kč doma / ~900 Kč tisk 50×50 (JerryLabs, neověřeno) |
| Žetony | 2 archy papírové, **nebo** 3D tisk (~150 g PLA, `docs/3D.md`) | ~25 Kč papír / ~75–110 Kč filament |
| Figurky | 6 figurek + 6 podstavců (3D tisk) | v 3D řádku výš |
| Kostky d6 | 4 ks | ~40 Kč |
| Pravidla + 4 karty pomoci | 8 + 4 listy | ~40 Kč |
| Krabice | nejjednodušší je kartonová krabice A4 se samolepkou, nebo 3D tištěný insert | ~50–150 Kč |
| **Celkem** | | **odhad 600–1 500 Kč** podle toho, jestli se deska tiskne doma, nebo v tiskárně |

Všechny ceny jsou **odhad** z průzkumu (září/říjen 2026), neověřené konkrétní nabídkou.
JerryLabs (Orlová) uvádí karty 75 Kč/arch A4 a desku 50×50 cm ~900 Kč. Tiskárna Adámek
(Brno) a ABone (Praha 4) dělají digitální tisk od 1 kusu. Před objednávkou si vyžádej
nabídku na přesný seznam dílů.

## Řezání karet

1. Vytiskni zkušební arch, ověř 50 mm proužek a sesazení rubů proti světlu (posun do 1–2 mm je v pořádku, karty nemají ozdobný okraj až do kraje).
2. Řež **řezačkou s pravítkem nebo kotoučovou řezačkou** podle ořezových značek v okraji: nejdřív svislé řezy přes celý arch, pak vodorovné. Karty jsou na sebe bez mezer, takže jedním řezem odděluješ dvě karty.
3. Zakulať rohy **děrovačkou rohů s poloměrem 3 mm**.
4. Dej do obalů 63,5×88 mm. Obaly karty ochrání i před mastnými prsty u krmelce.

## Sestavení desky z dlaždic A3

1. Vytiskni 4 dlaždice, ořízni každou podle značek na **250×250 mm** (přesah 3 mm odstřihni).
2. Nalep na 4 čtverce **šedé lepenky 2 mm** (sprej nebo lepidlo na papír, natírat tence, zatížit knihami přes noc).
3. Čtverce polož lícem dolů, mezi sousedy nech **mezeru 1–2 mm** a přelep **knihařskou páskou** (plátěnou). Vznikne pant, takže se deska skládá na čtvrtinu.
4. Rub desky můžeš polepit barevným papírem, aby se lepenka netřepila.

## Barvy

Tisková data jsou v **RGB**. To je správně pro domácí inkoust i digitální tisk v copy shopu.
Teprve **před ofsetem** (větší náklad příští rok) se převádí do CMYK (FOGRA39 / ISO Coated v2,
výstup PDF/X-1a nebo PDF/X-4): `npm run print -- --cmyk` s nainstalovaným Ghostscriptem,
nebo převod nechat na tiskárně. Barvy pergamenu a zelené mají v CMYK mírně jiný odstín —
vyžádej si nátisk.

## Pravidla pro grafiku (kvůli tisku)

- Všechno se kreslí v **milimetrech** (deska `viewBox 0 0 500 500`, karty v jednotkách `--u`).
- **Žádné CSS/SVG filtry, `mix-blend-mode` ani `backdrop-filter`** — Chromium je v PDF převede
  na rastr v nízkém rozlišení. Hlídá to `tests/print/print.test.ts`.
- **Emoji nepoužívat v tiskových textech** — tiskový Chromium nemá barevná emoji a vykreslí
  prázdný obdélník. Ikony počasí v pravidlech se při tisku nahrazují kreslenými ikonami.
- Text drž aspoň 3 mm od ořezu (bezpečná zóna). Spadávka 3 mm.

## Bezpečnost a zákon

- Hra obsahuje **drobné díly** (žetony, figurky, kostky) → **nevhodné pro děti do 3 let**. Napiš to na krabici i v prvním vydání.
- **Prodej, darování nebo odměny ze sbírky** = uvedení hračky na trh → je potřeba posouzení podle **EN 71-1/2/3**, technická dokumentace, EU prohlášení o shodě a značka **CE** (NV 86/2011 Sb.). Zkoušky dělá např. ITC Zlín (cena na vyžádání, odhad 10–30 tis. Kč za výrobek — neověřeno).
- U 3D tištěných dílů pro prodej je potřeba filament s doloženou shodou **EN 71-3** (migrace prvků).
- Spolek smí prodávat jen jako vedlejší hospodářskou činnost; opakovaný prodej chce živnostenské oprávnění. Před sbírkou ověřit s účetní.
