// Positions des lieux sur l'écran (480 x 270, pixels logiques) et chemins dessinés entre eux. Pur : testé en unitaire.
import type { WorldGraph } from '@pestouille/engine';

export const WIDTH = 480, HEIGHT = 270;
export const POSITIONS: Record<string, [number, number]> = {
    'village.place': [240, 140], 'village.home': [80, 70], 'village.clinic': [400, 70], 'village.forge': [80, 205],
    'village.inn': [400, 205], 'village.forest_gate': [240, 240],
    'forest.entry': [60, 210], 'forest.glade': [165, 95], 'forest.spring': [280, 195], 'forest.camp': [370, 85], 'forest.temple_gate': [440, 215],
    'temple.hall': [55, 150], 'temple.blocks': [140, 70], 'temple.switches': [230, 150], 'temple.key': [320, 70],
    'temple.antechamber': [380, 200], 'temple.boss': [445, 110]
};
export const REGION_COLORS: Record<string, { ground: number; path: number; label: string }> = {
    village: { ground: 0x9fcf7a, path: 0xe3c995, label: 'Village des Lucioles' },
    forest: { ground: 0x4f8a45, path: 0x9b7a4c, label: 'Forêt des Murmures' },
    temple: { ground: 0x6d6a78, path: 0xa9a3b8, label: 'Temple des Racines' }
};
export const regionOf = (node: string): string => node.split('.')[0] ?? node;

/** Chemins à dessiner dans une région : transitions internes, ou étoile depuis le premier lieu d'un espace ouvert. */
export function paths(g: WorldGraph, region: string): [string, string][] {
    const inside = g.transitions.filter(([a, b]) => regionOf(a) === region && regionOf(b) === region);
    if (inside.length > 0) return inside;
    const nodes = (g.regions[region] ?? []).map(n => `${region}.${n}`);
    const hub = region === 'village' ? 'village.place' : nodes[0];
    return hub === undefined ? [] : nodes.filter(n => n !== hub).map(n => [hub, n] as [string, string]);
}
