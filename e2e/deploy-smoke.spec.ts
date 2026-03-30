import { test, expect } from '@playwright/test';

test.describe('deployed site smoke checks', () => {
    test('custom CSS is applied', async ({ page }) => {
        await page.goto('./');

        const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        expect(bodyBg).toBe('rgb(174, 207, 204)');

        await expect(page.locator('.app-container')).toHaveCSS(
            'background-color',
            'rgb(255, 255, 255)',
        );
    });

    test('medication dropdown is populated', async ({ page }) => {
        await page.goto('./');

        const options = page.locator('#medication option');
        await expect(options).toHaveCount(12);

        const values = await page
            .locator('#medication option')
            .evaluateAll((els) => els.map((el) => (el as HTMLOptionElement).value));
        expect(values).toContain('invega_sustenna');
        expect(values).toContain('aristada');
    });
});
