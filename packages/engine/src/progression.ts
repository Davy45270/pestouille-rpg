// Progression : seuils d'XP cumulés 10 * n * (n - 1), statistiques base + croissance * (niveau - 1), bornées.
import type { Stats } from './types.ts';

export const MAX_LEVEL = 50;
export const xpForLevel = (level: number): number => 10 * level * (level - 1);

export function statsAt(base: Stats, growth: Stats, level: number): Stats {
    const at = (k: keyof Stats): number => Math.min(9999, base[k] + growth[k] * (level - 1));
    return { hp: at('hp'), mp: at('mp'), attack: at('attack'), defense: at('defense'), magic: at('magic'),
        resistance: at('resistance'), speed: at('speed'), luck: at('luck') };
}

export function gainXp(u: { level: number; xp: number }, xp: number, maxLevel = MAX_LEVEL): { level: number; xp: number; levelsGained: number } {
    const total = u.xp + Math.max(0, xp);
    let level = u.level;
    while (level < maxLevel && total >= xpForLevel(level + 1)) level += 1;
    return { level, xp: total, levelsGained: level - u.level };
}
