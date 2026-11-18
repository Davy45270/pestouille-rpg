// Phases de boss du slice (Roncier) : A > 65 % des PV, B > 30 %, C sinon ; une phase ne redescend jamais.
import type { BossPhase, Element, Unit } from './types.ts';

const rank: Record<BossPhase, number> = { A: 0, B: 1, C: 2 };

export function bossPhaseFor(hp: number, maxHp: number, previous: BossPhase | null): BossPhase {
    const raw: BossPhase = hp * 100 > 65 * maxHp ? 'A' : hp * 100 > 30 * maxHp ? 'B' : 'C';
    return previous !== null && rank[previous] > rank[raw] ? previous : raw;
}

/** Multiplicateur en pourcents appliqué aux dégâts reçus par `target` : B résiste au physique (50), C craint le feu (150). */
export function phaseMultiplier(target: Unit, phase: BossPhase | null, element: Element): number {
    if (!target.boss || phase === null) return 100;
    if (phase === 'B' && element === 'neutral') return 50;
    if (phase === 'C' && element === 'fire') return 150;
    return 100;
}
