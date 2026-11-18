// Combat au tour par tour du slice : réducteur pur resolveRound(battle, commandes, règles).
import { rollPercent, seedRng } from './rng.ts';
import type { Battle, BattleEvent, Command, Rules, Unit } from './types.ts';
import { bossPhaseFor, phaseMultiplier } from './boss.ts';
import { trySoothe } from './recruit.ts';

export function physicalDamage(attack: number, defense: number, power: number): number {
    return Math.max(1, Math.floor((attack - Math.floor(defense / 2)) * power / 100));
}

export interface NewBattle { seed: string; units: Unit[]; inventory?: Record<string, number>; tutorialRecruitDone?: boolean }

function initialPhase(units: Unit[]): Battle['bossPhase'] {
    const boss = units.find(u => u.boss && u.team === 'enemy');
    return boss ? bossPhaseFor(boss.hp, boss.stats.hp, null) : null;
}

export function createBattle(init: NewBattle): Battle {
    return {
        round: 1, rng: seedRng(init.seed), units: structuredClone(init.units), inventory: { ...init.inventory },
        outcome: 'ongoing', defending: [], tutorialRecruitDone: init.tutorialRecruitDone ?? false,
        recruited: [], recruitCount: 0, bossPhase: initialPhase(init.units), summonCount: 0, telegraph: null
    };
}

const alive = (u: Unit | undefined): u is Unit => u !== undefined && u.hp > 0;
const clamp = (lo: number, hi: number, v: number): number => Math.min(hi, Math.max(lo, v));
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

function outcomeOf(b: Battle): Battle['outcome'] {
    if (!b.units.some(u => u.team === 'enemy' && u.hp > 0)) return 'victory';
    if (!b.units.some(u => u.team === 'player' && u.hp > 0)) return 'defeat';
    return 'ongoing';
}

/** Inflige des dégâts déjà calculés (avant défense) ; rend le montant réel. */
function hit(b: Battle, target: Unit, raw: number, events: BattleEvent[], actorId: string): void {
    const amount = Math.max(1, b.defending.includes(target.id) ? Math.floor(raw / 2) : raw);
    target.hp = Math.max(0, target.hp - amount);
    events.push({ type: 'damage', actorId, targetId: target.id, amount });
    if (target.hp === 0) events.push({ type: 'ko', targetId: target.id });
    if (target.boss && b.bossPhase !== null) {
        const next = bossPhaseFor(target.hp, target.stats.hp, b.bossPhase);
        if (next !== b.bossPhase) { b.bossPhase = next; events.push({ type: 'boss_phase', targetId: target.id, reason: next }); }
    }
}

function heal(target: Unit, amount: number, events: BattleEvent[], actorId: string): void {
    const before = target.hp;
    target.hp = Math.min(target.stats.hp, target.hp + amount);
    events.push({ type: 'heal', actorId, targetId: target.id, amount: target.hp - before });
}

function act(b: Battle, cmd: Command, rules: Rules, events: BattleEvent[]): void {
    const actor = b.units.find(u => u.id === cmd.actorId);
    if (!alive(actor)) { events.push({ type: 'skipped', actorId: cmd.actorId }); return; }
    const target = 'targetId' in cmd ? b.units.find(u => u.id === cmd.targetId) : undefined;
    const cancel = (): void => { events.push({ type: 'cancelled', actorId: actor.id }); };
    const reject = (reason: string): void => { events.push({ type: 'rejected', actorId: actor.id, reason }); };
    switch (cmd.type) {
        case 'defend': return;
        case 'attack': {
            if (!alive(target)) return cancel();
            const raw = physicalDamage(actor.stats.attack, target.stats.defense, 100);
            return hit(b, target, Math.floor(raw * phaseMultiplier(target, b.bossPhase, 'neutral') / 100), events, actor.id);
        }
        case 'telegraph':
            b.telegraph = { actorId: actor.id, skillId: cmd.skillId };
            events.push({ type: 'telegraph', actorId: actor.id, reason: cmd.skillId });
            return;
        case 'skill': {
            const skill = rules.skills[cmd.skillId];
            if (!skill) return reject('unknown_skill');
            if (actor.mp < skill.mpCost) return reject('no_mp');
            if (skill.target === 'all_enemies') {
                actor.mp -= skill.mpCost;
                if (b.telegraph?.actorId === actor.id) b.telegraph = null;
                for (const t of b.units.filter(u => u.team !== actor.team && u.hp > 0)) {
                    hit(b, t, physicalDamage(actor.stats.magic, t.stats.resistance, skill.power), events, actor.id);
                }
                return;
            }
            if (!alive(target)) return cancel();
            actor.mp -= skill.mpCost;
            if (skill.kind === 'summon') {
                const template = rules.summons?.[skill.id];
                if (!template) return reject('unknown_summon');
                b.summonCount += 1;
                const id = `${template.id}#${b.summonCount}`;
                b.units.push({ ...structuredClone(template), id, team: actor.team });
                events.push({ type: 'summon', actorId: actor.id, targetId: id });
                return;
            }
            if (skill.kind === 'heal') return heal(target, skill.power, events, actor.id);
            const raw = skill.element === 'neutral'
                ? physicalDamage(actor.stats.attack, target.stats.defense, skill.power)
                : physicalDamage(actor.stats.magic, target.stats.resistance, skill.power);
            return hit(b, target, Math.floor(raw * phaseMultiplier(target, b.bossPhase, skill.element) / 100), events, actor.id);
        }
        case 'item': {
            const item = rules.items[cmd.itemId];
            if (!item || (b.inventory[cmd.itemId] ?? 0) <= 0) return reject('no_item');
            if (!alive(target)) return cancel();
            b.inventory[cmd.itemId] = (b.inventory[cmd.itemId] ?? 0) - 1;
            return heal(target, item.heal, events, actor.id);
        }
        case 'flee': {
            if (b.units.some(u => u.team === 'enemy' && u.boss && u.hp > 0)) return reject('boss');
            const speed = (team: Unit['team']): number => mean(b.units.filter(u => u.team === team && u.hp > 0).map(u => u.stats.speed));
            const chance = clamp(20, 95, Math.round(50 + (speed('player') - speed('enemy')) * 2));
            const [roll, rng] = rollPercent(b.rng);
            b.rng = rng;
            if (roll < chance) { b.outcome = 'escaped'; events.push({ type: 'fled', actorId: actor.id }); }
            else events.push({ type: 'flee_failed', actorId: actor.id });
            return;
        }
        case 'soothe': return trySoothe(b, actor, cmd.targetId, rules, events);
    }
}

export function resolveRound(input: Battle, commands: readonly Command[], rules: Rules): { battle: Battle; events: BattleEvent[] } {
    if (input.outcome !== 'ongoing') return { battle: input, events: [{ type: 'rejected', reason: 'battle_over' }] };
    const b = structuredClone(input);
    const events: BattleEvent[] = [];
    const seen = new Set<string>();
    const accepted: Command[] = [];
    for (const cmd of commands) {
        if (seen.has(cmd.actorId)) { events.push({ type: 'rejected', actorId: cmd.actorId, reason: 'duplicate_actor' }); continue; }
        if (!b.units.some(u => u.id === cmd.actorId)) { events.push({ type: 'rejected', actorId: cmd.actorId, reason: 'unknown_actor' }); continue; }
        seen.add(cmd.actorId);
        accepted.push(cmd);
    }
    b.defending = accepted.filter(c => c.type === 'defend' && alive(b.units.find(u => u.id === c.actorId))).map(c => c.actorId).sort();
    for (const id of b.defending) events.push({ type: 'defend', actorId: id });
    const speedOf = (id: string): number => b.units.find(u => u.id === id)?.stats.speed ?? 0;
    const order = accepted.filter(c => c.type !== 'defend')
        .sort((x, y) => speedOf(y.actorId) - speedOf(x.actorId) || (x.actorId < y.actorId ? -1 : x.actorId > y.actorId ? 1 : 0));
    for (const cmd of order) {
        act(b, cmd, rules, events);
        if (b.outcome === 'ongoing') b.outcome = outcomeOf(b);
        if (b.outcome !== 'ongoing') { events.push({ type: b.outcome }); break; }
    }
    b.defending = [];
    b.round += 1;
    return { battle: b, events };
}
