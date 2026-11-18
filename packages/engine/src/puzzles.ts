// Énigmes du temple, pures : les blocs (pousser un bloc sur une dalle) et les interrupteurs (chacun bascule aussi ses voisins).
export type Dir = 'up' | 'down' | 'left' | 'right';
export interface BlocksState { kind: 'blocks'; map: string[]; player: [number, number]; block: [number, number]; plate: [number, number]; moves: number }
export interface SwitchesState { kind: 'switches'; on: boolean[]; presses: number }
export type PuzzleState = BlocksState | SwitchesState;

const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** Carte : `#` mur, `.` sol. Coordonnées [x, y]. */
export const newBlocks = (): BlocksState => ({
    kind: 'blocks', map: ['######', '#....#', '#....#', '#....#', '######'], player: [1, 1], block: [2, 2], plate: [3, 3], moves: 0
});
export const newSwitches = (): SwitchesState => ({ kind: 'switches', on: [false, false, false, false], presses: 0 });
export const newPuzzle = (id: 'blocks' | 'switches'): PuzzleState => (id === 'blocks' ? newBlocks() : newSwitches());

const floor = (s: BlocksState, x: number, y: number): boolean => s.map[y]?.[x] === '.';

export function pushMove(s: BlocksState, dir: Dir): BlocksState {
    const [dx, dy] = DELTA[dir];
    const nx = s.player[0] + dx, ny = s.player[1] + dy;
    if (!floor(s, nx, ny) || solved(s)) return s;
    if (nx === s.block[0] && ny === s.block[1]) {
        const bx = nx + dx, by = ny + dy;
        if (!floor(s, bx, by)) return s;
        return { ...s, player: [nx, ny], block: [bx, by], moves: s.moves + 1 };
    }
    return { ...s, player: [nx, ny], moves: s.moves + 1 };
}

export function press(s: SwitchesState, i: number): SwitchesState {
    if (i < 0 || i >= s.on.length || solved(s)) return s;
    return { ...s, on: s.on.map((v, j) => (Math.abs(i - j) <= 1 ? !v : v)), presses: s.presses + 1 };
}

export const solved = (s: PuzzleState): boolean =>
    s.kind === 'blocks' ? s.block[0] === s.plate[0] && s.block[1] === s.plate[1] : s.on.every(Boolean);
