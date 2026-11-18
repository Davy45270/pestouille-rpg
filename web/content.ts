// Contenu du jeu, embarqué au build (import.meta.glob) : rien n'est demandé au réseau en jeu (T22).
import { buildGameData, type Scene } from '@pestouille/content/game-data';
import type { ContentBundle } from '@pestouille/content';
import type { GameData } from '@pestouille/engine';
import scene from '../content/scenes/first_flame.json';
import world from '../content/world/first_flame.json';

const files = import.meta.glob<unknown>('../content/*/*.json', { eager: true, import: 'default' });
const kind = (k: string): unknown[] => Object.keys(files).filter(p => p.startsWith(`../content/${k}/`)).sort().map(p => files[p]);

export const bundle: ContentBundle = {
    creatures: kind('creatures'), skills: kind('skills'), items: kind('items'), jobs: kind('jobs'),
    encounters: kind('encounters'), quests: kind('quests'), bosses: kind('bosses')
};
export const data: GameData = buildGameData(bundle, scene as unknown as Scene, world);
