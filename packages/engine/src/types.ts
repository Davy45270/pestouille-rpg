import type { RngState } from './rng.ts';

export interface Stats { hp: number; mp: number; attack: number; defense: number; magic: number; resistance: number; speed: number; luck: number }
export type Element = 'neutral' | 'fire' | 'water' | 'earth' | 'wind' | 'ice' | 'light' | 'shadow';
export type Team = 'player' | 'enemy';
export type BossPhase = 'A' | 'B' | 'C';

export interface Unit {
    id: string; definitionId: string; team: Team; level: number; stats: Stats;
    hp: number; mp: number; element: Element; recruitable: boolean; boss: boolean; affinity: number;
}
export interface SkillDef { id: string; mpCost: number; power: number; kind: 'damage' | 'heal'; element: Element; target: 'enemy' | 'ally' }
export interface ItemDef { id: string; heal: number }
export interface Rules { skills: Record<string, SkillDef>; items: Record<string, ItemDef>; tutorialRecruit?: boolean }

export interface Battle {
    round: number; rng: RngState; units: Unit[]; inventory: Record<string, number>;
    outcome: 'ongoing' | 'victory' | 'defeat' | 'escaped'; defending: string[];
    tutorialRecruitDone: boolean; recruited: Unit[]; recruitCount: number; bossPhase: BossPhase | null;
}

export type Command =
    | { type: 'attack'; actorId: string; targetId: string }
    | { type: 'skill'; actorId: string; skillId: string; targetId: string }
    | { type: 'item'; actorId: string; itemId: string; targetId: string }
    | { type: 'defend'; actorId: string }
    | { type: 'flee'; actorId: string }
    | { type: 'soothe'; actorId: string; targetId: string };

export interface BattleEvent { type: string; actorId?: string; targetId?: string; amount?: number; reason?: string }
