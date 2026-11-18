// IA ennemie déterministe : un ennemi ordinaire frappe le joueur vivant le plus faible ; un boss suit sa phase.
import type { Battle, Command, Rules, Unit } from './types.ts';

export interface BossDef { phases: { A: string[]; B: string[]; C: string[] } }

const weakest = (players: Unit[]): Unit | undefined =>
    [...players].sort((x, y) => x.hp - y.hp || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))[0];

function bossCommand(b: Battle, boss: Unit, def: BossDef, rules: Rules, target: Unit): Command {
    const phase = b.bossPhase ?? 'A';
    const skills = def.phases[phase];
    const strike = skills.find(s => rules.skills[s]?.kind === 'damage' && rules.skills[s].target === 'enemy') ?? 'thorn_strike';
    const zone = skills.find(s => rules.skills[s]?.target === 'all_enemies');
    const summon = skills.find(s => rules.skills[s]?.kind === 'summon');
    if (b.telegraph?.actorId === boss.id) return { type: 'skill', actorId: boss.id, skillId: b.telegraph.skillId, targetId: target.id };
    if (zone !== undefined) return { type: 'telegraph', actorId: boss.id, skillId: zone };
    const template = summon !== undefined ? rules.summons?.[summon] : undefined;
    if (summon !== undefined && template && !b.units.some(u => u.hp > 0 && u.id.startsWith(`${template.id}#`))) {
        return { type: 'skill', actorId: boss.id, skillId: summon, targetId: boss.id };
    }
    return { type: 'skill', actorId: boss.id, skillId: strike, targetId: target.id };
}

export function enemyCommands(b: Battle, rules: Rules, boss?: BossDef): Command[] {
    const players = b.units.filter(u => u.team === 'player' && u.hp > 0);
    const target = weakest(players);
    if (!target) return [];
    return b.units.filter(u => u.team === 'enemy' && u.hp > 0).map((e): Command =>
        e.boss && boss ? bossCommand(b, e, boss, rules, target) : { type: 'attack', actorId: e.id, targetId: target.id });
}
