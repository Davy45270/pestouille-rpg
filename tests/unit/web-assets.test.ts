import { describe, expect, it } from 'vitest';
import { POSITIONS, paths } from '../../web/layout';
import atlas from '../../public/assets/atlas.json';
import { data } from './slice-bot';

describe('ressources de l\'interface', () => {
    it('chaque lieu du monde a une position à l\'écran, et chaque chemin relie deux lieux placés', () => {
        const nodes = Object.entries(data.world.regions).flatMap(([r, ns]) => ns.map(n => `${r}.${n}`));
        expect(nodes.filter(n => !POSITIONS[n])).toEqual([]);
        for (const r of Object.keys(data.world.regions)) for (const [a, b] of paths(data.world, r)) expect([POSITIONS[a], POSITIONS[b]].every(Boolean)).toBe(true);
    });
    it('l\'atlas Aseprite a les deux cadres de chaque héros, créature du slice, boss et icône du HUD', () => {
        const creatures = Object.values(data.encounters).flatMap(e => e.foes.map(f => f.definitionId));
        const needed = [...Object.keys(data.heroes), ...creatures, 'roncier', 'rejeton', 'eglantine', 'icon_pv', 'icon_cristal', 'icon_herbe', 'icon_cle', 'icon_flamme'];
        const frames = Object.keys(atlas.frames);
        expect(needed.flatMap(n => [`${n}#0`, `${n}#1`]).filter(f => !frames.includes(f))).toEqual([]);
    });
});
