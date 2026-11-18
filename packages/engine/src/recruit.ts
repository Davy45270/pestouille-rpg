// Recrutement (« Apaiser ») : à compléter (tâche 4).
import type { Battle, BattleEvent, Rules, Unit } from './types.ts';
export function trySoothe(_b: Battle, actor: Unit, _targetId: string, _rules: Rules, events: BattleEvent[]): void {
    events.push({ type: 'rejected', actorId: actor.id, reason: 'not_implemented' });
}
