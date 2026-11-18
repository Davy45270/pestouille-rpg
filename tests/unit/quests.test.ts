import { describe, expect, it } from 'vitest';
import { applyQuestEvent, startQuest, stateHash, type QuestDef, type QuestState } from '@pestouille/engine';
import firstFlame from '../../content/quests/first_flame.json';

const def: QuestDef = firstFlame;

const playAll = (q: QuestState) => def.steps.reduce<{ quest: QuestState; rewards: unknown[] }>((acc, stepId, i) => {
    const r = applyQuestEvent(acc.quest, def, { eventId: `e${i}`, stepId });
    return { quest: r.quest, rewards: r.rewards ? [...acc.rewards, r.rewards] : acc.rewards };
}, { quest: q, rewards: [] });

describe('quête de la première flamme', () => {
    it('neuf étapes dans l\'ordre : terminée, récompense versée une fois (T20)', () => {
        const { quest, rewards } = playAll(startQuest(def));
        expect(quest.status).toBe('completed');
        expect(rewards).toEqual([{ xp: 180, items: ['first_flame'] }]);
    });
    it('T10 événement rejoué : ni avance ni récompense', () => {
        const { quest } = playAll(startQuest(def));
        const again = applyQuestEvent(quest, def, { eventId: 'e8', stepId: 'claim_first_flame' });
        expect(again.rewards).toBeNull();
        expect(stateHash(again.quest)).toBe(stateHash(quest));
        const fresh = applyQuestEvent(quest, def, { eventId: 'nouveau', stepId: 'claim_first_flame' });
        expect(fresh.rewards).toBeNull();
    });
    it('étape hors ordre : ignorée, l\'identifiant d\'événement reste utilisable', () => {
        const q = startQuest(def);
        const r = applyQuestEvent(q, def, { eventId: 'x', stepId: 'defeat_roncier' });
        expect(r.quest.done).toEqual([]);
        expect(applyQuestEvent(r.quest, def, { eventId: 'x', stepId: 'meet_lila' }).quest.done).toEqual(['meet_lila']);
    });
    it('l\'argument n\'est pas modifié', () => {
        const q = startQuest(def);
        const before = stateHash(q);
        applyQuestEvent(q, def, { eventId: 'a', stepId: 'meet_lila' });
        expect(stateHash(q)).toBe(before);
    });
});
