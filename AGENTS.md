# Travailler sur Pestouille RPG

Guide pour tout agent de code (et tout humain) qui modifie ce dépôt. Les contraintes qui suivent font foi ;
la conception détaillée et les plans de travail sont tenus hors de ce dépôt.

## Contraintes

- **Moteur pur** : `packages/engine/**` et `packages/content/src/**` n'utilisent ni `window`, `document`, `navigator`,
  `Date`, `localStorage`, `indexedDB`, `fetch`, `performance`, `requestAnimationFrame`, ni `Math.random` (oxlint).
  Le hasard passe par l'état RNG explicite (`packages/engine/src/rng.ts`). Aucune fonction publique ne modifie son
  argument.
- **Règles** : tout nouveau contenu respecte les schémas de `packages/content/src/schemas/` ; chaque changement de
  règle ajoute un test.
- **Garde de marque** : aucun nom de jeu commercial ni identifiant de ticket (majuscules, tiret, chiffres) dans les
  fichiers suivis (`tests/unit/brand-guard.test.ts`). Personnages, textes et images originaux.
- **Réutiliser d'abord** : avant un composant non trivial, une fiche `docs/reuse-decisions/<composant>.md`
  (au moins deux candidats, licence, choix).
- **Dépendances** : d'exécution, seulement `ajv` (`packages/content`) et `phaser` (rendu de l'interface `web/`, jamais
  dans le moteur). Licence MIT ; aucune dépendance GPL, AGPL,
  LGPL, CC BY-SA ou SSPL.

## Sprites

Source texte : `art/sprites.lua`, dessinée par code et exportée par Aseprite (`art/build-art.sh`) vers
`public/assets/atlas.png|json` et `public/icons/`. Les sorties sont versionnées ; l'outil ne l'est jamais (licence
d'Aseprite : compilé hors dépôt, non redistribuable). Personnages originaux : Pestouille garde son look d'Opencade.

## Tests : ciblés, jamais la suite complète

En local : `npx vitest run tests/unit/<fichier>.test.ts` seulement. La CI joue tout.

## Commits

Message en français terminé par la ligne `Co-Authored-By` de l'agent. Jamais `git add -A` : ajouter par chemins.

## CI

Woodpecker : `.woodpecker/checks.yml` (npm ci, lint, typecheck, tests, build, SBOM CycloneDX, audit des
dépendances), puis `.woodpecker/e2e.yml` (Playwright : parcours complet au clavier et au doigt, hors ligne).
