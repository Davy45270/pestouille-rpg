import { describe, expect, it } from 'vitest';
import { canEnter, reachable, respawnAfterDefeat, solve, validateWorld, type WorldGraph } from '@pestouille/engine';
import data from '../../content/world/first_flame.json';

const g: WorldGraph = { ...data, transitions: data.transitions.map(t => [t[0] ?? '', t[1] ?? ''] as [string, string]) };

describe('graphe de la première flamme', () => {
    it('T11 temple avant le groupe complet : porte fermée', () => {
        expect(canEnter(g, 'temple.hall', [])).toBe(false);
        expect(reachable(g, g.start, [])).not.toContain('temple.hall');
        expect(reachable(g, g.start, [])).toContain('forest.temple_gate');
    });
    it('T12 clé obtenue : antichambre accessible', () => {
        expect(reachable(g, g.start, ['party_four'])).not.toContain('temple.antechamber');
        expect(reachable(g, g.start, ['party_four', 'blocks_solved', 'switches_solved', 'root_key'])).toContain('temple.antechamber');
    });
    it('T13 et T24 : le solveur atteint le boss, aucune salle critique inaccessible', () => {
        const s = solve(g, g.start);
        expect(s.reached).toContain('temple.boss');
        expect(s.flags.sort()).toEqual(['blocks_solved', 'party_four', 'root_key', 'switches_solved']);
        expect(validateWorld(g)).toEqual([]);
    });
    it('graphe piégé : clé introuvable, nœud inconnu', () => {
        const trapped: WorldGraph = { ...g, grants: { 'village.place': 'party_four' } };
        expect(validateWorld(trapped)).toEqual(expect.arrayContaining([
            'porte sans source : temple.antechamber exige root_key', 'nœud non atteint : temple.antechamber', 'nœud non atteint : temple.boss']));
        const unknown: WorldGraph = { ...g, transitions: [...g.transitions, ['temple.boss', 'nowhere.room']] };
        expect(validateWorld(unknown)).toContain('nœud inconnu : nowhere.room');
    });
    it('T14 défaite : retour au dernier checkpoint visité', () => {
        expect(respawnAfterDefeat(g, ['village.place', 'village.forest_gate', 'forest.entry', 'forest.camp', 'forest.temple_gate'])).toBe('forest.camp');
        expect(respawnAfterDefeat(g, [])).toBe('village.place');
    });
});

it('le temple suit ses transitions : pas de raccourci vers le boss sans la clé', () => {
    expect(reachable(g, g.start, ['party_four'])).not.toContain('temple.boss');
    expect(reachable(g, g.start, ['party_four', 'blocks_solved', 'switches_solved'])).toContain('temple.key');
});

it('énigmes du temple : interrupteurs fermés avant les blocs, clé fermée avant les interrupteurs', () => {
    expect(reachable(g, g.start, ['party_four'])).toContain('temple.blocks');
    expect(reachable(g, g.start, ['party_four'])).not.toContain('temple.switches');
    expect(reachable(g, g.start, ['party_four', 'blocks_solved'])).not.toContain('temple.key');
});
