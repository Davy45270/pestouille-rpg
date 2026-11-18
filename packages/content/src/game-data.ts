// Assemble les données de la partie (GameData du moteur) à partir des fichiers de contenu validés.
import { statsAt, type BossDef, type EncounterDef, type FoeDef, type GameData, type HeroDef, type ItemDef, type NodeEvent, type SkillDef, type Stats, type Unit, type WorldGraph } from '@pestouille/engine';
import type { ContentBundle } from './validate.ts';

interface Creature { id: string; name: string; element: FoeDef['element']; recruitable: boolean; baseChance: number; baseStats: Stats }
interface Job { id: string; skills: string[]; growth: Stats }
interface Item { id: string; name: string; heal?: number }
interface Skill extends SkillDef { name: string }
interface Encounter { id: string; enemies: { creatureId: string; level: number }[]; rewards: { xp: number; gold: number } }
interface Boss { id: string; phases: { id: 'A' | 'B' | 'C'; skills: string[] }[] }
interface Quest { id: string; steps: string[]; rewards: { xp: number; items: string[] } }
interface HeroScene { name: string; job: string; level: number; element: FoeDef['element']; baseStats: Stats }
export interface Scene {
    quest: string; boss: string; bossStats: Stats; summons: Record<string, { creatureId: string; level: number }>;
    heroes: Record<string, HeroScene>; startParty: string[]; partyFlag: { flag: string; members: string[] };
    nodes: Record<string, { name: string; event?: NodeEvent }>;
}
export interface WorldFile { start: string; regions: Record<string, string[]>; transitions: string[][]; gates: { target: string; requires: string }[]; checkpoints: string[]; grants: Record<string, string> }

const byId = <T extends { id: string }>(xs: unknown[]): Record<string, T> => Object.fromEntries((xs as T[]).map(x => [x.id, x]));
const growthOf = (b: Stats): Stats => ({ hp: Math.floor(b.hp / 10), mp: Math.floor(b.mp / 10), attack: Math.floor(b.attack / 10),
    defense: Math.floor(b.defense / 10), magic: Math.floor(b.magic / 10), resistance: Math.floor(b.resistance / 10), speed: Math.floor(b.speed / 10), luck: Math.floor(b.luck / 10) });

export function toWorld(w: WorldFile): WorldGraph {
    return { ...w, transitions: w.transitions.map(t => [t[0] ?? '', t[1] ?? ''] as [string, string]) };
}

export function buildGameData(bundle: ContentBundle, scene: Scene, world: WorldFile): GameData {
    const creatures = byId<Creature>(bundle.creatures), jobs = byId<Job>(bundle.jobs), items = byId<Item>(bundle.items);
    const skills = byId<Skill>(bundle.skills), encounters = byId<Encounter>(bundle.encounters), bosses = byId<Boss>(bundle.bosses);
    const quest = byId<Quest>(bundle.quests)[scene.quest];
    const boss = bosses[scene.boss];
    if (!quest || !boss) throw new Error('scène : quête ou boss inconnu');
    const foe = (creatureId: string, level: number): FoeDef => {
        const c = creatures[creatureId];
        if (!c) throw new Error(`créature inconnue : ${creatureId}`);
        return { definitionId: c.id, name: c.name, level, element: c.element, recruitable: c.recruitable, affinity: c.baseChance - 35, stats: statsAt(c.baseStats, growthOf(c.baseStats), level) };
    };
    const heroes: Record<string, HeroDef> = Object.fromEntries(Object.entries(scene.heroes).map(([id, h]) => {
        const job = jobs[h.job];
        if (!job) throw new Error(`métier inconnu : ${h.job}`);
        return [id, { name: h.name, level: h.level, element: h.element, baseStats: h.baseStats, growth: job.growth, skills: job.skills }];
    }));
    const summons: Record<string, Unit> = Object.fromEntries(Object.entries(scene.summons).map(([skill, s]) => {
        const f = foe(s.creatureId, s.level);
        return [skill, { id: 'rejeton', definitionId: f.definitionId, team: 'enemy', level: f.level, stats: f.stats, hp: f.stats.hp, mp: f.stats.mp, element: f.element, recruitable: false, boss: false, affinity: 0 } satisfies Unit];
    }));
    const phase = (id: 'A' | 'B' | 'C'): string[] => boss.phases.find(p => p.id === id)?.skills ?? [];
    const def: BossDef = { phases: { A: phase('A'), B: phase('B'), C: phase('C') } };
    const names: Record<string, string> = { ...Object.fromEntries(Object.values(creatures).map(c => [c.id, c.name])),
        ...Object.fromEntries(Object.values(items).map(i => [i.id, i.name])), ...Object.fromEntries(Object.values(skills).map(k => [k.id, k.name])),
        ...Object.fromEntries(Object.entries(scene.heroes).map(([id, h]) => [id, h.name])), [boss.id]: 'Roncier', rejeton: 'Rejeton' };
    return {
        world: toWorld(world), quest: { id: quest.id, steps: quest.steps, rewards: quest.rewards },
        rules: {
            skills: Object.fromEntries(Object.values(skills).map(k => [k.id, { id: k.id, mpCost: k.mpCost, power: k.power, kind: k.kind, element: k.element, target: k.target }])),
            items: Object.fromEntries(Object.values(items).filter((i): i is Item & { heal: number } => typeof i.heal === 'number').map(i => [i.id, { id: i.id, heal: i.heal } satisfies ItemDef])),
            summons
        },
        heroes, startParty: scene.startParty, partyFlag: scene.partyFlag, nodes: scene.nodes,
        encounters: Object.fromEntries(Object.values(encounters).map(e => [e.id, { foes: e.enemies.map(x => foe(x.creatureId, x.level)), xp: e.rewards.xp, gold: e.rewards.gold } satisfies EncounterDef])),
        boss: { unit: { id: boss.id, definitionId: boss.id, team: 'enemy', level: 8, stats: scene.bossStats, hp: scene.bossStats.hp, mp: scene.bossStats.mp, element: 'earth', recruitable: false, boss: true, affinity: 0 }, def, name: 'Roncier' },
        names
    };
}
