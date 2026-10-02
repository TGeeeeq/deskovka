---
name: balanc
description: Jak pustit a číst simulaci balancu hry Než přijde zima (bot, cílová pásma, známé limity). Použij před i po změně pravidel nebo čísel v data/**.
---

# Balanc

```bash
npm run sim -- --games 200 --animals 4 --difficulty all --storm
npx tsx scripts/sim/trace.ts <semínko>   # tah po tahu, co bot dělá
npx tsx scripts/sim/smoke.ts <semínko>   # jedna hra, souhrn
```

- Cíle pro lidi: `data/rules.ts` → `DIFFICULTIES[].target` (Normální 60–72 % her aspoň Dobrá zima).
- **Bot je spodní odhad**: plánuje jeden tah dopředu, nevyrábí Pelíšky ani Křížaly. Pořadí obtížností musí sedět, absolutní čísla dorovnávají playtesty (`docs/PLAYTEST.md`).
- Čti hlavně: `pantry` (který řádek spíže chybí), `needsFailed`, `idleShare` (tahy bez akce; nad ~30 % je deska „prázdná“), `animalImpact` (žádné zvíře by nemělo posunout výsledek o víc než ±8 p. b.).
- Výsledky a historie změn: `docs/BALANC.md`. Po změně pravidla doplň řádek do sekce „Co simulace změnila“.
