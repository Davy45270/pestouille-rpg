import { createBattle, type Battle, type Rules, type Stats, type Unit } from '@pestouille/engine';

export const stats = (over: Partial<Stats> = {}): Stats =>
    ({ hp: 100, mp: 20, attack: 30, defense: 10, magic: 20, resistance: 10, speed: 10, luck: 5, ...over });

export function unit(id: string, team: Unit['team'], over: Partial<Unit> & { s?: Partial<Stats> } = {}): Unit {
    const { s, ...rest } = over;
    const st = stats(s);
    return { id, definitionId: id, team, level: 1, stats: st, hp: st.hp, mp: st.mp, element: 'neutral',
        recruitable: false, boss: false, affinity: 0, ...rest };
}

export const rules: Rules = {
    skills: {
        fire_breath: { id: 'fire_breath', mpCost: 5, power: 120, kind: 'damage', element: 'fire', target: 'enemy' },
        heal: { id: 'heal', mpCost: 4, power: 40, kind: 'heal', element: 'light', target: 'ally' }
    },
    items: { healing_herb: { id: 'healing_herb', heal: 30 } }
};

export const battle = (units: Unit[], over: Partial<Parameters<typeof createBattle>[0]> = {}): Battle =>
    createBattle({ seed: 'test', units, inventory: { healing_herb: 1 }, ...over });
