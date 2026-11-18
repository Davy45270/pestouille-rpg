// Graphe logique du monde : une région sans transition interne est un espace ouvert (ses lieux sont reliés entre eux) ;
// une région qui en a (le temple) ne suit que ses transitions. Les transitions vont dans les deux sens ; une porte s'applique à l'entrée de son lieu. Le solveur ramasse les drapeaux (`grants`)
// jusqu'au point fixe pour prouver qu'aucun lieu n'est hors d'atteinte.
export interface WorldGraph {
    start: string;
    regions: Record<string, string[]>;
    transitions: [string, string][];
    gates: { target: string; requires: string }[];
    checkpoints: string[];
    grants: Record<string, string>;
}

const nodesOf = (g: WorldGraph): string[] => Object.entries(g.regions).flatMap(([r, places]) => places.map(p => `${r}.${p}`));

export const canEnter = (g: WorldGraph, node: string, flags: readonly string[]): boolean =>
    g.gates.every(gate => gate.target !== node || flags.includes(gate.requires));

function neighbours(g: WorldGraph, node: string): string[] {
    const region = node.slice(0, node.indexOf('.'));
    const internal = g.transitions.some(([a, b]) => a.startsWith(`${region}.`) && b.startsWith(`${region}.`));
    const same = internal ? [] : (g.regions[region] ?? []).map(p => `${region}.${p}`);
    const links = g.transitions.flatMap(([a, b]) => (a === node ? [b] : b === node ? [a] : []));
    return [...same, ...links].filter(n => n !== node);
}

export function reachable(g: WorldGraph, start: string, flags: readonly string[]): string[] {
    const seen = new Set([start]);
    const queue = [start];
    for (let node = queue.shift(); node !== undefined; node = queue.shift()) {
        for (const next of neighbours(g, node)) {
            if (!seen.has(next) && canEnter(g, next, flags)) { seen.add(next); queue.push(next); }
        }
    }
    return [...seen].sort();
}

export function solve(g: WorldGraph, start: string): { reached: string[]; flags: string[] } {
    let flags: string[] = [];
    for (;;) {
        const reached = reachable(g, start, flags);
        const found = [...new Set(reached.flatMap(n => (g.grants[n] !== undefined ? [g.grants[n]] : [])))].sort();
        if (found.length === flags.length) return { reached, flags };
        flags = found;
    }
}

export function validateWorld(g: WorldGraph): string[] {
    const known = new Set(nodesOf(g));
    const errors: string[] = [];
    const referenced = [g.start, ...g.transitions.flat(), ...g.gates.map(x => x.target), ...g.checkpoints, ...Object.keys(g.grants)];
    for (const n of [...new Set(referenced)]) if (!known.has(n)) errors.push(`nœud inconnu : ${n}`);
    const sources = new Set(Object.values(g.grants));
    for (const gate of g.gates) if (!sources.has(gate.requires)) errors.push(`porte sans source : ${gate.target} exige ${gate.requires}`);
    const { reached } = solve(g, g.start);
    for (const n of [...known].sort()) if (!reached.includes(n)) errors.push(`nœud non atteint : ${n}`);
    return errors;
}

/** Après une défaite : le dernier checkpoint visité, sinon le premier checkpoint du graphe. */
export function respawnAfterDefeat(g: WorldGraph, visited: readonly string[]): string {
    const last = [...visited].reverse().find(n => g.checkpoints.includes(n));
    return last ?? g.checkpoints[0] ?? g.start;
}
