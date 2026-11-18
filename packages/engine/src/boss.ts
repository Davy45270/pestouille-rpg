// Phases de boss du slice (Roncier) : à compléter (tâche 5).
import type { BossPhase, Element, Unit } from './types.ts';
export function bossPhaseFor(_hp: number, _maxHp: number, previous: BossPhase | null): BossPhase { return previous ?? 'A'; }
/** Multiplicateur en pourcents appliqué aux dégâts reçus par `target`. */
export function phaseMultiplier(_target: Unit, _phase: BossPhase | null, _element: Element): number { return 100; }
