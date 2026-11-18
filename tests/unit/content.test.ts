import { describe, expect, it } from 'vitest';
import { validateContent, type ContentBundle } from '@pestouille/content';
import { loadContent } from '../../scripts/load-content';

const bundle = loadContent('content');
const withPatch = (patch: Partial<ContentBundle>): ContentBundle => ({ ...bundle, ...patch });

describe('contenu du slice', () => {
    it('T23 le contenu du dépôt est valide, sans référence orpheline', () => {
        expect(validateContent(bundle)).toEqual([]);
        expect(bundle.creatures).toHaveLength(12);
    });
    it('propriété inconnue rejetée', () => {
        const errors = validateContent(withPatch({ items: [...bundle.items, { id: 'odd', name: 'Bizarre', kind: 'material', price: 1, stackMax: 1, extra: true }] }));
        expect(errors.some(e => e.startsWith('items/odd:'))).toBe(true);
    });
    it('rencontre vers une créature absente', () => {
        const errors = validateContent(withPatch({ encounters: [{ id: 'ghost', regionId: 'foret_murmures', enemies: [{ creatureId: 'nobody', level: 1 }], rewards: { xp: 1, gold: 1 }, boss: false }] }));
        expect(errors).toContain('encounters/ghost: créature inconnue nobody');
    });
    it('évolution vers une cible absente, compétence de métier absente, objet de récompense absent', () => {
        const creatures = bundle.creatures.map(c => (c as { id: string }).id === 'mossling'
            ? { ...(c as object), evolutions: [{ targetId: 'nothing', minLevel: 13, minAffinity: 55 }] } : c);
        expect(validateContent(withPatch({ creatures }))).toContain('creatures/mossling: évolution vers nothing inconnue');
        const jobs = [{ id: 'bard', name: 'Barde', skills: ['lullaby'], growth: { hp: 1, mp: 1, attack: 1, defense: 1, magic: 1, resistance: 1, speed: 1, luck: 1 } }];
        expect(validateContent(withPatch({ jobs }))).toContain('jobs/bard: compétence inconnue lullaby');
        const quests = [{ schemaVersion: 1, id: 'q', title: 'Q', steps: ['a'], rewards: { xp: 1, items: ['gold_crown'] } }];
        expect(validateContent(withPatch({ quests }))).toContain('quests/q: objet inconnu gold_crown');
    });
    it('compétence de boss absente', () => {
        const bosses = [{ schemaVersion: 1, id: 'b', recruitable: false, hp: 10, phases: [{ id: 'A', hpAbovePercent: 0, skills: ['ghost_skill'] }], rewards: { xp: 1, items: [] } }];
        expect(validateContent(withPatch({ bosses }))).toContain('bosses/b: compétence inconnue ghost_skill');
    });
});
