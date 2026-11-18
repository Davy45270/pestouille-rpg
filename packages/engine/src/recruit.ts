// Recrutement (« Apaiser ») du slice : PV <= 30 %, 35 % + affinité plafonné à 90 %, un tirage par tentative valide.
import { rollPercent } from './rng.ts';
import type { Battle, BattleEvent, Rules, Unit } from './types.ts';

export type SootheCheck = { ok: true } | { ok: false; reason: 'boss' | 'not_recruitable' | 'too_healthy' | 'ko' };

export function canSoothe(target: Unit): SootheCheck {
    if (target.boss) return { ok: false, reason: 'boss' };
    if (!target.recruitable) return { ok: false, reason: 'not_recruitable' };
    if (target.hp <= 0) return { ok: false, reason: 'ko' };
    if (target.hp * 100 > 30 * target.stats.hp) return { ok: false, reason: 'too_healthy' };
    return { ok: true };
}

export const sootheChance = (target: Unit): number => Math.min(90, Math.max(0, 35 + target.affinity));

/** Applique une tentative sur `b` (copie de travail de resolveRound). */
export function trySoothe(b: Battle, actor: Unit, targetId: string, rules: Rules, events: BattleEvent[]): void {
    const target = b.units.find(u => u.id === targetId);
    if (!target || target.hp <= 0) { events.push({ type: 'cancelled', actorId: actor.id }); return; }
    if (target.team !== 'enemy') { events.push({ type: 'rejected', actorId: actor.id, reason: 'not_enemy' }); return; }
    const check = canSoothe(target);
    if (!check.ok) { events.push({ type: 'rejected', actorId: actor.id, reason: check.reason }); return; }
    const [roll, rng] = rollPercent(b.rng);
    b.rng = rng;
    const tutorial = rules.tutorialRecruit === true && !b.tutorialRecruitDone;
    if (!tutorial && roll >= sootheChance(target)) { events.push({ type: 'soothe_failed', actorId: actor.id, targetId }); return; }
    if (tutorial) b.tutorialRecruitDone = true;
    b.recruitCount += 1;
    b.units = b.units.filter(u => u.id !== targetId);
    b.recruited.push({ ...target, id: `${target.definitionId}#${b.recruitCount}`, team: 'player' });
    events.push({ type: 'soothed', actorId: actor.id, targetId });
}
