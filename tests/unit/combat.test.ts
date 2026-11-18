import { describe, expect, it } from 'vitest';
import { physicalDamage, resolveRound, stateHash, type Command } from '@pestouille/engine';
import { battle, rules, unit } from './helpers';

const hp = (b: ReturnType<typeof battle>, id: string): number | undefined => b.units.find(u => u.id === id)?.hp;

describe('formule du slice', () => {
    it('max(1, floor((atk - floor(def/2)) * power / 100))', () => {
        expect(physicalDamage(30, 10, 100)).toBe(25);
        expect(physicalDamage(30, 11, 150)).toBe(37);
        expect(physicalDamage(5, 40, 100)).toBe(1);
    });
});

describe('ordre et validations', () => {
    it('T02 vitesse égale : ordre par identifiant, ordre des commandes indifférent', () => {
        const b = battle([unit('b-hero', 'player'), unit('a-hero', 'player'), unit('slime', 'enemy', { s: { hp: 500 } })]);
        const cmds: Command[] = [{ type: 'attack', actorId: 'b-hero', targetId: 'slime' }, { type: 'attack', actorId: 'a-hero', targetId: 'slime' }];
        const r1 = resolveRound(b, cmds, rules);
        const r2 = resolveRound(b, [...cmds].reverse(), rules);
        expect(r1.events.filter(e => e.type === 'damage').map(e => e.actorId)).toEqual(['a-hero', 'b-hero']);
        expect(stateHash(r1.battle)).toBe(stateHash(r2.battle));
    });
    it('vitesse décroissante d\'abord', () => {
        const b = battle([unit('a', 'player'), unit('z', 'player', { s: { speed: 20 } }), unit('e', 'enemy', { s: { hp: 500 } })]);
        const r = resolveRound(b, [{ type: 'attack', actorId: 'a', targetId: 'e' }, { type: 'attack', actorId: 'z', targetId: 'e' }], rules);
        expect(r.events.filter(e => e.type === 'damage').map(e => e.actorId)).toEqual(['z', 'a']);
    });
    it('T03 cible KO plus tôt dans le round : action annulée, PM non dépensés', () => {
        const b = battle([unit('fast', 'player', { s: { speed: 20 } }), unit('mage', 'player'), unit('e1', 'enemy', { s: { hp: 10 } }), unit('e2', 'enemy')]);
        const r = resolveRound(b, [{ type: 'attack', actorId: 'fast', targetId: 'e1' }, { type: 'skill', actorId: 'mage', skillId: 'fire_breath', targetId: 'e1' }], rules);
        expect(r.events).toContainEqual(expect.objectContaining({ type: 'cancelled', actorId: 'mage' }));
        expect(r.battle.units.find(u => u.id === 'mage')?.mp).toBe(20);
    });
    it('acteur KO avant son tour : ignoré', () => {
        const b = battle([unit('slow', 'player', { hp: 5 }), unit('tank', 'player'), unit('e', 'enemy', { s: { speed: 20 } })]);
        const r = resolveRound(b, [{ type: 'attack', actorId: 'e', targetId: 'slow' }, { type: 'attack', actorId: 'slow', targetId: 'e' }], rules);
        expect(r.events).toContainEqual(expect.objectContaining({ type: 'skipped', actorId: 'slow' }));
    });
    it('deux commandes pour le même acteur : la seconde est rejetée', () => {
        const b = battle([unit('h', 'player'), unit('e', 'enemy', { s: { hp: 500 } })]);
        const r = resolveRound(b, [{ type: 'attack', actorId: 'h', targetId: 'e' }, { type: 'attack', actorId: 'h', targetId: 'e' }], rules);
        expect(r.events.filter(e => e.type === 'damage')).toHaveLength(1);
        expect(r.events).toContainEqual(expect.objectContaining({ type: 'rejected', reason: 'duplicate_actor' }));
    });
    it('PM insuffisants et objet absent : rejet', () => {
        const b = battle([unit('h', 'player', { mp: 2 }), unit('e', 'enemy')], { inventory: {} });
        const r = resolveRound(b, [{ type: 'skill', actorId: 'h', skillId: 'fire_breath', targetId: 'e' }], rules);
        expect(r.events).toContainEqual(expect.objectContaining({ type: 'rejected', reason: 'no_mp' }));
        const r2 = resolveRound(b, [{ type: 'item', actorId: 'h', itemId: 'healing_herb', targetId: 'h' }], rules);
        expect(r2.events).toContainEqual(expect.objectContaining({ type: 'rejected', reason: 'no_item' }));
    });
});

describe('effets', () => {
    it('T04 défendre divise par deux les dégâts, même si le défenseur est plus lent', () => {
        const b = battle([unit('h', 'player'), unit('e', 'enemy', { s: { speed: 30 } })]);
        const r = resolveRound(b, [{ type: 'defend', actorId: 'h' }, { type: 'attack', actorId: 'e', targetId: 'h' }], rules);
        expect(hp(r.battle, 'h')).toBe(100 - 12);
        expect(r.battle.defending).toEqual([]);
    });
    it('T05 soin plafonné au maximum ; objet consommé', () => {
        const b = battle([unit('h', 'player', { hp: 90 }), unit('e', 'enemy')]);
        const r = resolveRound(b, [{ type: 'skill', actorId: 'h', skillId: 'heal', targetId: 'h' }], rules);
        expect(hp(r.battle, 'h')).toBe(100);
        const r2 = resolveRound(b, [{ type: 'item', actorId: 'h', itemId: 'healing_herb', targetId: 'h' }], rules);
        expect(hp(r2.battle, 'h')).toBe(100);
        expect(r2.battle.inventory.healing_herb).toBe(0);
    });
    it('PV jamais négatifs, victoire quand tous les ennemis sont KO', () => {
        const b = battle([unit('h', 'player', { s: { attack: 200 } }), unit('e', 'enemy', { s: { hp: 10 } })]);
        const r = resolveRound(b, [{ type: 'attack', actorId: 'h', targetId: 'e' }], rules);
        expect(hp(r.battle, 'e')).toBe(0);
        expect(r.battle.outcome).toBe('victory');
        expect(resolveRound(r.battle, [], rules).events).toEqual([{ type: 'rejected', reason: 'battle_over' }]);
    });
    it('défaite quand tous les joueurs sont KO', () => {
        const b = battle([unit('h', 'player', { hp: 1 }), unit('e', 'enemy')]);
        expect(resolveRound(b, [{ type: 'attack', actorId: 'e', targetId: 'h' }], rules).battle.outcome).toBe('defeat');
    });
    it('fuite : un tirage, déterministe ; interdite contre un boss', () => {
        const b = battle([unit('h', 'player', { s: { speed: 50 } }), unit('e', 'enemy')]);
        const r = resolveRound(b, [{ type: 'flee', actorId: 'h' }], rules);
        expect(r.battle.outcome).toBe('escaped'); // chance 95 % avec cette graine
        expect(r.battle.rng).not.toEqual(b.rng);
        const boss = battle([unit('h', 'player'), unit('roncier', 'enemy', { boss: true })]);
        const rb = resolveRound(boss, [{ type: 'flee', actorId: 'h' }], rules);
        expect(rb.events).toContainEqual(expect.objectContaining({ type: 'rejected', reason: 'boss' }));
        expect(rb.battle.rng).toEqual(boss.rng);
    });
    it('T01 rejeu : mêmes graine et commandes, même empreinte ; l\'entrée n\'est pas modifiée', () => {
        const b = battle([unit('h', 'player'), unit('l', 'player'), unit('e', 'enemy', { s: { hp: 300 } })]);
        const before = stateHash(b);
        const play = () => [1, 2, 3].reduce(acc => resolveRound(acc, [
            { type: 'attack', actorId: 'h', targetId: 'e' }, { type: 'flee', actorId: 'l' }], rules).battle, b);
        expect(stateHash(play())).toBe(stateHash(play()));
        expect(stateHash(b)).toBe(before);
    });
});
