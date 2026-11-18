import { describe, expect, it } from 'vitest';
import { buy } from '@pestouille/engine';

const herb = { id: 'healing_herb', price: 15, stackMax: 99 };

describe('boutique', () => {
    it('achat : or débité, quantité ajoutée, entrée inchangée', () => {
        const inv = { gold: 40, items: { healing_herb: 1 } };
        expect(buy(inv, herb, 2)).toEqual({ ok: true, inv: { gold: 10, items: { healing_herb: 3 } } });
        expect(inv).toEqual({ gold: 40, items: { healing_herb: 1 } });
    });
    it('T17 achat sans or : refus atomique', () => {
        expect(buy({ gold: 20, items: {} }, herb, 2)).toEqual({ ok: false, reason: 'no_gold' });
    });
    it('quantité nulle, négative ou non entière : refus', () => {
        for (const q of [0, -1, 1.5]) expect(buy({ gold: 100, items: {} }, herb, q)).toEqual({ ok: false, reason: 'bad_quantity' });
    });
    it('pile pleine : refus', () => {
        expect(buy({ gold: 999, items: { healing_herb: 98 } }, herb, 2)).toEqual({ ok: false, reason: 'stack_full' });
    });
});
