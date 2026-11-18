# Décision de réutilisation : validation du contenu

## Besoin

Refuser tout contenu de jeu (créatures, compétences, objets, métiers, rencontres, quêtes, boss) qui sort de son
contrat, propriétés inconnues comprises, avec des schémas JSON réutilisables par d'autres outils (format ouvert).

## Candidats

| Candidat | Licence | Constat |
|---|---|---|
| `ajv` 8 | MIT | référence JSON Schema 2020-12, mode strict, messages par chemin ; déjà employé par Sextuor |
| `zod` | MIT | schémas en TypeScript, pas en JSON Schema : contrat non réutilisable hors TypeScript |
| `@cfworker/json-schema` | MIT | léger, sans compilation ; mode strict et messages moins complets |

## Choix

`ajv` 8.20.0, seule dépendance d'exécution, dans `packages/content`. Les schémas vivent en JSON dans
`packages/content/src/schemas/` ; les références croisées (créature d'une rencontre, cible d'évolution, compétence
d'un métier ou d'un boss, objet d'une récompense) sont vérifiées en code.

## Tests de qualification

`tests/unit/content.test.ts`.
