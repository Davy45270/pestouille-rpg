// T22 : après un premier chargement, le jeu se recharge et se joue sans réseau (précache du service worker).
import { expect, test } from '@playwright/test';
import { activer, demarrer } from './outils';

test('T22 : hors ligne, le jeu se recharge et se joue', async ({ page, context }, info) => {
    await demarrer(page);
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    });
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-pret', 'oui');
    await activer(page, info, page.locator('#actions [data-go="village.inn"]'));
    await expect(page.locator('body')).toHaveAttribute('data-node', 'village.inn');
    await expect(page.locator('#hud .membre')).toHaveCount(2);
    await context.setOffline(false);
});
