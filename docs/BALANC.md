# Balanc a simulace

```bash
npm run sim -- --games 200 --animals 4 --difficulty all [--storm] [--expert]
```

Výsledek se vypíše a uloží do `out/sim/report-*.json`: podíl her s aspoň Dobrou zimou (95% interval),
Hojná zima, průměr hvězd, plnění spíže po řádcích, splněné/propadlé Potřeby, podíl tahů bez akce,
zmoklé seno, projekty a vliv jednotlivých zvířat.

## Co bot umí a co ne

Bot (`src/engine/bot.ts`) hraje **hladově s úmyslem**: projde všechny kombinace (přiřazení kostek × cíl
× akce), zahraje je na kopii stavu a vybere nejlepší podle ohodnocení. K tomu má jednoduchý „úmysl“
(kam jít dál: nesu výrobek → Seník, mám 2 trávy → Louka…).

**Je to spodní odhad, ne kalibrace.** Bot téměř nikdy nevyrobí Pelíšky (vlna + seno na Maringotce) ani
Křížaly (ovoce + polojasno/slunce na Soláru), protože plánuje jen jeden tah dopředu. Člověk tyhle řetězy
vidí. Bot slouží ke třem věcem:

1. **Hlídač zaseknutí a výjimek** — tisíce her ve všech kombinacích modulů musí doběhnout.
2. **Regrese** — když změna dat posune výsledky bota o hodně, je potřeba vědět proč.
3. **Hrubé nesrovnalosti** — např. „seno závisí jen na slunci“ (simulace to odhalila, opraveno).

## Stav (říjen 2026, 60 her na kombinaci, bouřkový modul zapnutý)

| Zvířat | Klidná | Normální | Těžká | Hrdinská |
| --- | --- | --- | --- | --- |
| 2 | 23 % · 5,8 ★ | 10 % · 4,6 ★ | 7 % · 4,4 ★ | 7 % · 3,9 ★ |
| 3 | 27 % · 7,2 ★ | 10 % · 6,1 ★ | 10 % · 5,3 ★ | 5 % · 5,0 ★ |
| 4 | 33 % · 8,6 ★ | 18 % · 7,4 ★ | 15 % · 7,1 ★ | 7 % · 6,4 ★ |

(podíl her s aspoň Dobrou zimou · průměr hvězd). Cílová pásma pro lidi jsou v `data/rules.ts`
(`DIFFICULTIES[].target`, Normální 60–72 %). Pořadí obtížností je správně, absolutní čísla rozhodnou
playtesty — viz `docs/PLAYTEST.md`.

## Co simulace změnila na pravidlech

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
