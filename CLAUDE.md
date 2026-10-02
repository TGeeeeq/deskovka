# CLAUDE.md

Kooperativní desková hra **Než přijde zima** pro azyl **Nech mě růst z.s.** (Louka, Vlkaneč).
Jedno repo, jeden zdroj dat → webová hra, tisková PDF, STL figurky a prezentační web.

## Git a nasazení

- **`main` = produkce na Vercelu** (projekt `nez-prijde-zima`). Push na `main` nasadí ostrou verzi,
  kterou vidí investoři. Ostatní větve dostanou jen preview URL.
- Práce jde na pracovní větev (`claude/*`), na `main` se posílá až ověřený stav
  (`npx tsc --noEmit && npm test && npm run build`). Větve se nemažou.
- Build řídí `vercel.json` (Vite, `dist/`). Žádné serverové funkce, žádné env proměnné.

## Příkazy

```bash
npm install                 # .npmrc má legacy-peer-deps
npm run dev                 # vývoj (pozor: animace ověřuj na buildu, ne na dev serveru)
npm run build && npm run preview   # http://localhost:4173/ (hra), /prezentace/, /tisk/
npx tsc --noEmit && npm test       # typy + vitest (engine, tisk, 3D)
npm run sim -- --games 200 --animals 4 --difficulty all --storm   # balanc (bot = spodní odhad)
npm run print               # out/print/*.pdf (Chromium přes Playwright 1.56.1, nikdy playwright install)
npm run models              # out/3d/*.stl (manifold-3d, bez OpenSCADu)
```

`?rychlost=12` v URL hry zrychlí boty (testy, prezentace).

## Struktura

- `data/` — **obsah pravidel**: pole a stanice (`board.ts`), suroviny (`items.ts`), zvířata (`animals.ts`),
  karty (`cards/*`), obtížnosti a bodování (`rules.ts`), Karlův průvodce (`tutorial.ts`). Bez Reactu.
- `src/engine/` — čistá pravidla: `game.ts` (`newGame`, `apply` → `{state, events}`), `legal.ts`, `move.ts`,
  `rng.ts` (sfc32, stav ve state → deterministické přehrání), `bot.ts`. **Žádné `Math.random`/`Date`.**
- `src/art/` — sdílená grafika bez stavu: deska (SVG v mm), karty (HTML v jednotkách `--u`), ikony, zvířata.
  `src/art/karel/*` je **kopie** z `NMRStranky1.0/web` — neupravovat, synchronizovat `scripts/sync-anatomy.sh`.
- `src/game/` — webová hra (hot-seat, boti, bouřka v reálném čase, průvodce, zvuk, undo, autosave, export).
- `src/print/` + `scripts/print/` — tisk. `src/presentation/` — prezentace pro investory a dárce.
- `scripts/3d/` + `tests/3d/` — STL. `docs/` — pravidla, tisk, 3D, balanc, playtesty.

## Zásady

- UI nikdy nepočítá pravidla — jen přehrává `events` z enginu. Nové pravidlo patří do `data/` + `src/engine/`.
- Pravidla v `docs/PRAVIDLA.md` musí odpovídat kódu. Po změně pravidla je uprav (a `RYCHLY-START`, `KARTA-POMOCI`).
- Tisk: žádné filtry/blend módy/emoji v tiskové grafice (skill `tisk`). Herní design: skill `deskovka-design`.
- Přístupnost: každá surovina má tvar + barvu, každé zvíře značku tvar + číslice (Avala a Květa mají stejnou barvu).
- `prefers-reduced-motion` se respektuje (`src/game/useMedia.ts`).
- Data v `localStorage`: `nz.save.v1` (rozehraná hra), `nz.tips.seen`, `nz.guide`, `nz.mute`. Nic se neposílá na server.
- Hosting: statický build (`VITE_BASE` pro podadresu). Prezentace **nesmí přijímat platby** — jen odkazy ven.
- Texty česky; řetězce prezentace v `src/presentation/copy.ts` (připraveno na EN).
