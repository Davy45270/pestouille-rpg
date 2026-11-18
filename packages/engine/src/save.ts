// Sauvegarde : enveloppe versionnée et scellée par l'empreinte de l'état. Une version future ou une enveloppe
// altérée est refusée avec une erreur explicite, jamais chargée à moitié (T16).
import { SAVE_VERSION, type GameState } from './game.ts';
import { stateHash } from './hash.ts';

export interface SaveEnvelope { format: 'pestouille-rpg'; version: number; hash: string; state: GameState }
export class SaveError extends Error {}

export function serialize(state: GameState): string {
    const env: SaveEnvelope = { format: 'pestouille-rpg', version: SAVE_VERSION, hash: stateHash(state), state };
    return JSON.stringify(env);
}

export function deserialize(text: string): GameState {
    let env: Partial<SaveEnvelope>;
    try { env = JSON.parse(text) as Partial<SaveEnvelope>; } catch { throw new SaveError('sauvegarde illisible : JSON invalide'); }
    if (env.format !== 'pestouille-rpg') throw new SaveError('ce fichier n\'est pas une sauvegarde de Pestouille RPG');
    if (typeof env.version !== 'number') throw new SaveError('sauvegarde sans version');
    if (env.version > SAVE_VERSION) throw new SaveError(`sauvegarde de version ${env.version}, plus récente que le jeu (version ${SAVE_VERSION}) : mets le jeu à jour`);
    if (env.version < SAVE_VERSION) throw new SaveError(`sauvegarde de version ${env.version} : aucune migration connue`);
    if (!env.state || env.hash !== stateHash(env.state)) throw new SaveError('sauvegarde altérée : empreinte différente');
    return env.state;
}
