# Balanc a simulace

```bash
npm run sim -- --games 200 --animals 4 --difficulty all [--storm] [--expert]
```

Výsledek se vypíše a uloží do `out/sim/report-*.json`: podíl her s aspoň Dobrou zimou (95% interval),
Hojná zima, průměr hvězd, plnění spíže po řádcích, splněné/propadlé Potřeby, podíl tahů bez akce,
zmoklé seno, projekty a vliv jednotlivých zvířat.

## Co bot umí a co ne

Bot (`src/engine/bot.ts`) hraje **hladově s úmyslem**: projde všechny kombinace (přiřazení kostek × cíl
× akce), zahraje je na kopii stavu a vybere nejlepší podle ohodnocení. K tomu má „úmysl" (kam jít dál:
nesu Seno a chybí Pelíšky → Maringotka, mám 2 Ovoce → Solár, soused chce Vodu → Potok…).

Od listopadu 2026 počítá ohodnocení **v hvězdách**: Pelíšek ★, Seno ⅓–½ ★, Kompost s cílem 1 ★★.
Věci na cestě (Seno → Maringotka → Pelíšek → Seník, Ovoce → Solár → Křížaly, Hnůj + Voda → Kompost)
mají cenu výrobku zlevněnou o tahy, které ještě chybí, a nulovou, když to do zimy nestihne. Do hloubky
neprohledává, řetězy přes víc tahů „vidí" přes tohle ohodnocení. Při průchodu Seníkem si umí výrobky
nechat (Seno pro Pelíšek).

**Co pořád neumí:** Potřeby se lhůtou 2 skoro vždy propadnou (dojít pro surovinu a donést ji jinam
za 2 kola nestihne), „spolu" Potřeby (Šéf louky, Nehnou se od sebe) nekoordinuje, nedaruje věci mezi
zvířaty, nepoužívá sklad na Seníku a neplánuje podle bouřky. Křížaly dělá zřídka: Ovoce je hlavně na
podzim, sušička chce ☀/⛅ a ze Sadu na Solár a pak na Seník je to ~20 polí (Křížaly navíc často jdou
na projekt Víc solárních panelů, kde mají větší cenu).

**Spodní odhad, nebo ne?** Bot hraje všechna zvířata jednou hlavou a bez chyb v počítání. Rodina
u stolu bude lepší v Potřebách a domluvě, horší v přesnosti. Pořadí obtížností musí sedět, absolutní
čísla rozhodnou playtesty — viz `docs/PLAYTEST.md`. K čemu bot slouží:

1. **Hlídač zaseknutí a výjimek** — tisíce her ve všech kombinacích modulů musí doběhnout.
2. **Regrese** — když změna dat posune výsledky bota o hodně, je potřeba vědět proč.
3. **Hrubé nesrovnalosti** — např. „seno závisí jen na slunci" (simulace to odhalila, opraveno).

## Stav (listopad 2026, 120 her na obtížnost, 4 zvířata, bez bouřky)

`npm run sim -- --games 120 --animals 4 --difficulty all`

| Obtížnost | Cíl | Dobrá+ | Hojná | ★ | Seno | Pelíšek | Suš. byl. | Křížaly | Kompost | Potřeby ✓/✗ | animalImpact (p. b.) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Klidná | 85–95 % | 94 % ±4 | 36 % | 13,5 | 4,38/4 | 2,07/2 | 1,70/2 | 0,50/2 | 0,68/1 | 2,3/2,6 | −3 až +2 |
| Normální | 60–72 % | **80 % ±7** | 16 % | 11,7 | 4,53/5 | 2,02/2 | 1,52/2 | 0,45/2 | 0,58/1 | 1,6/3,4 | −3 až +4 |
| Těžká | 38–52 % | **64 % ±9** | 10 % | 10,4 | 3,92/6 | 1,93/2 | 0,82/2 | 0,24/2 | 0,74/1 | 1,8/2,9 | −5 až +3 |
| Hrdinská | 18–32 % | **43 % ±9** | 0 % | 9,0 | 2,84/6 | 2,08/3 | 0,71/2 | 0,28/2 | 0,60/1 | 1,3/2,8 | −5 až +5 |

Tučně = nad cílovým pásmem. Tahy bez akce 20–23 %.

S bouřkovým modulem (`--storm`) skoro totéž: Klidná 94 %, Normální 82 %, Těžká 59 %, Hrdinská 39 %;
nejvíc vybočuje Avala na Hrdinské (−7 p. b.), pořád uvnitř ±8.

## Stav (říjen 2026, 60 her na kombinaci, bouřkový modul zapnutý, starý bot)

| Zvířat | Klidná | Normální | Těžká | Hrdinská |
| --- | --- | --- | --- | --- |
| 2 | 23 % · 5,8 ★ | 10 % · 4,6 ★ | 7 % · 4,4 ★ | 7 % · 3,9 ★ |
| 3 | 27 % · 7,2 ★ | 10 % · 6,1 ★ | 10 % · 5,3 ★ | 5 % · 5,0 ★ |
| 4 | 33 % · 8,6 ★ | 18 % · 7,4 ★ | 15 % · 7,1 ★ | 7 % · 6,4 ★ |

(podíl her s aspoň Dobrou zimou · průměr hvězd). Cílová pásma pro lidi jsou v `data/rules.ts`
(`DIFFICULTIES[].target`, Normální 60–72 %). Pořadí obtížností je správně, absolutní čísla rozhodnou
playtesty — viz `docs/PLAYTEST.md`.

## Co simulace změnila na pravidlech

- **Lhůta 3 místo 2** u Slintavé potopy, Bahenní lázně, Prázdné misky, U plotu nic nezmešká a Šanty
  pro pěvkyni (donést surovinu přes půl Louky za 2 kola skoro nešlo, propadaly v ~90 % her).
  Spolu s prahem 11 ★ (120 her, 4 zvířata, bez bouřky): Klidná 86 % ±6, Normální 70 % ±8, Těžká 47 % ±9,
  Hrdinská 32 % ±8 — vše v cílových pásmech. Propadlé Potřeby na Normální 3,4 → 3,1 za hru; bot
  Potřeby plní pořád slabě, lidi z delší lhůty vytěží víc (ověřit playtestem).
- **Dobrá zima pro 4 zvířata od 11 ★ (dřív 10), Hojná od 16 ★ (dřív 15).** Po naučení bota bylo
  Normální 80 % proti cíli 60–72 %. Teď (120 her, bez bouřky): Klidná 89 % ±6, Normální 67 % ±8,
  Těžká 54 % ±9, Hrdinská 33 % ±8; animalImpact nejhůř Pogo −7 (Těžká). Pro 2 a 3 zvířata beze změny
  (zatím neměřeno novým botem).
- **1. 11. 2026 — bot, ne pravidla.** Bot se naučil Pelíšky, Křížaly a řetězy přes víc tahů (viz výše).
  Normální 4 zvířata, 120 her bez bouřky: **20 % → 80 %** her aspoň Dobrá zima (±7 p. b.), Pelíšek
  0,28 → 2,02 / 2, Křížaly 0,16 → 0,45 / 2, Seno 5,83 → 4,53 / 5 (dřív přetékalo), animalImpact
  Pogo −9 → −1, Yakul +8 → +4. Klidná 33 → 94 %, Těžká 14 → 64 %, Hrdinská 8 → 43 %.
  Data se neměnila. Závěr: dřívější „hra je moc těžká" byla hlavně slabina bota; Normální až Hrdinská
  jsou teď pro bota **nad** cílovým pásmem.
- **Seno se suší za sucha** (slunce, polojasno, vítr), ne jen za slunce. Slunečných karet je v celé hře 2–3.
- **Křížaly v solární sušičce** i za polojasna (karta F23: panel vyrábí i v zamračeném dni).
- **Recept bere nejdřív z nákladu**, pak ze stanice (jinak plný náklad zablokoval sušení).
- **Výrobky se odevzdají i při průchodu Seníkem** (dřív jen při zastavení).
- **Sbírej + zpracuj od síly 2**, zpracování od síly 1.
- **Potřeby ±★ po dvou** (každé 2 splněné +★, každé 2 propadlé −★) místo −★ za každou propadlou.
- Spíž pro 4 zvířata 12 výrobků místo 15.

## Otevřené otázky pro playtest

1. **Dvě zvířata a Potřeby** — v simulaci propadá ~5 Potřeb za hru. Zvážit méně karet s 📜 nebo delší lhůty pro 2 zvířata.
2. **Pelíšky** — dostanou se hráči k vlně a senu na Maringotce včas? Vlna je jen od léta.
3. **Délka tahu** — cíl 30–45 min. Měřit stopkami.
4. **Bouřkový modul** — je 60 s pro děti málo? Kolik sena zmokne?
5. **Síla Flíčkova Rypáčku** a Avaly s Potřebami (srdíčko za každou splněnou).
