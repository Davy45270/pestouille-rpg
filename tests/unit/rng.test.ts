import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { nextU32, rollPercent, seedRng, stateHash, type RngState } from '@pestouille/engine';

const draws = (s: RngState, n: number): number[] => {
    const out: number[] = [];
    let st = s;
    for (let i = 0; i < n; i++) { const [v, next] = nextU32(st); out.push(v); st = next; }
    return out;
};

describe('graine et tirages', () => {
    it('T01 même graine, mêmes 1 000 tirages', () => {
        expect(draws(seedRng('lucioles'), 1000)).toEqual(draws(seedRng('lucioles'), 1000));
    });
    it('graines différentes, suites différentes', () => {
        expect(draws(seedRng('lucioles'), 8)).not.toEqual(draws(seedRng('murmures'), 8));
    });
    it('un état n\'est jamais tout à zéro et reste un uint32 x4', () => {
        fc.assert(fc.property(fc.string(), seed => {
            const s = seedRng(seed);
            return [...s].length === 4 && s.some(v => v !== 0) && s.every(v => Number.isInteger(v) && v >= 0 && v <= 0xffffffff);
        }));
    });
    it('rollPercent rend 0..99 et avance l\'état', () => {
        fc.assert(fc.property(fc.string(), seed => {
            const s = seedRng(seed);
            const [p, next] = rollPercent(s);
            return Number.isInteger(p) && p >= 0 && p <= 99 && next !== s;
        }));
    });
    it('nextU32 ne modifie pas son argument', () => {
        const s = seedRng('x');
        const copy = [...s];
        nextU32(s);
        expect([...s]).toEqual(copy);
    });
});

describe('empreinte', () => {
    it('ne dépend pas de l\'ordre des clés', () => {
        expect(stateHash({ a: 1, b: [2, { c: 3, d: 4 }] })).toBe(stateHash({ b: [2, { d: 4, c: 3 }], a: 1 }));
    });
    it('16 caractères hexadécimaux, sensible au contenu', () => {
        expect(stateHash({ a: 1 })).toMatch(/^[0-9a-f]{16}$/);
        expect(stateHash({ a: 1 })).not.toBe(stateHash({ a: 2 }));
    });
});
