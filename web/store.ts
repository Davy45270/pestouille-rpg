// Sauvegarde automatique dans IndexedDB (une entrée « auto »). Toute erreur du navigateur (mode privé, quota)
// est rendue à l'appelant comme un message, jamais levée : le jeu reste jouable sans sauvegarde.
const DB = 'pestouille-rpg', STORE = 'saves', KEY = 'auto';

function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => { r.result.createObjectStore(STORE); };
        r.onsuccess = () => { resolve(r.result); };
        r.onerror = () => { reject(r.error ?? new Error('IndexedDB indisponible')); };
    });
}
function run<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return open().then(db => new Promise<T>((resolve, reject) => {
        const req = f(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => { resolve(req.result); db.close(); };
        req.onerror = () => { reject(req.error ?? new Error('IndexedDB : échec')); db.close(); };
    }));
}
export async function loadSave(): Promise<string | null> {
    try { const v = await run<unknown>('readonly', s => s.get(KEY)); return typeof v === 'string' ? v : null; } catch { return null; }
}
export async function writeSave(text: string): Promise<boolean> {
    try { await run('readwrite', s => s.put(text, KEY)); return true; } catch { return false; }
}
export async function clearSave(): Promise<void> {
    try { await run('readwrite', s => s.delete(KEY)); } catch { /* rien à effacer */ }
}
