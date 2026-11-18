// T21 : parcours complet de la tranche verticale, au clavier (projet « clavier ») et au doigt (projet « tactile »),
// sans autre aide que les boutons du jeu. Reprise après rechargement au campement (sauvegarde IndexedDB).
import { expect, test } from '@playwright/test';
import { activer, capture, commander, demarrer } from './outils';

const ROUTE = ['village.inn', 'village.place', 'village.forge', 'village.place', 'village.home', 'village.place', 'village.forest_gate',
    'forest.entry', 'forest.glade', 'forest.spring', 'forest.camp', 'forest.temple_gate', 'temple.hall', 'temple.blocks',
    'temple.switches', 'temple.key', 'temple.antechamber', 'temple.boss'];

test('T21 : de la place du village au Roncier, la première flamme est rapportée', async ({ page }, info) => {
    await demarrer(page);
    const body = page.locator('body');
    let capturee = false;
    for (const to of ROUTE) {
        await activer(page, info, page.locator(`#actions [data-go="${to}"]`));
        await expect(body).toHaveAttribute('data-node', to);
        let recruter = to === 'forest.entry';
        for (let i = 0; i < 400 && await body.getAttribute('data-mode') === 'combat'; i++) {
            if (to === 'temple.boss' && !capturee && i > 6) {
                await info.attach('combat-roncier', { path: await capture(page, info.outputPath('combat-roncier.png')), contentType: 'image/png' });
                capturee = true;
            }
            await commander(page, info, recruter);
            if (recruter && await page.locator('#hud .bourse', { hasText: 'Réserve' }).count() > 0) recruter = false;
        }
        await expect(body).toHaveAttribute('data-node', to);
        if (to === 'temple.blocks') {
            for (const dir of ['down', 'right', 'up', 'right', 'down']) {
                if (info.project.use.hasTouch) await page.locator(`#actions [data-dir="${dir}"]`).tap();
                else await page.keyboard.press({ down: 'ArrowDown', right: 'ArrowRight', up: 'ArrowUp' }[dir] ?? '');
            }
        }
        if (to === 'temple.switches') for (const i of [0, 3]) await activer(page, info, page.locator(`#actions [data-lanterne="${i}"]`));
        if (to === 'forest.camp') {
            await expect(body).toHaveAttribute('data-sauvegarde', 'ok');
            await page.reload();
            await expect(body).toHaveAttribute('data-pret', 'oui');
            await expect(body).toHaveAttribute('data-node', 'forest.camp');
            await expect(page.locator('#hud .membre')).toHaveCount(4);
        }
    }
    await expect(body).toHaveAttribute('data-mode', 'fin');
    await expect(page.locator('#journal')).toContainText('Objet obtenu : Première flamme');
    await expect(page.locator('#hud [aria-label="première flamme"]')).toBeVisible();
    await info.attach('fin-premiere-flamme', { path: await capture(page, info.outputPath('fin-premiere-flamme.png')), contentType: 'image/png' });
});
