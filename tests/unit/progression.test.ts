import { describe, expect, it } from 'vitest';
import { gainXp, statsAt, xpForLevel } from '@pestouille/engine';
import { stats } from './helpers';

describe('niveaux', () => {
    it('seuils cumulés : 0, 20, 60, 120', () => {
        expect([1, 2, 3, 4].map(xpForLevel)).toEqual([0, 20, 60, 120]);
    });
    it('T18 montée de niveau : niveaux gagnés et statistiques recalculées', () => {
        expect(gainXp({ level: 1, xp: 0 }, 19)).toEqual({ level: 1, xp: 19, levelsGained: 0 });
        expect(gainXp({ level: 1, xp: 0 }, 20)).toEqual({ level: 2, xp: 20, levelsGained: 1 });
        expect(gainXp({ level: 1, xp: 0 }, 180)).toEqual({ level: 4, xp: 180, levelsGained: 3 });
        const base = stats({ hp: 50 }), growth = stats({ hp: 5, attack: 3 });
        expect(statsAt(base, growth, 1)).toEqual(base);
        expect(statsAt(base, growth, 3)).toMatchObject({ hp: 60, attack: 36 });
    });
    it('plafond de niveau 50 et de statistique 9999', () => {
        expect(gainXp({ level: 49, xp: xpForLevel(49) }, 10 ** 7).level).toBe(50);
        expect(statsAt(stats({ hp: 9990 }), stats({ hp: 50 }), 50).hp).toBe(9999);
    });
});
