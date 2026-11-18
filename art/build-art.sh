#!/bin/bash
# Régénère l'atlas des sprites depuis art/sprites.lua avec Aseprite (compilé hors dépôt, voir le runbook
# jeux-chaine-graphique de homelab-docs). Les sorties sont versionnées : la CI n'a pas besoin d'Aseprite.
set -euo pipefail
cd "$(dirname "$0")/.."
A="${ASEPRITE:-$HOME/Projets/outils/aseprite/build/bin/aseprite}"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
"$A" -b --script-param out="$T" --script art/sprites.lua
"$A" -b "$T"/*.aseprite --sheet public/assets/atlas.png --data "$T/atlas.json" --format json-hash \
  --sheet-pack --trim --list-tags --filename-format '{title}#{frame}'
# Le JSON d'Aseprite porte des chemins locaux ; on n'en garde que les cadres, triés (sortie stable).
node -e '
  const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const frames = Object.fromEntries(Object.keys(d.frames).sort().map(k => [k, d.frames[k]]));
  const out = { frames, meta: { image: "atlas.png", size: d.meta.size, scale: "1", app: "Aseprite (art/sprites.lua)" } };
  require("fs").writeFileSync("public/assets/atlas.json", JSON.stringify(out, null, 1) + "\n");
  console.log(Object.keys(frames).length + " cadres");' "$T/atlas.json"
# Icônes de l'application : Pestouille, cadre 1, agrandi sans lissage.
"$A" -b "$T/pestouille.aseprite" --frame-range 0,0 --save-as "$T/p.png"
for s in 192 512; do magick "$T/p.png" -filter point -resize ${s}x${s} -background '#f6efdf' -gravity center -extent ${s}x${s} public/icons/pestouille-$s.png; done
