// Chargement Node du dossier content/ (tests et outillage seulement ; le jeu chargera le contenu par Vite).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContentBundle } from '@pestouille/content';

const kinds = ['creatures', 'skills', 'items', 'jobs', 'encounters', 'quests', 'bosses'] as const;

export function loadContent(root: string): ContentBundle {
    const read = (kind: string): unknown[] => readdirSync(join(root, kind)).filter(f => f.endsWith('.json')).sort()
        .map((f): unknown => JSON.parse(readFileSync(join(root, kind, f), 'utf8')));
    return Object.fromEntries(kinds.map(k => [k, read(k)])) as unknown as ContentBundle;
}
