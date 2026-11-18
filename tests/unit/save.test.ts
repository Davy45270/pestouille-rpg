import { describe, expect, it } from 'vitest';
import { deserialize, newGame, SaveError, serialize, stateHash, step, type GameState } from '@pestouille/engine';
import { data, partyCommands } from './slice-bot';

function midBattle(): GameState {
    let s = newGame(data, 'sauvegarde');
    for (const to of ['village.inn', 'village.place', 'village.forest_gate', 'forest.entry']) s = step(s, data, { type: 'move', to }).state;
    return step(s, data, { type: 'battle', commands: partyCommands(s, data) }).state;
}

describe('sauvegarde', () => {
    it('T15 reprise : état RNG, inventaire et combat en cours conservés ; la suite est identique', () => {
        const s = midBattle();
        expect(s.battle).not.toBeNull();
        const back = deserialize(serialize(s));
        expect(back.battle?.rng).toEqual(s.battle?.rng);
        expect(back.inventory).toEqual(s.inventory);
        expect(stateHash(back)).toBe(stateHash(s));
        const next = (x: GameState): string => stateHash(step(x, data, { type: 'battle', commands: partyCommands(x, data) }).state);
        expect(next(back)).toBe(next(s));
    });
    it('T16 version future : erreur explicite', () => {
        const env = JSON.parse(serialize(midBattle())) as { version: number };
        env.version = 2;
        expect(() => deserialize(JSON.stringify(env))).toThrow(SaveError);
        expect(() => deserialize(JSON.stringify(env))).toThrow('plus récente que le jeu');
    });
    it('sauvegarde altérée, illisible ou étrangère : refusée', () => {
        const env = JSON.parse(serialize(midBattle())) as { state: GameState };
        env.state.gold = 9999;
        expect(() => deserialize(JSON.stringify(env))).toThrow('altérée');
        expect(() => deserialize('{')).toThrow('illisible');
        expect(() => deserialize('{"format":"autre"}')).toThrow('pas une sauvegarde');
    });
});
