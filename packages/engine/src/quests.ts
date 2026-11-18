// Quêtes à étapes ordonnées, idempotentes : un événement déjà appliqué ne fait rien, la récompense tombe une fois.
export interface QuestRewards { xp: number; items: string[] }
export interface QuestDef { id: string; steps: string[]; rewards: QuestRewards }
export interface QuestState { questId: string; done: string[]; seenEvents: string[]; status: 'active' | 'completed'; rewarded: boolean }
export interface QuestEvent { eventId: string; stepId: string }

export const startQuest = (def: QuestDef): QuestState =>
    ({ questId: def.id, done: [], seenEvents: [], status: 'active', rewarded: false });

export function applyQuestEvent(q: QuestState, def: QuestDef, ev: QuestEvent): { quest: QuestState; rewards: QuestRewards | null } {
    const expected = def.steps[q.done.length];
    if (q.status !== 'active' || q.seenEvents.includes(ev.eventId) || ev.stepId !== expected) return { quest: q, rewards: null };
    const done = [...q.done, ev.stepId];
    const completed = done.length === def.steps.length;
    const rewards = completed && !q.rewarded ? { xp: def.rewards.xp, items: [...def.rewards.items] } : null;
    return {
        quest: { ...q, done, seenEvents: [...q.seenEvents, ev.eventId], status: completed ? 'completed' : 'active', rewarded: q.rewarded || rewards !== null },
        rewards
    };
}
