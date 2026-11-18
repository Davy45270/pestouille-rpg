// Traduit les événements de combat du moteur en phrases du journal.
import type { BattleEvent, GameData } from '@pestouille/engine';

export function narrate(events: readonly BattleEvent[], d: GameData): string[] {
    const n = (id?: string): string => (id === undefined ? '?' : d.names[id] ?? d.names[id.replace(/-\d+$/, '')] ?? d.names[id.replace(/#\d+$/, '')] ?? id);
    const out: string[] = [];
    for (const e of events) {
        switch (e.type) {
            case 'damage': out.push(`${n(e.actorId)} inflige ${e.amount ?? 0} à ${n(e.targetId)}.`); break;
            case 'heal': out.push(`${n(e.actorId)} soigne ${n(e.targetId)} de ${e.amount ?? 0} PV.`); break;
            case 'ko': out.push(`${n(e.targetId)} est hors de combat.`); break;
            case 'telegraph': out.push(`${n(e.actorId)} prépare ${n(e.reason)} !`); break;
            case 'summon': out.push(`${n(e.actorId)} fait pousser un rejeton !`); break;
            case 'boss_phase': out.push(`${n(e.actorId)} change de forme (phase ${e.reason ?? '?'}) !`); break;
            case 'recruited': out.push(`${n(e.targetId)} est apaisé.`); break;
            case 'soothe_failed': out.push(`${n(e.targetId)} ne se laisse pas apaiser.`); break;
            case 'flee_failed': out.push('La fuite échoue !'); break;
            case 'rejected': out.push(`${n(e.actorId)} ne peut pas faire ça (${e.reason ?? ''}).`); break;
            default: break;
        }
    }
    return out;
}
