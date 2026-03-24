/**
 * Comprehensive per-medication e2e tests.
 *
 * Covers two failure modes for all 11 medications:
 *   1. No premature submission — selecting a guidance type before filling fields
 *      must NOT auto-submit or show an alert. This guards against the flatpickr
 *      regression where input[type="date"] becomes type="text", causing
 *      checkAutoSubmit to find zero required inputs and fall through to submit.
 *   2. Complete flow — filling all required fields causes guidance to render with
 *      the medication name visible.
 */

import { test, expect, Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function daysFromNow(n: number): string {
    return daysAgo(-n);
}

async function selectGuidanceType(page: Page, value: string): Promise<void> {
    await page.locator(`.seg-btn[data-value="${value}"]`).click();
}

async function fillDate(page: Page, id: string, value: string): Promise<void> {
    await page.fill(`#${id}`, value);
    await page.dispatchEvent(`#${id}`, 'change');
}

const ALL_MEDS = [
    'abilify_maintena',
    'aristada',
    'brixadi',
    'fluphenazine_decanoate',
    'haloperidol_decanoate',
    'invega_hafyera',
    'invega_sustenna',
    'invega_trinza',
    'sublocade',
    'uzedy',
    'vivitrol',
];

// ─── No premature submission — late guidance ──────────────────────────────────
//
// After selecting a medication + "late" guidance type, no alert should fire and
// no guidance section should appear before the user fills in required fields.

test.describe('no premature submission — late guidance', () => {
    for (const med of ALL_MEDS) {
        test(`${med}`, async ({ page }) => {
            const alerts: string[] = [];
            page.on('dialog', async (dialog) => {
                alerts.push(dialog.message());
                await dialog.dismiss();
            });

            await page.goto('/');
            await page.selectOption('#medication', med);
            await selectGuidanceType(page, 'late');
            await page.waitForTimeout(200);

            expect(alerts).toHaveLength(0);
            await expect(page.locator('.guidance-section')).not.toBeVisible();
        });
    }
});

// ─── No premature submission — early guidance ─────────────────────────────────

test.describe('no premature submission — early guidance', () => {
    for (const med of ALL_MEDS) {
        test(`${med}`, async ({ page }) => {
            const alerts: string[] = [];
            page.on('dialog', async (dialog) => {
                alerts.push(dialog.message());
                await dialog.dismiss();
            });

            await page.goto('/');
            await page.selectOption('#medication', med);
            await selectGuidanceType(page, 'early');
            await page.waitForTimeout(200);

            expect(alerts).toHaveLength(0);
            await expect(page.locator('.guidance-section')).not.toBeVisible();
        });
    }
});

// ─── Late guidance complete flows ─────────────────────────────────────────────

test.describe('late guidance complete flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('abilify_maintena', async ({ page }) => {
        await page.selectOption('#medication', 'abilify_maintena');
        await selectGuidanceType(page, 'late');
        await fillDate(page, 'last-abilify', daysAgo(35));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await page.selectOption('#abilify-prior-dose-group', '3+');
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Abilify Maintena');
    });

    test('aristada', async ({ page }) => {
        await page.selectOption('#medication', 'aristada');
        await selectGuidanceType(page, 'late');
        await fillDate(page, 'last-aristada', daysAgo(45));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await page.selectOption('#aristada-dose', '441');
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Aristada');
    });

    test('brixadi', async ({ page }) => {
        await page.selectOption('#medication', 'brixadi');
        await selectGuidanceType(page, 'late');
        await fillDate(page, 'last-brixadi', daysAgo(30));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await page.selectOption('#brixadi-type', 'monthly-64');
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Brixadi');
    });

    test('fluphenazine_decanoate', async ({ page }) => {
        await page.selectOption('#medication', 'fluphenazine_decanoate');
        await selectGuidanceType(page, 'late');
        await fillDate(page, 'last-fluphenazine', daysAgo(30));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await page.selectOption('#fluphenazine-prior-doses', '3+');
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Fluphenazine');
    });

    test('haloperidol_decanoate', async ({ page }) => {
        await page.selectOption('#medication', 'haloperidol_decanoate');
        await selectGuidanceType(page, 'late');
        await fillDate(page, 'last-haloperidol', daysAgo(35));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await page.selectOption('#haloperidol-prior-doses', '4+');
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Haloperidol');
    });

    test('invega_hafyera', async ({ page }) => {
        await page.selectOption('#medication', 'invega_hafyera');
        await selectGuidanceType(page, 'late');
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await fillDate(page, 'last-hafyera', daysAgo(200));
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Hafyera');
    });

    test('invega_sustenna — maintenance', async ({ page }) => {
        await page.selectOption('#medication', 'invega_sustenna');
        await selectGuidanceType(page, 'late');
        await page.selectOption('#invega-type', 'maintenance');
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await fillDate(page, 'last-maintenance', daysAgo(40));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await page.selectOption('#maintenance-dose', '39-to-156');
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Invega Sustenna');
    });

    test('invega_sustenna — initiation', async ({ page }) => {
        await page.selectOption('#medication', 'invega_sustenna');
        await selectGuidanceType(page, 'late');
        await page.selectOption('#invega-type', 'initiation');
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await fillDate(page, 'first-injection', daysAgo(15));
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Invega Sustenna');
    });

    test('invega_trinza', async ({ page }) => {
        await page.selectOption('#medication', 'invega_trinza');
        await selectGuidanceType(page, 'late');
        await fillDate(page, 'last-trinza', daysAgo(100));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await page.selectOption('#trinza-dose', '410');
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Invega Trinza');
    });

    test('sublocade', async ({ page }) => {
        await page.selectOption('#medication', 'sublocade');
        await selectGuidanceType(page, 'late');
        await fillDate(page, 'last-sublocade', daysAgo(35));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await page.selectOption('#sublocade-type', '300mg-more-than-2-doses');
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Sublocade');
    });

    test('uzedy', async ({ page }) => {
        await page.selectOption('#medication', 'uzedy');
        await selectGuidanceType(page, 'late');
        await fillDate(page, 'last-uzedy', daysAgo(30));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await page.selectOption('#uzedy-dose', '150-or-less');
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Uzedy');
    });

    test('vivitrol', async ({ page }) => {
        await page.selectOption('#medication', 'vivitrol');
        await selectGuidanceType(page, 'late');
        await fillDate(page, 'last-vivitrol', daysAgo(35));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await page.selectOption('#vivitrol-indication', 'oud');
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Vivitrol');
    });
});

// ─── Early guidance complete flows ────────────────────────────────────────────

test.describe('early guidance complete flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    // minDays-only: waits for last-injection-date
    test('abilify_maintena (minDays: 26)', async ({ page }) => {
        await page.selectOption('#medication', 'abilify_maintena');
        await selectGuidanceType(page, 'early');
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await fillDate(page, 'last-injection-date', daysAgo(30));
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Abilify Maintena');
    });

    // dual: needs next-injection-date AND last-injection-date
    test('aristada (dual: daysBeforeDue:2, minDays:21)', async ({ page }) => {
        await page.selectOption('#medication', 'aristada');
        await selectGuidanceType(page, 'early');
        await fillDate(page, 'next-injection-date', daysFromNow(1));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await fillDate(page, 'last-injection-date', daysAgo(25));
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Aristada');
    });

    // variant: needs brixadi-type select then last-brixadi date
    test('brixadi (variant monthly — select then date)', async ({ page }) => {
        await page.selectOption('#medication', 'brixadi');
        await selectGuidanceType(page, 'early');
        await page.selectOption('#brixadi-type', 'monthly-64');
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await fillDate(page, 'last-brixadi', daysAgo(25));
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Brixadi');
    });

    test('brixadi (variant weekly)', async ({ page }) => {
        await page.selectOption('#medication', 'brixadi');
        await selectGuidanceType(page, 'early');
        await fillDate(page, 'last-brixadi', daysAgo(10));
        await page.selectOption('#brixadi-type', 'weekly');
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Brixadi');
    });

    test('fluphenazine_decanoate (dual: daysBeforeDue:2, minDays:14)', async ({ page }) => {
        await page.selectOption('#medication', 'fluphenazine_decanoate');
        await selectGuidanceType(page, 'early');
        await fillDate(page, 'next-injection-date', daysFromNow(1));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await fillDate(page, 'last-injection-date', daysAgo(20));
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Fluphenazine');
    });

    test('haloperidol_decanoate (dual: daysBeforeDue:2, minDays:14)', async ({ page }) => {
        await page.selectOption('#medication', 'haloperidol_decanoate');
        await selectGuidanceType(page, 'early');
        await fillDate(page, 'next-injection-date', daysFromNow(1));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await fillDate(page, 'last-injection-date', daysAgo(20));
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Haloperidol');
    });

    // window-only: waits for next-injection-date
    test('invega_hafyera (window: daysBeforeDue:14)', async ({ page }) => {
        await page.selectOption('#medication', 'invega_hafyera');
        await selectGuidanceType(page, 'early');
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await fillDate(page, 'next-injection-date', daysFromNow(3));
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Hafyera');
    });

    test('invega_sustenna (dual: daysBeforeDue:2, minDays:21)', async ({ page }) => {
        await page.selectOption('#medication', 'invega_sustenna');
        await selectGuidanceType(page, 'early');
        await fillDate(page, 'next-injection-date', daysFromNow(1));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await fillDate(page, 'last-injection-date', daysAgo(25));
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Invega Sustenna');
    });

    test('invega_trinza (window: daysBeforeDue:7)', async ({ page }) => {
        await page.selectOption('#medication', 'invega_trinza');
        await selectGuidanceType(page, 'early');
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await fillDate(page, 'next-injection-date', daysFromNow(3));
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Invega Trinza');
    });

    test('sublocade (minDays: 21)', async ({ page }) => {
        await page.selectOption('#medication', 'sublocade');
        await selectGuidanceType(page, 'early');
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await fillDate(page, 'last-injection-date', daysAgo(25));
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Sublocade');
    });

    test('uzedy (dual: daysBeforeDue:2, minDays:21)', async ({ page }) => {
        await page.selectOption('#medication', 'uzedy');
        await selectGuidanceType(page, 'early');
        await fillDate(page, 'next-injection-date', daysFromNow(1));
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await fillDate(page, 'last-injection-date', daysAgo(25));
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Uzedy');
    });

    test('vivitrol (minDays: 28)', async ({ page }) => {
        await page.selectOption('#medication', 'vivitrol');
        await selectGuidanceType(page, 'early');
        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await fillDate(page, 'last-injection-date', daysAgo(30));
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Vivitrol');
    });
});
