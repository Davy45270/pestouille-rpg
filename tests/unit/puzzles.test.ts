import { describe, expect, it } from 'vitest';
import { newBlocks, newSwitches, press, pushMove, solved, type Dir } from '@pestouille/engine';

describe('énigmes du temple', () => {
    it('blocs : un mur arrête le joueur, un bloc contre un mur ne bouge pas', () => {
        const s = newBlocks();
        expect(pushMove(s, 'up')).toBe(s);
        let t = s;
        for (const d of ['down', 'right', 'right', 'right'] as Dir[]) t = pushMove(t, d);
        expect(t.block).toEqual([4, 2]);
        expect(pushMove(t, 'right').block).toEqual([4, 2]);
    });
    it('blocs : la solution en cinq gestes pose le bloc sur la dalle', () => {
        let s = newBlocks();
        for (const d of ['down', 'right', 'up', 'right', 'down'] as Dir[]) s = pushMove(s, d);
        expect(s.block).toEqual([3, 3]);
        expect(solved(s)).toBe(true);
    });
    it('interrupteurs : chacun bascule ses voisins ; 0 puis 3 allume tout', () => {
        let s = newSwitches();
        s = press(s, 0);
        expect(s.on).toEqual([true, true, false, false]);
        expect(solved(s)).toBe(false);
        s = press(s, 3);
        expect(solved(s)).toBe(true);
        expect(press(s, 1)).toBe(s);
    });
});
