// Validation du contenu : schémas JSON (ajv, brouillon 2020-12, propriétés inconnues refusées) puis références croisées.
import { Ajv2020 } from 'ajv/dist/2020.js';
import creature from './schemas/creature.schema.json' with { type: 'json' };
import skill from './schemas/skill.schema.json' with { type: 'json' };
import item from './schemas/item.schema.json' with { type: 'json' };
import job from './schemas/job.schema.json' with { type: 'json' };
import encounter from './schemas/encounter.schema.json' with { type: 'json' };
import quest from './schemas/quest.schema.json' with { type: 'json' };
import boss from './schemas/boss.schema.json' with { type: 'json' };

export interface ContentBundle {
    creatures: unknown[]; skills: unknown[]; items: unknown[]; jobs: unknown[];
    encounters: unknown[]; quests: unknown[]; bosses: unknown[];
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validators = {
    creatures: ajv.compile(creature), skills: ajv.compile(skill), items: ajv.compile(item), jobs: ajv.compile(job),
    encounters: ajv.compile(encounter), quests: ajv.compile(quest), bosses: ajv.compile(boss)
};

type Rec = Record<string, unknown>;
const idOf = (x: unknown): string => (typeof x === 'object' && x !== null && typeof (x as Rec).id === 'string' ? (x as Rec).id as string : '?');
const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : []);
const records = (x: unknown): Rec[] => (Array.isArray(x) ? x.filter((v): v is Rec => typeof v === 'object' && v !== null) : []);
const field = (x: unknown, key: string): unknown => (typeof x === 'object' && x !== null ? (x as Rec)[key] : undefined);

export function validateContent(bundle: ContentBundle): string[] {
    const errors: string[] = [];
    for (const kind of Object.keys(validators) as (keyof ContentBundle)[]) {
        const seen = new Set<string>();
        for (const entry of bundle[kind]) {
            const id = idOf(entry);
            if (seen.has(id)) errors.push(`${kind}/${id}: identifiant en double`);
            seen.add(id);
            const check = validators[kind];
            if (!check(entry)) for (const e of check.errors ?? []) errors.push(`${kind}/${id}: ${e.instancePath || '/'} ${e.message ?? ''}`.trim());
        }
    }
    const ids = (kind: keyof ContentBundle): Set<string> => new Set(bundle[kind].map(idOf));
    const creatures = ids('creatures'), skills = ids('skills'), items = ids('items');
    for (const c of bundle.creatures) for (const ev of records(field(c, 'evolutions'))) {
        const target = String(ev.targetId);
        if (!creatures.has(target)) errors.push(`creatures/${idOf(c)}: évolution vers ${target} inconnue`);
    }
    for (const e of bundle.encounters) for (const en of records(field(e, 'enemies'))) {
        const target = String(en.creatureId);
        if (!creatures.has(target)) errors.push(`encounters/${idOf(e)}: créature inconnue ${target}`);
    }
    for (const j of bundle.jobs) for (const s of strings(field(j, 'skills'))) if (!skills.has(s)) errors.push(`jobs/${idOf(j)}: compétence inconnue ${s}`);
    for (const kind of ['quests', 'bosses'] as const) for (const q of bundle[kind]) {
        for (const it of strings(field(field(q, 'rewards'), 'items'))) if (!items.has(it)) errors.push(`${kind}/${idOf(q)}: objet inconnu ${it}`);
    }
    for (const b of bundle.bosses) for (const ph of records(field(b, 'phases'))) {
        for (const s of strings(ph.skills)) if (!skills.has(s)) errors.push(`bosses/${idOf(b)}: compétence inconnue ${s}`);
    }
    return errors;
}
