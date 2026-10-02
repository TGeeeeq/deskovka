#!/usr/bin/env bash
# Synchronizuje kresby zvířat z webu Nech mě růst (zdroj pravdy).
# Použití: bash scripts/sync-anatomy.sh ../NMRStranky1.0
set -euo pipefail
SRC="${1:?cesta k NMRStranky1.0}"
REV="$(git -C "$SRC" rev-parse --short HEAD)"
DST="$(dirname "$0")/../src/art/karel"
{
  printf '/* KOPIE z TGeeeeq/NMRStranky1.0 @ %s, web/lib/karel/anatomy.ts.\n' "$REV"
  printf ' * Zdroj pravdy je tam (a ve hře Louka Run). Neupravuj tady — oprav zdroj\n'
  printf ' * a pusť `bash scripts/sync-anatomy.sh <cesta-k-NMRStranky1.0>`.\n'
  printf ' * Úpravy jen pro tisk a 3D patří do `print-overrides.ts`. */\n\n'
  cat "$SRC/web/lib/karel/anatomy.ts"
} > "$DST/anatomy.ts"
cp "$SRC/web/components/karel/AnimalSvg.tsx" "$SRC/web/components/karel/KarelWear.tsx" "$SRC/web/components/karel/karel.css" "$DST/"
sed -i 's#"@/lib/karel/anatomy"#"./anatomy"#' "$DST/AnimalSvg.tsx"
echo "Synchronizováno z $REV. Pusť npm test (snapshot anatomie)."
