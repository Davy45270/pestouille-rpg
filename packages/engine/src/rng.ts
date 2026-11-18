// Hasard reproductible : graine textuelle -> cyrb128 -> état xoshiro128** (4 entiers 32 bits).
// Algorithmes publiés (domaine public), voir docs/reuse-decisions/rng.md.
export type RngState = readonly [number, number, number, number];

function cyrb128(text: string): [number, number, number, number] {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0; i < text.length; i++) {
        const k = text.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export function seedRng(seed: string): RngState {
    const s = cyrb128(seed);
    return s.every(v => v === 0) ? [0x9e3779b9, 0x243f6a88, 0xb7e15162, 0x3c6ef372] : s;
}

const rotl = (x: number, k: number): number => ((x << k) | (x >>> (32 - k))) >>> 0;

export function nextU32(state: RngState): [number, RngState] {
    const [a, b, c, d] = state;
    const result = Math.imul(rotl(Math.imul(b, 5) >>> 0, 7), 9) >>> 0;
    const t = (b << 9) >>> 0;
    let c2 = (c ^ a) >>> 0;
    let d2 = (d ^ b) >>> 0;
    const b2 = (b ^ c2) >>> 0;
    const a2 = (a ^ d2) >>> 0;
    c2 = (c2 ^ t) >>> 0;
    d2 = rotl(d2, 11);
    return [result, [a2, b2, c2, d2]];
}

/** Un tirage entier dans 0..99. */
export function rollPercent(state: RngState): [number, RngState] {
    const [v, next] = nextU32(state);
    return [v % 100, next];
}
