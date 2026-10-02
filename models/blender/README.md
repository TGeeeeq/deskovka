# Plné 3D sošky — Blender (příští vydání)

Zatím prázdné. Sem patří zdrojové soubory `.blend` plných sošek zvířat
(`karel.blend`, `pogo.blend`, …), až se budou dělat.

Postup, rozměry a pravidla jsou v [`docs/3D.md`](../../docs/3D.md), oddíl
**Plné 3D sošky (příští vydání)**. Ve zkratce:

- podklad: `out/3d/<id>-silhouette.svg` (`npm run models`), rozměry v mm;
- tvary podle `src/art/karel/AnimalSvg.tsx` a čísel v `src/art/karel/anatomy.ts`;
- nejtenčí místo 1,2 mm, čep 10 × 6,5 × 2,2 mm do stávajících podstavců;
- export STL v mm do `out/3d/sosky/` (necommituje se).
