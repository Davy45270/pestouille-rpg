import { describe, expect, it } from 'vitest';
import { bossPhaseFor, resolveRound } from '@pestouille/engine';
import roncier from '../../content/bosses/roncier.json';
import { battle, rules, unit } from './helpers';

const boss = (hp: number) => unit('roncier', 'enemy', { hp, boss: true, s: { hp: roncier.hp, defense: 10, resistance: 10 } });

describe('phases de Roncier', () => {
    it('donnée du slice : 420 PV, non recrutable, 180 XP', () => {
        expect(roncier.hp).toBe(420);
        expect(roncier.recruitable).toBe(false);
        expect(roncier.rewards).toEqual({ xp: 180, items: ['first_flame'] });
    });
    it('A au-dessus de 65 %, B de 31 à 65 %, C à 30 % et moins (T19)', () => {
        expect(bossPhaseFor(420, 420, null)).toBe('A');
        expect(bossPhaseFor(274, 420, 'A')).toBe('A');
        expect(bossPhaseFor(273, 420, 'A')).toBe('B');
        expect(bossPhaseFor(127, 420, 'B')).toBe('B');
        expect(bossPhaseFor(126, 420, 'B')).toBe('C');
    });
    it('la phase ne redescend jamais', () => {
        expect(bossPhaseFor(400, 420, 'C')).toBe('C');
        expect(bossPhaseFor(400, 420, 'B')).toBe('B');
    });
    it('le combat émet le changement de phase', () => {
        const b = battle([unit('h', 'player', { s: { attack: 30 } }), boss(135)]);
        const r = resolveRound(b, [{ type: 'attack', actorId: 'h', targetId: 'roncier' }], rules);
        expect(r.battle.bossPhase).toBe('C');
        expect(r.events).toContainEqual({ type: 'boss_phase', targetId: 'roncier', reason: 'C' });
    });
    it('feu x1,5 en phase C seulement ; résistance physique en phase B (dégâts / 2)', () => {
        const breath = (hp: number) => resolveRound(battle([unit('p', 'player', { s: { magic: 30 } }), boss(hp)]),
            [{ type: 'skill', actorId: 'p', skillId: 'fire_breath', targetId: 'roncier' }], rules).events.find(e => e.type === 'damage')?.amount;
        expect(breath(400)).toBe(30); // floor((30 - 5) * 120 / 100)
        expect(breath(100)).toBe(45);
        const claw = (hp: number) => resolveRound(battle([unit('p', 'player'), boss(hp)]),
            [{ type: 'attack', actorId: 'p', targetId: 'roncier' }], rules).events.find(e => e.type === 'damage')?.amount;
        expect(claw(400)).toBe(25);
        expect(claw(200)).toBe(12);
    });
    it('contre un boss : apaiser et fuir sont refusés', () => {
        const b = battle([unit('p', 'player'), unit('l', 'player'), boss(10)]);
        const r = resolveRound(b, [{ type: 'soothe', actorId: 'p', targetId: 'roncier' }, { type: 'flee', actorId: 'l' }], rules);
        expect(r.events.filter(e => e.type === 'rejected').map(e => e.reason).sort()).toEqual(['boss', 'boss']);
    });
});
