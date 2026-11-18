// Bot de test : joue la tranche verticale de bout en bout avec une stratégie simple et déterministe.
import { buildGameData, type Scene } from '@pestouille/content';
import { exits, maxStats, newGame, step, type Command, type Dir, type GameAction, type GameData, type GameState } from '@pestouille/engine';
import scene from '../../content/scenes/first_flame.json';
import world from '../../content/world/first_flame.json';
import { loadContent } from '../../scripts/load-content';

export const data: GameData = buildGameData(loadContent('content'), scene as unknown as Scene, world);

const ROUTE = ['village.inn', 'village.place', 'village.forge', 'village.place', 'village.home', 'village.place', 'village.forest_gate',
    'forest.entry', 'forest.glade', 'forest.spring', 'forest.camp', 'forest.temple_gate', 'temple.hall', 'temple.blocks',
    'temple.switches', 'temple.key', 'temple.antechamber', 'temple.boss'];
const BLOCKS: Dir[] = ['down', 'right', 'up', 'right', 'down'];

export function partyCommands(s: GameState, d: GameData): Command[] {
    const b = s.battle;
    if (!b) return [];
    const foes = b.units.filter(u => u.team === 'enemy' && u.hp > 0).sort((x, y) => x.hp - y.hp || (x.id < y.id ? -1 : 1));
    const players = b.units.filter(u => u.team === 'player' && u.hp > 0);
    const wounded = [...players].sort((x, y) => x.hp / x.stats.hp - y.hp / y.stats.hp)[0];
    const keep = b.tutorialRecruitDone ? undefined : (foes.find(f => f.definitionId === 'mossling') ?? foes.find(f => f.recruitable));
    const others = foes.filter(f => f !== keep);
    return players.map((p): Command => {
        if (p.id === 'lila' && wounded && wounded.hp * 100 < 50 * wounded.stats.hp && p.mp >= 4) return { type: 'skill', actorId: p.id, skillId: 'heal', targetId: wounded.id };
        const target = others[0];
        if (!target && keep) {
            if (keep.hp * 100 <= 30 * keep.stats.hp) return p.id === 'pestouille' ? { type: 'soothe', actorId: p.id, targetId: keep.id } : { type: 'defend', actorId: p.id };
            return p.id === 'nox' || (p.id === 'pestouille' && !players.some(x => x.id === 'nox')) ? { type: 'attack', actorId: p.id, targetId: keep.id } : { type: 'defend', actorId: p.id };
        }
        if (!target) return { type: 'defend', actorId: p.id };
        if (p.id === 'pestouille' && p.mp >= (d.rules.skills.fire_breath?.mpCost ?? 99)) return { type: 'skill', actorId: p.id, skillId: 'fire_breath', targetId: target.id };
        return { type: 'attack', actorId: p.id, targetId: target.id };
    });
}

export function playSlice(seed: string, d: GameData = data): { state: GameState; log: string[]; actions: GameAction[] } {
    let s = newGame(d, seed);
    const log: string[] = [], actions: GameAction[] = [];
    const run = (a: GameAction): void => { const r = step(s, d, a); s = r.state; actions.push(a); log.push(...r.lines); };
    for (const to of ROUTE) {
        if (!exits(d.world, s.node, s.flags).includes(to)) throw new Error(`bloqué en ${s.node} vers ${to} ; drapeaux ${s.flags.join(',')}`);
        run({ type: 'move', to });
        for (let i = 0; s.battle && i < 60; i++) run({ type: 'battle', commands: partyCommands(s, d) });
        if (s.node !== to) throw new Error(`défaite en ${to} (retour ${s.node})`);
        if (s.puzzle?.kind === 'blocks') for (const dir of BLOCKS) run({ type: 'push', dir });
        if (s.puzzle?.kind === 'switches') { run({ type: 'press', index: 0 }); run({ type: 'press', index: 3 }); }
        if (to === 'forest.entry' && !s.cleared.includes(to)) throw new Error('recrutement du tutoriel manqué');
    }
    for (const m of s.party) if (m.hp > maxStats(d, m).hp) throw new Error(`PV au-delà du max : ${m.id}`);
    return { state: s, log, actions };
}
