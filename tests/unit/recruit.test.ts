import { describe, expect, it } from 'vitest';
import { canSoothe, resolveRound, sootheChance, type Battle } from '@pestouille/engine';
import { battle, rules, unit } from './helpers';

const moss = (hp: number, over = {}) => unit('mossling', 'enemy', { hp, recruitable: true, s: { hp: 100 }, ...over });
const soothe = (b: Battle, tutorial = false) =>
    resolveRound(b, [{ type: 'soothe', actorId: 'pestouille', targetId: 'mossling' }], { ...rules, tutorialRecruit: tutorial });

describe('conditions', () => {
    it('T06 cible à 31 % : refus, aucun tirage', () => {
        const b = battle([unit('pestouille', 'player'), moss(31), unit('other', 'enemy')]);
        expect(canSoothe(b.units[1]!)).toEqual({ ok: false, reason: 'too_healthy' });
        const r = soothe(b);
        expect(r.events).toContainEqual(expect.objectContaining({ type: 'rejected', reason: 'too_healthy' }));
        expect(r.battle.rng).toEqual(b.rng);
    });
    it('T07 cible à 30 % : tentative, exactement un tirage', () => {
        const b = battle([unit('pestouille', 'player'), moss(30), unit('other', 'enemy')]);
        expect(canSoothe(b.units[1]!)).toEqual({ ok: true });
        const r = soothe(b);
        expect(r.events.some(e => e.type === 'soothed' || e.type === 'soothe_failed')).toBe(true);
        expect(r.battle.rng).not.toEqual(b.rng);
    });
    it('T08 boss : jamais recrutable', () => {
        expect(canSoothe(unit('roncier', 'enemy', { hp: 1, recruitable: true, boss: true }))).toEqual({ ok: false, reason: 'boss' });
    });
    it('non recrutable ou KO : refus', () => {
        expect(canSoothe(unit('x', 'enemy', { hp: 1 }))).toEqual({ ok: false, reason: 'not_recruitable' });
        expect(canSoothe(unit('x', 'enemy', { hp: 0, recruitable: true }))).toEqual({ ok: false, reason: 'ko' });
    });
    it('chance : 35 % + affinité, plafond 90 %', () => {
        expect(sootheChance(moss(10))).toBe(35);
        expect(sootheChance(moss(10, { affinity: 20 }))).toBe(55);
        expect(sootheChance(moss(10, { affinity: 80 }))).toBe(90);
    });
});

describe('issue', () => {
    it('T09 tutoriel : succès garanti une seule fois, puis chance normale', () => {
        const units = [unit('pestouille', 'player'), moss(10, { affinity: -35 }), unit('other', 'enemy')];
        const first = soothe(battle(units), true);
        expect(first.events).toContainEqual(expect.objectContaining({ type: 'soothed', targetId: 'mossling' }));
        expect(first.battle.tutorialRecruitDone).toBe(true);
        // affinité -35 : chance 0 ; hors tutoriel l'échec est certain
        const again = soothe(battle(units, { tutorialRecruitDone: true }), true);
        expect(again.events).toContainEqual(expect.objectContaining({ type: 'soothe_failed' }));
    });
    it('succès : la créature quitte le combat, entre en réserve avec un identifiant unique', () => {
        const units = [unit('pestouille', 'player'), unit('lila', 'player'), moss(10, { affinity: 80 }),
            unit('mossling2', 'enemy', { definitionId: 'mossling', hp: 10, recruitable: true, affinity: 80, s: { hp: 100 } }), unit('other', 'enemy')];
        let b = battle(units);
        for (const target of ['mossling', 'mossling2']) {
            let tries = 0;
            while (b.units.some(u => u.id === target) && tries++ < 20) {
                b = resolveRound(b, [{ type: 'soothe', actorId: 'pestouille', targetId: target }], rules).battle;
            }
        }
        expect(b.recruited.map(u => u.id)).toEqual(['mossling#1', 'mossling#2']);
        expect(b.units.map(u => u.id)).toEqual(['pestouille', 'lila', 'other']);
    });
    it('cible recrutée plus tôt dans le round : annulé sans tirage', () => {
        const b = battle([unit('pestouille', 'player', { s: { speed: 20 } }), unit('lila', 'player'), moss(10), unit('other', 'enemy')]);
        const r = resolveRound(b, [{ type: 'soothe', actorId: 'pestouille', targetId: 'mossling' },
            { type: 'soothe', actorId: 'lila', targetId: 'mossling' }], { ...rules, tutorialRecruit: true });
        expect(r.events).toContainEqual(expect.objectContaining({ type: 'cancelled', actorId: 'lila' }));
        expect(r.battle.recruitCount).toBe(1);
    });
});
