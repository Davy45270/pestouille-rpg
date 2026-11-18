// Panneau HTML sous la scène : HUD, journal, boutons d'action. Des boutons natifs : clavier, tactile et lecteur
// d'écran fonctionnent sans code dédié (T21). Les attributs data-* servent aussi aux tests de bout en bout.
import { exits, maxStats, type Command, type GameAction, type GameData, type GameState, type Unit } from '@pestouille/engine';
import atlas from '../public/assets/atlas.json';

type Pick = { kind: 'attack' } | { kind: 'soothe' } | { kind: 'skill'; skillId: string } | { kind: 'item'; itemId: string } | { kind: 'menu'; menu: 'skill' | 'item' };
export interface BattleDraft { chosen: Command[]; pick: Pick | null }

const frames = atlas.frames as Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
export function icon(name: string, label: string): HTMLElement {
    const f = frames[`${name}#0`]?.frame;
    const el = document.createElement('span');
    el.className = 'icone';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', label);
    if (f) el.style.cssText = `width:${f.w}px;height:${f.h}px;background-image:url(${import.meta.env.BASE_URL}assets/atlas.png);background-position:-${f.x}px -${f.y}px`;
    return el;
}
function button(text: string, onClick: () => void, attrs: Record<string, string> = {}): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    for (const [k, v] of Object.entries(attrs)) b.setAttribute(k, v);
    b.addEventListener('click', onClick);
    return b;
}

export class Panel {
    draft: BattleDraft = { chosen: [], pick: null };
    constructor(private readonly root: HTMLElement, private readonly act: (a: GameAction) => void, private readonly reset: () => void) {}

    log(lines: readonly string[]): void {
        const j = this.root.querySelector('#journal');
        if (!j) return;
        for (const l of lines) { const p = document.createElement('p'); p.textContent = l; j.append(p); }
        while (j.childElementCount > 40) j.firstElementChild?.remove();
        j.scrollTop = j.scrollHeight;
    }

    render(s: GameState, d: GameData): void {
        document.body.dataset.mode = s.battle ? 'combat' : s.puzzle ? 'enigme' : s.finished ? 'fin' : 'exploration';
        document.body.dataset.node = s.node;
        this.hud(s, d);
        const a = this.root.querySelector('#actions');
        if (!a) return;
        a.replaceChildren();
        if (s.battle) this.battle(a, s, d);
        else {
            if (s.puzzle) this.puzzle(a, s);
            const title = document.createElement('h2');
            title.textContent = 'Aller vers';
            a.append(title);
            const row = document.createElement('div');
            row.className = 'rangee';
            for (const n of exits(d.world, s.node, s.flags)) row.append(button(d.nodes[n]?.name ?? n, () => { this.act({ type: 'move', to: n }); }, { 'data-go': n }));
            a.append(row);
            const other = document.createElement('div');
            other.className = 'rangee discret';
            other.append(button('Nouvelle partie', () => { if (confirm('Recommencer depuis le début ?')) this.reset(); }, { 'data-cmd': 'reset' }));
            a.append(other);
        }
    }

    private hud(s: GameState, d: GameData): void {
        const h = this.root.querySelector('#hud');
        if (!h) return;
        h.replaceChildren();
        for (const m of s.party) {
            const max = maxStats(d, m);
            const card = document.createElement('div');
            card.className = 'membre';
            card.dataset.membre = m.id;
            const name = document.createElement('strong');
            name.textContent = `${m.name} niv. ${m.level}`;
            const flames = document.createElement('span');
            flames.className = 'pv';
            const n = Math.ceil(5 * m.hp / Math.max(1, max.hp));
            for (let i = 0; i < 5; i++) { const f = icon('icon_pv', ''); if (i >= n) f.classList.add('eteinte'); f.setAttribute('aria-hidden', 'true'); flames.append(f); }
            const txt = document.createElement('span');
            txt.textContent = `PV ${m.hp}/${max.hp} · PM ${m.mp}/${max.mp}`;
            card.append(name, flames, txt);
            h.append(card);
        }
        const purse = document.createElement('div');
        purse.className = 'bourse';
        purse.append(icon('icon_cristal', 'cristaux de luciole'), document.createTextNode(` ${s.gold}`));
        const herbs = s.inventory.healing_herb ?? 0;
        purse.append(icon('icon_herbe', 'herbes soignantes'), document.createTextNode(` ${herbs}`));
        if (s.inventory.root_key) purse.append(icon('icon_cle', 'clé de racine'));
        if (s.inventory.first_flame) purse.append(icon('icon_flamme', 'première flamme'));
        if (s.reserve.length > 0) purse.append(document.createTextNode(` · Réserve : ${s.reserve.map(r => r.name).join(', ')}`));
        h.append(purse);
    }

    private puzzle(a: Element, s: GameState): void {
        const p = s.puzzle;
        if (!p) return;
        const row = document.createElement('div');
        row.className = 'rangee';
        if (p.kind === 'blocks') {
            for (const [dir, t] of [['up', '↑ Haut'], ['left', '← Gauche'], ['down', '↓ Bas'], ['right', '→ Droite']] as const) {
                row.append(button(t, () => { this.act({ type: 'push', dir }); }, { 'data-dir': dir }));
            }
        } else {
            p.on.forEach((on, i) => row.append(button(`Lanterne ${i + 1}${on ? ' (allumée)' : ''}`, () => { this.act({ type: 'press', index: i }); }, { 'data-lanterne': String(i) })));
        }
        row.append(button('Recommencer', () => { this.act({ type: 'reset_puzzle' }); }, { 'data-cmd': 'reset_puzzle' }));
        a.append(row);
    }

    private battle(a: Element, s: GameState, d: GameData): void {
        const b = s.battle;
        if (!b) return;
        const list = document.createElement('ul');
        list.id = 'combattants';
        list.className = 'combattants';
        for (const u of b.units.filter(x => x.hp > 0)) {
            const li = document.createElement('li');
            Object.assign(li.dataset, { unit: u.id, team: u.team, hp: String(u.hp), max: String(u.stats.hp), recruitable: String(u.recruitable), def: u.definitionId });
            li.textContent = `${u.team === 'player' ? '' : 'Ennemi : '}${d.names[u.id] ?? d.names[u.definitionId] ?? u.id} — PV ${u.hp}/${u.stats.hp}`;
            list.append(li);
        }
        a.append(list);
        const heroes = b.units.filter(u => u.team === 'player' && u.hp > 0);
        const hero = heroes[this.draft.chosen.length];
        if (!hero) { this.draft = { chosen: [], pick: null }; return; }
        const title = document.createElement('h2');
        title.textContent = `${d.names[hero.id] ?? hero.id} : que faire ?`;
        title.dataset.hero = hero.id;
        a.append(title);
        if (b.telegraph) { const w = document.createElement('p'); w.className = 'alerte'; w.textContent = 'Le Roncier prépare sa tempête de ronces : se défendre réduit les dégâts de moitié.'; a.append(w); }
        const row = document.createElement('div');
        row.className = 'rangee';
        const choose = (c: Command): void => {
            this.draft.chosen.push(c); this.draft.pick = null;
            if (this.draft.chosen.length >= heroes.length) { const cmds = this.draft.chosen; this.draft = { chosen: [], pick: null }; this.act({ type: 'battle', commands: cmds }); }
            else this.render(s, d);
        };
        const pick = this.draft.pick;
        const targets = (team: 'player' | 'enemy', make: (t: Unit) => Command): void => {
            for (const t of b.units.filter(u => u.team === team && u.hp > 0)) row.append(button(d.names[t.id] ?? d.names[t.definitionId] ?? t.id, () => { choose(make(t)); }, { 'data-target': t.id }));
        };
        if (!pick) {
            const skills = (d.heroes[hero.id]?.skills ?? []).filter(k => k !== 'basic_attack');
            row.append(button('Attaquer', () => { this.draft.pick = { kind: 'attack' }; this.render(s, d); }, { 'data-cmd': 'attack' }));
            if (skills.length > 0) row.append(button('Compétences', () => { this.draft.pick = { kind: 'menu', menu: 'skill' }; this.render(s, d); }, { 'data-cmd': 'skills' }));
            if ((b.inventory.healing_herb ?? 0) > 0) row.append(button(`Objets (${b.inventory.healing_herb ?? 0})`, () => { this.draft.pick = { kind: 'menu', menu: 'item' }; this.render(s, d); }, { 'data-cmd': 'items' }));
            row.append(button('Défendre', () => { choose({ type: 'defend', actorId: hero.id }); }, { 'data-cmd': 'defend' }));
            if (hero.id === 'pestouille' && b.units.some(u => u.team === 'enemy' && u.recruitable && u.hp > 0)) {
                row.append(button('Apaiser', () => { this.draft.pick = { kind: 'soothe' }; this.render(s, d); }, { 'data-cmd': 'soothe' }));
            }
            if (!b.units.some(u => u.boss)) row.append(button('Fuir', () => { choose({ type: 'flee', actorId: hero.id }); }, { 'data-cmd': 'flee' }));
        } else if (pick.kind === 'menu' && pick.menu === 'skill') {
            for (const k of (d.heroes[hero.id]?.skills ?? []).filter(x => x !== 'basic_attack')) {
                const def = d.rules.skills[k];
                if (!def) continue;
                const btn = button(`${d.names[k] ?? k} (${def.mpCost} PM)`, () => { this.draft.pick = { kind: 'skill', skillId: k }; this.render(s, d); }, { 'data-skill': k });
                btn.disabled = hero.mp < def.mpCost;
                row.append(btn);
            }
        } else if (pick.kind === 'menu') {
            row.append(button(`${d.names.healing_herb ?? 'Herbe'} (+${d.rules.items.healing_herb?.heal ?? 0} PV)`, () => { this.draft.pick = { kind: 'item', itemId: 'healing_herb' }; this.render(s, d); }, { 'data-item': 'healing_herb' }));
        } else if (pick.kind === 'attack') targets('enemy', t => ({ type: 'attack', actorId: hero.id, targetId: t.id }));
        else if (pick.kind === 'soothe') targets('enemy', t => ({ type: 'soothe', actorId: hero.id, targetId: t.id }));
        else if (pick.kind === 'item') targets('player', t => ({ type: 'item', actorId: hero.id, itemId: pick.itemId, targetId: t.id }));
        else {
            const def = d.rules.skills[pick.skillId];
            targets(def?.target === 'ally' ? 'player' : 'enemy', t => ({ type: 'skill', actorId: hero.id, skillId: pick.skillId, targetId: t.id }));
        }
        if (pick) row.append(button('Retour', () => { this.draft.pick = null; this.render(s, d); }, { 'data-cmd': 'back' }));
        a.append(row);
    }
}
