# Décision de réutilisation : générateur pseudo-aléatoire et empreinte d'état

## Besoin

Un hasard reproductible (même graine et mêmes commandes donnent le même état), sérialisable dans une sauvegarde, sans
`Math.random`, et une empreinte d'état pour comparer deux rejeux.

## Candidats

| Candidat | Licence | Constat |
|---|---|---|
| `pure-rand` (npm) | MIT | complet (xoroshiro, mersenne), état sérialisable ; une dépendance d'exécution et son arbre dans le SBOM |
| `seedrandom` (npm) | MIT | état sérialisable seulement pour certains algorithmes ; API mutable |
| xoshiro128** + cyrb128 (algorithmes publiés, domaine public) | domaine public | une vingtaine de lignes, état = 4 entiers 32 bits, sans dépendance |
| FNV-1a 64 bits (algorithme publié) | domaine public | empreinte synchrone ; `crypto.subtle` est asynchrone et inutilisable dans un moteur synchrone |

## Choix

Les deux algorithmes publiés, réécrits dans `packages/engine/src/rng.ts` et `hash.ts`. Une dépendance pour vingt
lignes coûte plus (SBOM, audit, mises à jour) qu'elle n'apporte. L'empreinte FNV-1a est un contrôle d'intégrité,
pas une protection contre un adversaire.

## Tests de qualification

`tests/unit/rng.test.ts` : reproductibilité, bornes, indépendance de l'ordre des clés pour l'empreinte.
