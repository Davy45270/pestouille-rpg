// La partie : exploration du graphe, événements de lieux, combats, énigmes, quête. Pur et déterministe :
// step(état, données, action) rend un nouvel état et les lignes à afficher. L'interface ne fait qu'appeler step.
import { enemyCommands, type BossDef } from './ai.ts';
import { createBattle, resolveRound } from './combat.ts';
import { gainXp, statsAt } from './progression.ts';
import { newPuzzle, press, pushMove, solved, type Dir, type PuzzleState } from './puzzles.ts';
import { applyQuestEvent, startQuest, type QuestDef, type QuestState } from './quests.ts';
import type { Battle, BattleEvent, Command, Element, Rules, Stats, Unit } from './types.ts';
import { exits, respawnAfterDefeat, type WorldGraph } from './world.ts';

export interface HeroDef { name: string; level: number; element: Element; baseStats: Stats; growth: Stats; skills: string[] }
export interface FoeDef { definitionId: string; name: string; level: number; element: Element; recruitable: boolean; affinity: number; stats: Stats }
export interface EncounterDef { foes: FoeDef[]; xp: number; gold: number }
export type NodeEvent =
    | { kind: 'talk'; speaker: string; lines: string[] }
    | { kind: 'join'; hero: string; step: string; lines: string[] }
    | { kind: 'rest'; lines: string[] }
    | { kind: 'battle'; encounter: string; tutorialRecruit?: boolean; lines?: string[] }
    | { kind: 'puzzle'; puzzle: 'blocks' | 'switches'; step: string; flag: string; lines: string[] }
    | { kind: 'chest'; item: string; flag: string; step: string; lines: string[] }
    | { kind: 'boss'; step: string; then: string; lines: string[] };
export interface GameData {
    world: WorldGraph; quest: QuestDef; rules: Rules;
    heroes: Record<string, HeroDef>; startParty: string[]; partyFlag: { flag: string; members: string[] };
    nodes: Record<string, { name: string; event?: NodeEvent }>;
    encounters: Record<string, EncounterDef>;
    boss: { unit: Unit; def: BossDef; name: string };
    names: Record<string, string>;
}
export interface Member { id: string; definitionId: string; name: string; level: number; xp: number; hp: number; mp: number }
export interface GameState {
    version: 1; seed: string; node: string; flags: string[]; visited: string[]; cleared: string[];
    party: Member[]; reserve: Member[]; inventory: Record<string, number>; gold: number;
    quest: QuestState; achieved: string[];
    battle: Battle | null; battleNode: string | null; battles: number;
    puzzle: PuzzleState | null; finished: boolean;
}
export type GameAction =
    | { type: 'move'; to: string }
    | { type: 'battle'; commands: Command[] }
    | { type: 'push'; dir: Dir }
    | { type: 'press'; index: number }
    | { type: 'reset_puzzle' };
export interface StepResult { state: GameState; lines: string[]; events: BattleEvent[] }

export const SAVE_VERSION = 1;

function heroUnit(data: GameData, m: Member): Unit {
    const h = data.heroes[m.id];
    if (!h) throw new Error(`héros inconnu : ${m.id}`);
    return { id: m.id, definitionId: m.id, team: 'player', level: m.level, stats: statsAt(h.baseStats, h.growth, m.level),
        hp: m.hp, mp: m.mp, element: h.element, recruitable: false, boss: false, affinity: 0 };
}
export const maxStats = (data: GameData, m: Member): Stats => {
    const h = data.heroes[m.id];
    return h ? statsAt(h.baseStats, h.growth, m.level) : { hp: m.hp, mp: m.mp, attack: 1, defense: 1, magic: 1, resistance: 1, speed: 1, luck: 1 };
};
function newMember(data: GameData, id: string): Member {
    const h = data.heroes[id];
    if (!h) throw new Error(`héros inconnu : ${id}`);
    const s = statsAt(h.baseStats, h.growth, h.level);
    return { id, definitionId: id, name: h.name, level: h.level, xp: 10 * h.level * (h.level - 1), hp: s.hp, mp: s.mp };
}
const foeUnit = (f: FoeDef, i: number): Unit => ({ id: `${f.definitionId}-${i + 1}`, definitionId: f.definitionId, team: 'enemy', level: f.level,
    stats: f.stats, hp: f.stats.hp, mp: f.stats.mp, element: f.element, recruitable: f.recruitable, boss: false, affinity: f.affinity });

export function newGame(data: GameData, seed: string): GameState {
    const s: GameState = {
        version: 1, seed, node: data.world.start, flags: [], visited: [data.world.start], cleared: [],
        party: data.startParty.map(id => newMember(data, id)), reserve: [], inventory: { healing_herb: 3 }, gold: 0,
        quest: startQuest(data.quest), achieved: [], battle: null, battleNode: null, battles: 0, puzzle: null, finished: false
    };
    return enter(s, data, data.world.start, []).state;
}

function achieve(s: GameState, data: GameData, step: string, lines: string[]): void {
    if (!s.achieved.includes(step)) s.achieved.push(step);
    for (;;) {
        const next = data.quest.steps[s.quest.done.length];
        if (next === undefined || !s.achieved.includes(next)) return;
        const r = applyQuestEvent(s.quest, data.quest, { eventId: `step:${next}`, stepId: next });
        s.quest = r.quest;
        if (r.rewards) {
            lines.push(`Quête « ${data.quest.id} » accomplie : ${r.rewards.xp} XP.`);
            for (const it of r.rewards.items) { s.inventory[it] = (s.inventory[it] ?? 0) + 1; lines.push(`Objet obtenu : ${data.names[it] ?? it}.`); }
            grantXp(s, r.rewards.xp, lines);
            s.finished = true;
        }
    }
}
function grantXp(s: GameState, xp: number, lines: string[]): void {
    for (const m of s.party) {
        const g = gainXp(m, xp);
        m.level = g.level; m.xp = g.xp;
        if (g.levelsGained > 0) lines.push(`${m.name} passe au niveau ${m.level} !`);
    }
}
const setFlag = (s: GameState, f: string): void => { if (!s.flags.includes(f)) s.flags.push(f); };
function restore(s: GameState, data: GameData): void {
    for (const m of s.party) { const st = maxStats(data, m); m.hp = st.hp; m.mp = st.mp; }
}

function enter(input: GameState, data: GameData, node: string, events: BattleEvent[]): StepResult {
    const s = structuredClone(input);
    const lines: string[] = [];
    s.node = node; s.puzzle = null;
    if (!s.visited.includes(node)) s.visited.push(node);
    lines.push(data.nodes[node]?.name ?? node);
    const ev = data.nodes[node]?.event;
    if (!ev || (s.cleared.includes(node) && ev.kind !== 'rest')) return { state: s, lines, events };
    const said: string[] | undefined = 'lines' in ev ? ev.lines : undefined;
    if (said) lines.push(...said);
    switch (ev.kind) {
        case 'talk': s.cleared.push(node); break;
        case 'rest': restore(s, data); break;
        case 'join':
            s.party.push(newMember(data, ev.hero));
            s.cleared.push(node);
            achieve(s, data, ev.step, lines);
            if (data.partyFlag.members.every(id => s.party.some(m => m.id === id))) { setFlag(s, data.partyFlag.flag); lines.push('Le groupe est au complet.'); }
            break;
        case 'chest':
            s.inventory[ev.item] = (s.inventory[ev.item] ?? 0) + 1;
            setFlag(s, ev.flag); s.cleared.push(node); achieve(s, data, ev.step, lines);
            break;
        case 'puzzle': s.puzzle = newPuzzle(ev.puzzle); break;
        case 'battle': case 'boss': {
            const foes = ev.kind === 'boss' ? [structuredClone(data.boss.unit)] : (data.encounters[ev.encounter]?.foes ?? []).map(foeUnit);
            s.battles += 1;
            s.battle = createBattle({ seed: `${s.seed}#${s.battles}`, units: [...s.party.filter(m => m.hp > 0).map(m => heroUnit(data, m)), ...foes],
                inventory: s.inventory, tutorialRecruitDone: !(ev.kind === 'battle' && ev.tutorialRecruit === true) });
            s.battleNode = node;
            break;
        }
    }
    return { state: s, lines, events };
}

function endBattle(s: GameState, data: GameData, lines: string[]): void {
    const b = s.battle;
    const node = s.battleNode;
    if (!b || !node) return;
    const ev = data.nodes[node]?.event;
    for (const m of s.party) { const u = b.units.find(x => x.id === m.id); if (u) { m.hp = u.hp; m.mp = u.mp; } }
    s.inventory = { ...b.inventory };
    s.battle = null; s.battleNode = null;
    if (b.outcome === 'defeat') {
        const back = respawnAfterDefeat(data.world, s.visited);
        restore(s, data);
        s.node = back;
        lines.push('Le groupe est vaincu…', `Retour à : ${data.nodes[back]?.name ?? back}.`);
        return;
    }
    if (b.outcome === 'escaped') { lines.push('Le groupe a fui.'); return; }
    for (const m of s.party) if (m.hp <= 0) m.hp = 1;
    for (const r of b.recruited) {
        s.reserve.push({ id: r.id, definitionId: r.definitionId, name: data.names[r.definitionId] ?? r.definitionId, level: r.level, xp: 0, hp: r.stats.hp, mp: r.stats.mp });
        lines.push(`${data.names[r.definitionId] ?? r.definitionId} rejoint la réserve !`);
    }
    lines.push('Victoire !');
    if (ev?.kind === 'boss') {
        s.cleared.push(node);
        achieve(s, data, ev.step, lines);
        achieve(s, data, ev.then, lines);
        return;
    }
    const enc = ev?.kind === 'battle' ? data.encounters[ev.encounter] : undefined;
    if (enc) { s.gold += enc.gold; lines.push(`${enc.xp} XP, ${enc.gold} pièces.`); grantXp(s, enc.xp, lines); }
    const needsRecruit = ev?.kind === 'battle' && ev.tutorialRecruit === true;
    if (needsRecruit && b.recruited.length === 0) { lines.push('Le Moussin s\'est enfui : reviens l\'apaiser.'); return; }
    if (needsRecruit) achieve(s, data, 'recruit_mossling', lines);
    s.cleared.push(node);
}

export function step(input: GameState, data: GameData, a: GameAction): StepResult {
    if (a.type === 'move') {
        if (input.battle) return { state: input, lines: ['Impossible : un combat est en cours.'], events: [] };
        if (!exits(data.world, input.node, input.flags).includes(a.to)) return { state: input, lines: ['Passage fermé.'], events: [] };
        return enter(input, data, a.to, []);
    }
    if (a.type === 'battle') {
        if (!input.battle) return { state: input, lines: [], events: [] };
        const s = structuredClone(input);
        const b = s.battle as Battle;
        const bossDef = b.units.some(u => u.boss) ? data.boss.def : undefined;
        const rules: Rules = { ...data.rules, tutorialRecruit: !b.tutorialRecruitDone };
        const players = a.commands.filter(c => b.units.find(u => u.id === c.actorId)?.team === 'player');
        const r = resolveRound(b, [...players, ...enemyCommands(b, rules, bossDef)], rules);
        s.battle = r.battle;
        const lines: string[] = [];
        if (r.battle.outcome !== 'ongoing') endBattle(s, data, lines);
        return { state: s, lines, events: r.events };
    }
    if (!input.puzzle) return { state: input, lines: [], events: [] };
    const s = structuredClone(input);
    const p = s.puzzle as PuzzleState;
    if (a.type === 'reset_puzzle') s.puzzle = newPuzzle(p.kind);
    else if (a.type === 'push' && p.kind === 'blocks') s.puzzle = pushMove(p, a.dir);
    else if (a.type === 'press' && p.kind === 'switches') s.puzzle = press(p, a.index);
    const lines: string[] = [];
    const ev = data.nodes[s.node]?.event;
    if (s.puzzle && solved(s.puzzle) && ev?.kind === 'puzzle' && !s.cleared.includes(s.node)) {
        setFlag(s, ev.flag); s.cleared.push(s.node); achieve(s, data, ev.step, lines);
        lines.push('Énigme résolue : un passage s\'ouvre.');
    }
    return { state: s, lines, events: [] };
}
