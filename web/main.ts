// Point d'entrée : charge la sauvegarde, branche la vue Phaser et le panneau, applique chaque action par step().
import Phaser from 'phaser';
import { deserialize, newGame, SaveError, serialize, step, type Dir, type GameAction, type GameState } from '@pestouille/engine';
import { data } from './content';
import { HEIGHT, WIDTH } from './layout';
import { narrate } from './narrate';
import { clearSave, loadSave, writeSave } from './store';
import { Panel } from './ui';
import { GameView } from './view';
import './style.css';

const seed = (): string => `partie-${Date.now().toString(36)}`;
let state: GameState | undefined;
const panel = new Panel(document.querySelector('#panneau') as HTMLElement, a => { apply(a); }, () => { void restart(); });
let view: GameView | undefined;

function draw(): void { if (!state) return; view?.render(state, data); panel.render(state, data); }
function apply(a: GameAction): void {
    if (!state) return;
    const r = step(state, data, a);
    state = r.state;
    panel.log([...narrate(r.events, data), ...r.lines]);
    draw();
    void writeSave(serialize(r.state)).then(ok => { document.body.dataset.sauvegarde = ok ? 'ok' : 'indisponible'; });
}
async function restart(): Promise<void> {
    await clearSave();
    state = newGame(data, seed());
    panel.log(['Nouvelle partie.', data.nodes[state.node]?.name ?? state.node]);
    draw();
}

async function boot(): Promise<void> {
    const saved = await loadSave();
    if (saved) {
        try { state = deserialize(saved); panel.log(['Partie reprise.']); }
        catch (e) {
            state = newGame(data, seed());
            panel.log([e instanceof SaveError ? `Sauvegarde refusée : ${e.message}.` : 'Sauvegarde illisible.', 'Nouvelle partie.']);
        }
    } else {
        state = newGame(data, seed());
        panel.log(['Place du village', 'Églantine : Pestouille ! Le Roncier étouffe le temple de la forêt.', 'Réunis Lila, Borin et Nox, puis rapporte la première flamme.']);
    }
    draw();
    await new Promise<void>(resolve => {
        view = new GameView(resolve);
        view.onNode = n => { if (!state?.battle) apply({ type: 'move', to: n }); };
        new Phaser.Game({
            type: Phaser.AUTO, parent: 'scene', width: WIDTH, height: HEIGHT, backgroundColor: '#1d1a16', pixelArt: true,
            scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY }, render: { maxTextures: 1 }, scene: [view]
        });
    });
    draw();
    document.body.dataset.pret = 'oui';
}

document.addEventListener('keydown', e => {
    if (!state?.puzzle || state.puzzle.kind !== 'blocks') return;
    const keys: Record<string, Dir | undefined> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    const dir = keys[e.key];
    if (dir) { e.preventDefault(); apply({ type: 'push', dir }); }
});
void boot();
