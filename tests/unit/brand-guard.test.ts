// Repris de echecs-kid (tests/brand-guard.test.ts), liste étendue aux séries que les specs du jeu nomment.
import { publicLines } from '../../scripts/public-files';
import { it, expect } from 'vitest';
const forbidden = [['zel', 'da'], ['nin', 'tendo'], ['dragon', ' quest'], ['dragon', ' warrior'], ['poke', 'mon'], ['poké', 'mon'],
    ['final', ' fantasy'], ['hy', 'rule'], ['ru', 'pee'], ['ma', 'rio'], ['king', ' slime'], ['ki', 'rby'],
    ['metal', ' slug'], ['tet', 'ris'], ['pac', '-man'], ['bomber', 'man']].map(parts => parts.join(''));
const brand = new RegExp(`(?<![\\p{L}\\p{N}])(?:${forbidden.join('|')})(?![\\p{L}\\p{N}])`, 'iu');
const ticket = /\b[A-Z]{2,10}-\d+\b/;
export const offending = (line: string): boolean => brand.test(line) || ticket.test(line);
it('public text has no commercial names or internal ticket identifiers', () => {
    const violations = publicLines(process.cwd()).filter(({ line }) => offending(line)).map(({ file, number }) => `${file}:${number}`);
    expect(violations).toEqual([]);
});
it('the guard catches separated names and ticket shapes, not ordinary words', () => {
    for (const name of forbidden) { expect(offending(`(${name.toUpperCase()})`)).toBe(true); expect(offending(`pre${name}post`)).toBe(false); }
    expect(offending(['AB', '123'].join('-'))).toBe(true);
    expect(offending('T01 ordinary-123 VS01')).toBe(false);
});
