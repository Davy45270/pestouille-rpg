import { describe, expect, it } from 'vitest';
import { stateHash, step, newGame, validateWorld } from '@pestouille/engine';
import { data, playSlice } from './slice-bot';

describe('tranche verticale jouée par le bot', () => {
    it('T24 : de la place du village au Roncier, quête accomplie et première flamme obtenue', () => {
        const { state, log } = playSlice('graine-1');
        expect(state.quest.status).toBe('completed');
        expect(state.quest.done).toEqual(data.quest.steps);
        expect(state.inventory.first_flame).toBe(1);
        expect(state.reserve.map(r => r.definitionId)).toContain('mossling');
        expect(state.finished).toBe(true);
        expect(log).toContain('Le groupe est au complet.');
    });
    it('T23 : même graine, mêmes actions → même empreinte', () => {
        expect(stateHash(playSlice('graine-2').state)).toBe(stateHash(playSlice('graine-2').state));
    });
    it('plusieurs graines : le slice reste gagnable', () => {
        for (const seed of ['a', 'b', 'c', 'd', 'e']) expect(playSlice(seed).state.quest.status).toBe('completed');
    });
    it('rencontre au village avant d\'avoir tout le monde : la porte du temple reste fermée', () => {
        let s = newGame(data, 'x');
        for (const to of ['village.forest_gate', 'forest.entry']) s = step(s, data, { type: 'move', to }).state;
        expect(s.battle).not.toBeNull();
        expect(step(s, data, { type: 'move', to: 'forest.glade' }).lines).toEqual(['Impossible : un combat est en cours.']);
        expect(validateWorld(data.world)).toEqual([]);
    });
});
