# Pestouille RPG — Les Chroniques des Sept Flammes

Pestouille, gentil dragon, rassemble les Sept Flammes et des alliés pour délivrer la princesse Églantine du
Seigneur des Brumes. Un RPG solo au tour par tour, hors ligne, avec métiers, créatures à apaiser et quêtes.

## État

Premier jalon : le **moteur** de la tranche verticale (village, forêt, temple, boss Roncier, première flamme).
Pas encore d'interface jouable.

- `packages/engine` : règles pures et déterministes (graine, combat, recrutement, boss, quêtes, monde, progression).
- `packages/content` : schémas JSON et validation du contenu.
- `content/` : données du jeu (créatures, compétences, objets, rencontres, quête, graphe du monde).
- `tests/unit/` : tests Vitest, nommés d'après les scénarios `T01`…`T24` de la tranche verticale.

## Commandes

`npm ci` · `npm run lint` · `npm run typecheck` · `npm test` (CI) · `npm run sbom`.

## Licence

Code sous licence MIT. Les personnages, textes et données sont originaux ; aucun asset tiers.
