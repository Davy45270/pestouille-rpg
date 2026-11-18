// Vue Phaser : redessine la scène à chaque état (exploration, combat, énigme). Aucune règle ici : la vue lit l'état.
import Phaser from 'phaser';
import type { GameData, GameState, Unit } from '@pestouille/engine';
import { exits } from '@pestouille/engine';
import { HEIGHT, paths, POSITIONS, REGION_COLORS, regionOf, WIDTH } from './layout';

const SPRITE: Record<string, string> = { mossling: 'mossling', flameling: 'flameling', dewdrop: 'dewdrop', gustling: 'gustling', roncier: 'roncier' };
const spriteFor = (u: Pick<Unit, 'id' | 'definitionId'>): string => (u.id.startsWith('rejeton') ? 'rejeton' : SPRITE[u.definitionId] ?? u.definitionId);
const LANDMARK: Record<string, string> = { 'village.place': 'eglantine' };

export class GameView extends Phaser.Scene {
    private ready: (() => void) | undefined;
    onNode: (node: string) => void = () => {};
    constructor(ready: () => void) { super('vue'); this.ready = ready; }
    preload(): void { this.load.atlas('atlas', 'assets/atlas.png', 'assets/atlas.json'); }
    create(): void {
        const names = new Set(this.textures.get('atlas').getFrameNames().map(f => f.split('#')[0] ?? f));
        for (const n of names) this.anims.create({ key: n, frames: [0, 1].map(i => ({ key: 'atlas', frame: `${n}#${i}` })), frameRate: 2, repeat: -1 });
        this.ready?.(); this.ready = undefined;
    }
    private sprite(name: string, x: number, y: number, scale = 2): Phaser.GameObjects.Sprite {
        const s = this.add.sprite(x, y, 'atlas', `${name}#0`).setScale(scale);
        if (this.anims.exists(name)) s.play(name);
        return s;
    }
    private label(x: number, y: number, text: string, size = 9, color = '#1d1a16'): void {
        this.add.text(x, y, text, { fontFamily: 'DejaVu Sans, sans-serif', fontSize: `${size}px`, color, align: 'center', resolution: 3 }).setOrigin(0.5, 0);
    }
    render(s: GameState, d: GameData): void {
        this.children.removeAll(true);
        if (s.battle) this.drawBattle(s, d);
        else if (s.puzzle) this.drawPuzzle(s);
        else this.drawWorld(s, d);
    }
    private drawWorld(s: GameState, d: GameData): void {
        const region = regionOf(s.node);
        const col = REGION_COLORS[region] ?? { ground: 0x777777, path: 0xaaaaaa, label: region };
        const g = this.add.graphics();
        g.fillStyle(col.ground).fillRect(0, 0, WIDTH, HEIGHT);
        g.lineStyle(10, col.path);
        for (const [a, b] of paths(d.world, region)) {
            const pa = POSITIONS[a], pb = POSITIONS[b];
            if (pa && pb) g.lineBetween(pa[0], pa[1], pb[0], pb[1]);
        }
        this.label(WIDTH / 2, 4, col.label, 11, '#ffffff');
        const open = new Set(exits(d.world, s.node, s.flags));
        for (const n of (d.world.regions[region] ?? []).map(x => `${region}.${x}`)) {
            const p = POSITIONS[n];
            if (!p) continue;
            const here = n === s.node, can = open.has(n);
            g.fillStyle(here ? 0xffe9a8 : can ? 0xfff7e0 : 0x8b8378).fillCircle(p[0], p[1], 13);
            g.lineStyle(2, d.world.checkpoints.includes(n) ? 0xf5b942 : 0x3b3229).strokeCircle(p[0], p[1], 13);
            if (can) this.add.zone(p[0], p[1], 34, 34).setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.onNode(n); });
            this.label(p[0], p[1] + 15, d.nodes[n]?.name ?? n, 10, '#ffffff');
            const lm = LANDMARK[n];
            if (lm && !here) this.sprite(lm, p[0], p[1] - 4, 1);
        }
        const p = POSITIONS[s.node];
        if (p) {
            s.party.forEach((m, i) => this.sprite(m.id, p[0] - 10 * (s.party.length - 1) / 2 + 10 * i, p[1] - 8, i === 0 ? 1.4 : 1));
        }
    }
    private drawBattle(s: GameState, d: GameData): void {
        const b = s.battle;
        if (!b) return;
        const g = this.add.graphics();
        const boss = b.units.some(u => u.boss);
        g.fillStyle(boss ? 0x3e3a48 : 0x5f9a4f).fillRect(0, 0, WIDTH, HEIGHT);
        g.fillStyle(boss ? 0x2b2833 : 0x4a7d3e).fillRect(0, 175, WIDTH, HEIGHT - 175);
        const place = (units: Unit[], x0: number, dir: number): void => {
            units.forEach((u, i) => {
                const x = x0 + dir * (i % 2) * 40, y = 70 + i * 42;
                const big = u.boss ? 4 : 2;
                const sp = this.sprite(spriteFor(u), x, u.boss ? 130 : y, big);
                if (u.hp <= 0) sp.setAlpha(0.25).stop();
                if (dir > 0 && !u.boss) sp.setFlipX(true);
                const bw = 40, by = (u.boss ? 130 : y) + (u.boss ? 66 : 22);
                g.fillStyle(0x1d1a16).fillRect(x - bw / 2, by, bw, 5);
                g.fillStyle(u.team === 'player' ? 0xf08a24 : 0xd94a3a).fillRect(x - bw / 2, by, Math.max(0, bw * u.hp / u.stats.hp), 5);
                this.label(x, by + 6, `${d.names[u.id] ?? d.names[u.definitionId] ?? u.id} ${u.hp}`, 8, '#ffffff');
            });
        };
        place(b.units.filter(u => u.team === 'player'), 120, -1);
        place(b.units.filter(u => u.team === 'enemy'), 340, 1);
        if (b.telegraph) this.label(WIDTH / 2, 8, '⚠ La tempête de ronces se prépare : défendez-vous !', 10, '#ffd34d');
    }
    private drawPuzzle(s: GameState): void {
        const p = s.puzzle;
        if (!p) return;
        const g = this.add.graphics();
        g.fillStyle(0x4c4957).fillRect(0, 0, WIDTH, HEIGHT);
        if (p.kind === 'blocks') {
            const t = 36, ox = WIDTH / 2 - (p.map[0]?.length ?? 0) * t / 2, oy = 40;
            p.map.forEach((row, y) => row.split('').forEach((c, x) => {
                g.fillStyle(c === '#' ? 0x2b2833 : 0x8d879c).fillRect(ox + x * t, oy + y * t, t - 1, t - 1);
            }));
            g.lineStyle(3, 0xf5b942).strokeRect(ox + p.plate[0] * t + 4, oy + p.plate[1] * t + 4, t - 9, t - 9);
            g.fillStyle(0x8a5a33).fillRect(ox + p.block[0] * t + 5, oy + p.block[1] * t + 5, t - 11, t - 11);
            this.sprite('pestouille', ox + p.player[0] * t + t / 2, oy + p.player[1] * t + t / 2, 1);
            this.label(WIDTH / 2, 12, 'Pousse le bloc sur la dalle dorée', 11, '#ffffff');
        } else {
            p.on.forEach((on, i) => {
                const x = 120 + i * 80;
                g.fillStyle(0x2b2833).fillRect(x - 6, 150, 12, 60);
                g.fillStyle(on ? 0xffd34d : 0x5b5866).fillCircle(x, 140, 20);
                this.label(x, 215, String(i + 1), 12, '#ffffff');
            });
            this.label(WIDTH / 2, 30, 'Allume les quatre lanternes', 11, '#ffffff');
        }
    }
}
