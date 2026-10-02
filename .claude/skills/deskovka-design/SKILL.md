---
name: deskovka-design
description: Herní design hry Než přijde zima — pravidla domu, kooperace, humor, fakta, postup při změně karty nebo pravidla. Použij vždy, když měníš data hry (data/**), pravidla v enginu, texty karet, hlášky nebo přidáváš obsah.
---

# Herní design: Než přijde zima

## Pravidla domu (neporušovat)

- **Plně kooperativní.** Žádný boj, žádné násilí, žádný hráč proti hráči, nikdo neprohrává sám. Protivník je zima a počasí.
- **Žádné zvíře nikdy netrpí.** Ani Hubená zima: „Sousedi přivezli seno, nikdo nebyl sám.“
- **Zorka a Listík se ve hře nikdy neobjeví** (ani věnování). Zorka zemřela, Listík se pohřešuje.
- **Pogo je ona.** Kamarádi: Avala–Květa (skuteční), Pogo–Yakul a Karel–Flíček (vymyšlení, schváleno).
- **Suroviny** jen z přírody a z péče (hnůj → kompost, vlna ze stříhání). Žádné mléko, vejce, maso.
- **Lidé na kartách:** Tomáš = pracant a strůjce všeho; Maruška = bylinky, zpracování zásob, administrativa; Tony = jen technologie (solár, čerpadlo, aplikace).

## Humor

- Hláška na každé kartě, **nejvýš ~12 slov**, kurzívou, ke hře není nutná.
- **Family friendly**, žádný drsný humor. Laskavá zmínka o handicapu je OK (Hanička), výsměch ne.
- Karlův hlas: **nikdy neprosí, nikdy nedojímá, nikdy se znovu nepředstavuje**, pointa za „…“.
  Kanonický skill Karlova hlasu je v repu `TGeeeeq/loukarun` (`.claude/skills/karel/SKILL.md`) — viz skill `karel`.
- Nikdy se nesmát neúspěchu hráčů.

## Poselství přes mechaniky, ne přes text

Senoseč za sucha · koloběh hnůj → kompost → zahrádka · pásové sečení a opylovači (expert) · regenerace stanic (expert).
Fakta na kartách „Věděli jste“ (`data/cards/facts.ts`) musí být pravdivá; když si nejsi jistý, napiš to a navrhni zdroj.

## Postup při změně

1. Změň **jen data** (`data/**`), pokud to jde. Nové chování zvratu/karty = nový druh v `WeatherMod`/`NeedReq`/… a obsluha v `src/engine/game.ts`.
2. `npx tsc --noEmit && npm test`.
3. `npm run sim -- --games 120 --animals 4 --difficulty all` a porovnej s `docs/BALANC.md` (bot je spodní odhad).
4. Pokud se změnilo pravidlo, uprav `docs/PRAVIDLA.md`, `docs/RYCHLY-START.md`, `docs/KARTA-POMOCI.md`.
5. Tisk: `npm run print` a zkontroluj, že text karty se vejde (bezpečná zóna 3 mm).

**Klíče a pořadí:** id karet jsou stabilní (J1, N3, E12…). Nové karty přidávej na konec seznamu.
