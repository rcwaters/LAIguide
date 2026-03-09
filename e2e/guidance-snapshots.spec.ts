import { test, expect, Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
}

async function selectField(page: Page, id: string, value: string): Promise<void> {
    if (id === 'guidance-type') {
        await page.evaluate((v) => (window as any).selectGuidanceType(v), value);
    } else {
        await page.selectOption(`#${id}`, value);
    }
}

async function fillDate(page: Page, id: string, value: string): Promise<void> {
    await page.fill(`#${id}`, value);
    await page.dispatchEvent(`#${id}`, 'change');
}

async function submit(page: Page): Promise<void> {
    await page.locator('.guidance-section').waitFor();
}

/**
 * Snapshots the text content of all .guidance-content blocks.
 * Excludes .medication-info (date-sensitive info rows).
 */
async function snapshotGuidance(page: Page): Promise<void> {
    const texts = await page.locator('.guidance-content').allInnerTexts();
    expect(texts.join('\n\n---\n\n')).toMatchSnapshot();
}

// ─── Snapshot tests ───────────────────────────────────────────────────────────

test.describe('guidance text snapshots', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('invega_sustenna — initiation, 30 days', async ({ page }) => {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'initiation');
        await fillDate(page, 'first-injection', daysAgo(30));
        await submit(page);
        await snapshotGuidance(page);
    });

    test('invega_sustenna — maintenance 234mg, 50 days', async ({ page }) => {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'maintenance');
        await fillDate(page, 'last-maintenance', daysAgo(50));
        await selectField(page, 'maintenance-dose', '234');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('invega_trinza — 546mg, 150 days (reinitiation window)', async ({ page }) => {
        await selectField(page, 'medication', 'invega_trinza');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-trinza', daysAgo(150));
        await selectField(page, 'trinza-dose', '546');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('invega_hafyera — 210 days (consult window)', async ({ page }) => {
        await selectField(page, 'medication', 'invega_hafyera');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-hafyera', daysAgo(210));
        await submit(page);
        await snapshotGuidance(page);
    });

    test('abilify_maintena — 3+ doses, 35 days (routine window)', async ({ page }) => {
        await selectField(page, 'medication', 'abilify_maintena');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-abilify', daysAgo(35));
        await selectField(page, 'abilify-doses', '3+');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('abilify_maintena — 1-2 doses, 50 days (reinitiation window)', async ({ page }) => {
        await selectField(page, 'medication', 'abilify_maintena');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-abilify', daysAgo(50));
        await selectField(page, 'abilify-doses', '1-2');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('aristada — 662mg, 50 days (no supplementation)', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(50));
        await selectField(page, 'aristada-dose', '662');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('aristada — 441mg, 45 days (7-day oral supp)', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(45));
        await selectField(page, 'aristada-dose', '441');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('haloperidol_decanoate — 4+ doses, 30 days (routine)', async ({ page }) => {
        await selectField(page, 'medication', 'haloperidol_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-haloperidol', daysAgo(30));
        await selectField(page, 'haloperidol-prior-doses', '4+');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('haloperidol_decanoate — 1-3 doses, 60 days (check-in guidance)', async ({ page }) => {
        await selectField(page, 'medication', 'haloperidol_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-haloperidol', daysAgo(60));
        await selectField(page, 'haloperidol-prior-doses', '1-3');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('fluphenazine_decanoate — 3+ doses, 30 days (routine)', async ({ page }) => {
        await selectField(page, 'medication', 'fluphenazine_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-fluphenazine', daysAgo(30));
        await selectField(page, 'fluphenazine-prior-doses', '3+');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('fluphenazine_decanoate — 1-2 doses, 90 days (check-in guidance)', async ({ page }) => {
        await selectField(page, 'medication', 'fluphenazine_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-fluphenazine', daysAgo(90));
        await selectField(page, 'fluphenazine-prior-doses', '1-2');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('uzedy — 150-or-less, 90 days', async ({ page }) => {
        await selectField(page, 'medication', 'uzedy');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-uzedy', daysAgo(90));
        await selectField(page, 'uzedy-dose', '150-or-less');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('brixadi — monthly-64, 25 days (administer regardless)', async ({ page }) => {
        await selectField(page, 'medication', 'brixadi');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-brixadi', daysAgo(25));
        await selectField(page, 'brixadi-type', 'monthly-64');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('brixadi — monthly-96, 38 days (fentanyl assessment)', async ({ page }) => {
        await selectField(page, 'medication', 'brixadi');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-brixadi', daysAgo(38));
        await selectField(page, 'brixadi-type', 'monthly-96');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('sublocade — 100mg, 25 days (administer)', async ({ page }) => {
        await selectField(page, 'medication', 'sublocade');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-sublocade', daysAgo(25));
        await selectField(page, 'sublocade-type', '100mg');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('sublocade — 300mg-established, 45 days (administer regardless)', async ({ page }) => {
        await selectField(page, 'medication', 'sublocade');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-sublocade', daysAgo(45));
        await selectField(page, 'sublocade-type', '300mg-established');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('vivitrol — OUD, 25 days (administer, no UDS)', async ({ page }) => {
        await selectField(page, 'medication', 'vivitrol');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-vivitrol', daysAgo(25));
        await selectField(page, 'vivitrol-indication', 'oud');
        await submit(page);
        await snapshotGuidance(page);
    });

    test('vivitrol — overdose-prevention, 45 days (UDS required)', async ({ page }) => {
        await selectField(page, 'medication', 'vivitrol');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-vivitrol', daysAgo(45));
        await selectField(page, 'vivitrol-indication', 'overdose-prevention');
        await submit(page);
        await snapshotGuidance(page);
    });
});
