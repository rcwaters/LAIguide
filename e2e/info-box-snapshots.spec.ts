import { test, expect, Page } from '@playwright/test';

// ─── Fixed clock ──────────────────────────────────────────────────────────────
// All tests freeze the browser clock to this date so that computed elapsed
// times and displayed dates are deterministic regardless of when CI runs.
// page.clock.setFixedTime is called before page.goto so both Date.now() and
// new Date() inside initForm() and daysSinceDate() return the frozen date.

const FIXED_DATE = new Date('2026-01-15T12:00:00');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
    const d = new Date(FIXED_DATE);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
}

function daysFromNow(n: number): string {
    return daysAgo(-n);
}

async function selectField(page: Page, id: string, value: string): Promise<void> {
    if (id === 'guidance-type') {
        await page.locator(`.seg-btn[data-value="${value}"]`).click();
    } else {
        await page.selectOption(`#${id}`, value);
    }
}

async function fillDate(page: Page, id: string, value: string): Promise<void> {
    await page.locator(`#${id}`).waitFor({ state: 'visible' });
    await page.fill(`#${id}`, value);
    await page.dispatchEvent(`#${id}`, 'change');
}

async function submit(page: Page): Promise<void> {
    await page.locator('.guidance-section').waitFor();
}

/** Snapshots each .info-row as "Label: Value" lines (no normalisation needed). */
async function snapshotInfoBox(page: Page): Promise<void> {
    const rows = await page.locator('.medication-info .info-row').all();
    const lines = await Promise.all(
        rows.map(async (row) => {
            const label = (await row.locator('.info-label').innerText()).trim();
            const value = (await row.locator('.info-value').innerText()).trim();
            return `${label} ${value}`;
        }),
    );
    expect(lines.join('\n')).toMatchSnapshot();
}

// ─── Info-box snapshot tests ──────────────────────────────────────────────────

test.describe('info-box snapshots', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate first with the real clock so initForm() and page scripts
        // load without interference, then freeze time so the app's elapsed-time
        // calculations are deterministic regardless of when the test runs.
        await page.goto('/');
        await page.clock.setFixedTime(FIXED_DATE);
    });

    // ── Early guidance ────────────────────────────────────────────────────────

    test('invega_trinza — early guidance info box', async ({ page }) => {
        await selectField(page, 'medication', 'invega_trinza');
        await selectField(page, 'guidance-type', 'early');
        await fillDate(page, 'next-injection-date', daysAgo(-10)); // 10 days from now
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('abilify_maintena — early guidance info box', async ({ page }) => {
        await selectField(page, 'medication', 'abilify_maintena');
        await selectField(page, 'guidance-type', 'early');
        await fillDate(page, 'last-injection-date', daysAgo(27)); // 27 days — allowed (>= 26-day minimum)
        await submit(page);
        await snapshotInfoBox(page);
    });

    // ── Late guidance — all medications ───────────────────────────────────────

    test('invega_sustenna — initiation, 30 days', async ({ page }) => {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'initiation');
        await fillDate(page, 'first-injection', daysAgo(30));
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('invega_sustenna — maintenance 234mg, 50 days', async ({ page }) => {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'maintenance');
        await fillDate(page, 'last-maintenance', daysAgo(50));
        await selectField(page, 'maintenance-dose', '234');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('invega_trinza — 546mg, 150 days', async ({ page }) => {
        await selectField(page, 'medication', 'invega_trinza');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-trinza', daysAgo(150));
        await selectField(page, 'trinza-dose', '546');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('invega_hafyera — 210 days (consult window)', async ({ page }) => {
        await selectField(page, 'medication', 'invega_hafyera');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-hafyera', daysAgo(210));
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('abilify_maintena — 3+ doses, 35 days (routine)', async ({ page }) => {
        await selectField(page, 'medication', 'abilify_maintena');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-abilify', daysAgo(35));
        await selectField(page, 'abilify-prior-dose-group', '3+');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('abilify_maintena — 1-2 doses, 50 days (reinitiation)', async ({ page }) => {
        await selectField(page, 'medication', 'abilify_maintena');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-abilify', daysAgo(50));
        await selectField(page, 'abilify-prior-dose-group', '1-2');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('aristada — 662mg, 50 days (no supplementation)', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(50));
        await selectField(page, 'aristada-dose', '662');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('aristada — 441mg, 45 days (7-day oral supp)', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(45));
        await selectField(page, 'aristada-dose', '441');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('haloperidol_decanoate — 4+ doses, 30 days (routine)', async ({ page }) => {
        await selectField(page, 'medication', 'haloperidol_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-haloperidol', daysAgo(30));
        await selectField(page, 'haloperidol-prior-doses', '4+');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('haloperidol_decanoate — 1-3 doses, 60 days (check-in guidance)', async ({ page }) => {
        await selectField(page, 'medication', 'haloperidol_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-haloperidol', daysAgo(60));
        await selectField(page, 'haloperidol-prior-doses', '1-3');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('fluphenazine_decanoate — 3+ doses, 30 days (routine)', async ({ page }) => {
        await selectField(page, 'medication', 'fluphenazine_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-fluphenazine', daysAgo(30));
        await selectField(page, 'fluphenazine-prior-doses', '3+');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('fluphenazine_decanoate — 1-2 doses, 90 days (check-in guidance)', async ({ page }) => {
        await selectField(page, 'medication', 'fluphenazine_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-fluphenazine', daysAgo(90));
        await selectField(page, 'fluphenazine-prior-doses', '1-2');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('uzedy — 150-or-less, 90 days', async ({ page }) => {
        await selectField(page, 'medication', 'uzedy');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-uzedy', daysAgo(90));
        await selectField(page, 'uzedy-dose', '150-or-less');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('brixadi — monthly-64, 25 days', async ({ page }) => {
        await selectField(page, 'medication', 'brixadi');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-brixadi', daysAgo(25));
        await selectField(page, 'brixadi-type', 'monthly-64');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('brixadi — monthly-96, 38 days', async ({ page }) => {
        await selectField(page, 'medication', 'brixadi');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-brixadi', daysAgo(38));
        await selectField(page, 'brixadi-type', 'monthly-96');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('sublocade — 100mg-monthly, 25 days', async ({ page }) => {
        await selectField(page, 'medication', 'sublocade');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-sublocade', daysAgo(25));
        await selectField(page, 'sublocade-type', '100mg-monthly');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('sublocade — 300mg-more-than-2-doses, 45 days', async ({ page }) => {
        await selectField(page, 'medication', 'sublocade');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-sublocade', daysAgo(45));
        await selectField(page, 'sublocade-type', '300mg-more-than-2-doses');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('vivitrol — OUD, 25 days', async ({ page }) => {
        await selectField(page, 'medication', 'vivitrol');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-vivitrol', daysAgo(25));
        await selectField(page, 'vivitrol-indication', 'oud');
        await submit(page);
        await snapshotInfoBox(page);
    });

    test('vivitrol — overdose-prevention, 45 days', async ({ page }) => {
        await selectField(page, 'medication', 'vivitrol');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-vivitrol', daysAgo(45));
        await selectField(page, 'vivitrol-indication', 'overdose-prevention');
        await submit(page);
        await snapshotInfoBox(page);
    });
});
