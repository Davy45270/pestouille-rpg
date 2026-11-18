// Outils des parcours : activer un bouton au clavier (focus + Entrée) ou au doigt (tap), lire les combattants.
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

export async function activer(page: Page, info: TestInfo, el: Locator): Promise<void> {
    if (info.project.use.hasTouch) await el.tap();
    else { await el.focus(); await page.keyboard.press('Enter'); }
}
/** Capture pleine page écrite sur disque (CI : test-results/), rend le chemin. */
export async function capture(page: Page, path: string): Promise<string> {
    await page.screenshot({ path, fullPage: true });
    return path;
}
export async function demarrer(page: Page): Promise<void> {
    await page.goto('/');
    await expect(page.locator('body')).toHaveAttribute('data-pret', 'oui');
}
interface Combattant { id: string; team: string; hp: number; max: number; recruitable: boolean; def: string }
const combattants = (page: Page): Promise<Combattant[]> => page.locator('#combattants li').evaluateAll(els => els.map(e => {
    const d = (e as HTMLElement).dataset;
    return { id: d.unit ?? '', team: d.team ?? '', hp: Number(d.hp), max: Number(d.max), recruitable: d.recruitable === 'true', def: d.def ?? '' };
}));

/** Joue un tour de commande (un héros), avec la stratégie du bot unitaire : soigner, recruter le Moussin, frapper le plus faible. */
export async function commander(page: Page, info: TestInfo, recruter: boolean): Promise<void> {
    const hero = await page.locator('h2[data-hero]').getAttribute('data-hero');
    const all = await combattants(page);
    const foes = all.filter(c => c.team === 'enemy').sort((a, b) => a.hp - b.hp || (a.id < b.id ? -1 : 1));
    const players = all.filter(c => c.team === 'player');
    const btn = (sel: string): Locator => page.locator(`#actions ${sel}`);
    const wounded = [...players].sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
    if (hero === 'lila' && wounded && wounded.hp * 100 < 50 * wounded.max && await btn('[data-cmd="skills"]').count() > 0) {
        await activer(page, info, btn('[data-cmd="skills"]'));
        const heal = btn('[data-skill="heal"]');
        if (await heal.isEnabled()) { await activer(page, info, heal); await activer(page, info, btn(`[data-target="${wounded.id}"]`)); return; }
        await activer(page, info, btn('[data-cmd="back"]'));
    }
    const keep = recruter ? (foes.find(f => f.def === 'mossling') ?? foes.find(f => f.recruitable)) : undefined;
    const target = foes.find(f => f !== keep);
    if (!target && keep) {
        if (keep.hp * 100 <= 30 * keep.max && hero === 'pestouille') { await activer(page, info, btn('[data-cmd="soothe"]')); await activer(page, info, btn(`[data-target="${keep.id}"]`)); return; }
        if (hero === 'nox' && keep.hp * 100 > 30 * keep.max) { await activer(page, info, btn('[data-cmd="attack"]')); await activer(page, info, btn(`[data-target="${keep.id}"]`)); return; }
        await activer(page, info, btn('[data-cmd="defend"]'));
        return;
    }
    if (!target) { await activer(page, info, btn('[data-cmd="defend"]')); return; }
    if (hero === 'pestouille') {
        await activer(page, info, btn('[data-cmd="skills"]'));
        const fire = btn('[data-skill="fire_breath"]');
        if (await fire.isEnabled()) { await activer(page, info, fire); await activer(page, info, btn(`[data-target="${target.id}"]`)); return; }
        await activer(page, info, btn('[data-cmd="back"]'));
    }
    await activer(page, info, btn('[data-cmd="attack"]'));
    await activer(page, info, btn(`[data-target="${target.id}"]`));
}
