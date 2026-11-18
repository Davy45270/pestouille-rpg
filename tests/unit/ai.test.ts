import { describe, expect, it } from 'vitest';
import { enemyCommands, resolveRound, type BossDef, type Rules } from '@pestouille/engine';
import { battle, rules as base, unit } from './helpers';

const rules: Rules = {
    ...base,
    skills: {
        ...base.skills,
        thorn_strike: { id: 'thorn_strike', mpCost: 0, power: 110, kind: 'damage', element: 'earth', target: 'enemy' },
        summon_sprout: { id: 'summon_sprout', mpCost: 0, power: 0, kind: 'summon', element: 'earth', target: 'enemy' },
        bramble_storm: { id: 'bramble_storm', mpCost: 0, power: 140, kind: 'damage', element: 'earth', target: 'all_enemies' }
    },
    summons: { summon_sprout: unit('sprout', 'enemy', { s: { hp: 30, speed: 1 } }) }
};
const roncierDef: BossDef = { phases: { A: ['thorn_strike'], B: ['thorn_strike', 'summon_sprout'], C: ['thorn_strike', 'bramble_storm'] } };
const boss = (hp: number) => unit('roncier', 'enemy', { hp, boss: true, s: { hp: 420, magic: 20 } });

describe('IA ennemie', () => {
    it('un ennemi ordinaire attaque le joueur vivant le plus faible (départage par id)', () => {
        const b = battle([unit('a', 'player', { hp: 50 }), unit('b', 'player', { hp: 20 }), unit('c', 'player', { hp: 20 }), unit('e', 'enemy')]);
        expect(enemyCommands(b, rules)).toEqual([{ type: 'attack', actorId: 'e', targetId: 'b' }]);
    });
    it('Roncier phase A : frappe de ronces', () => {
        const b = battle([unit('p', 'player'), boss(420)]);
        expect(enemyCommands(b, rules, roncierDef)).toEqual([{ type: 'skill', actorId: 'roncier', skillId: 'thorn_strike', targetId: 'p' }]);
    });
    it('phase B : invoque un rejeton s\'il n\'y en a pas, puis frappe', () => {
        const b = battle([unit('p', 'player', { s: { speed: 1 } }), boss(200)]);
        const cmds = enemyCommands(b, rules, roncierDef);
        expect(cmds).toEqual([{ type: 'skill', actorId: 'roncier', skillId: 'summon_sprout', targetId: 'roncier' }]);
        const after = resolveRound(b, cmds, rules).battle;
        expect(after.units.map(u => u.id)).toContain('sprout#1');
        expect(enemyCommands(after, rules, roncierDef).find(c => c.actorId === 'roncier')).toMatchObject({ skillId: 'thorn_strike' });
    });
    it('phase C : attaque de zone annoncée un round avant, puis frappe tous les joueurs', () => {
        let b = battle([unit('p', 'player'), unit('l', 'player'), boss(100)]);
        const announce = enemyCommands(b, rules, roncierDef);
        expect(announce).toEqual([{ type: 'telegraph', actorId: 'roncier', skillId: 'bramble_storm' }]);
        const r1 = resolveRound(b, announce, rules);
        expect(r1.events).toContainEqual({ type: 'telegraph', actorId: 'roncier', reason: 'bramble_storm' });
        expect(r1.events.some(e => e.type === 'damage')).toBe(false);
        b = r1.battle;
        const strike = enemyCommands(b, rules, roncierDef);
        const r2 = resolveRound(b, strike, rules);
        expect(r2.events.filter(e => e.type === 'damage').map(e => e.targetId).sort()).toEqual(['l', 'p']);
        expect(r2.battle.telegraph).toBeNull();
    });
});
