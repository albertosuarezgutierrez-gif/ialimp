#!/usr/bin/env bash
# Descarga la tipografía Nunito (woff2) y la deja auto-alojada en ./fonts/.
# Ejecútalo UNA vez en tu máquina (con red) antes de desplegar la landing.
# Así la web no carga Google Fonts y no se transfiere ningún dato a terceros.
#
#   bash fetch-fonts.sh
#
# Requiere: curl y unzip.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p fonts

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Fuente self-host desde google-webfonts-helper (devuelve un zip con los woff2).
URL="https://gwfh.mranftl.com/api/fonts/nunito?download=zip&subsets=latin&variants=regular,500,600,700,800,900&formats=woff2"

echo "→ Descargando Nunito (woff2)…"
curl -fsSL "$URL" -o "$TMP/nunito.zip"
unzip -o "$TMP/nunito.zip" -d "$TMP/nunito" >/dev/null

# Renombra cada variante a nunito-<peso>.woff2 (regular = 400).
declare -A MAP=( [regular]=400 [500]=500 [600]=600 [700]=700 [800]=800 [900]=900 )
for variant in regular 500 600 700 800 900; do
  src="$(ls "$TMP"/nunito/*-"$variant".woff2 2>/dev/null | head -1 || true)"
  if [ -z "$src" ]; then
    echo "  ⚠ No se encontró la variante '$variant' en el zip."
    continue
  fi
  cp "$src" "fonts/nunito-${MAP[$variant]}.woff2"
  echo "  ✓ fonts/nunito-${MAP[$variant]}.woff2"
done

echo "✅ Fuentes listas en ./fonts/. Ya puedes desplegar la landing."
