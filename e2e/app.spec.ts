import { test, expect, Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
}

/** Returns YYYY-MM-DD for N days from today. */
function daysFromNow(n: number): string { return daysAgo(-n); }

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

// ─── CSS loading ─────────────────────────────────────────────────────────────
//
// If the <link> tag is missing or the stylesheet fails to load, the browser
// falls back to default styles: white body, native-width selects, no custom
// colours. These tests catch that regression without asserting pixel-perfect
// values — they only verify that the custom stylesheet was actually applied.

test.describe('CSS loading', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('body has light teal background (not default transparent)', async ({ page }) => {
        // Default body background-color is transparent/rgba(0,0,0,0).
        // Our CSS sets background: #b3dde6, which proves the stylesheet loaded.
        const bgColor = await page.evaluate(() =>
            getComputedStyle(document.body).backgroundColor,
        );
        expect(bgColor).toBe('rgb(174, 207, 204)');
    });

    test('app-container has white background (not transparent)', async ({ page }) => {
        await expect(page.locator('.app-container')).toHaveCSS(
            'background-color',
            'rgb(255, 255, 255)',
        );
    });

    test('medication select is full-width (CSS width: 100% applied)', async ({ page }) => {
        const selectWidth = await page.locator('#medication').evaluate(
            (el) => el.getBoundingClientRect().width,
        );
        const containerWidth = await page.locator('#medication').evaluate(
            (el) => (el.parentElement as HTMLElement).getBoundingClientRect().width,
        );
        // With CSS applied the select fills its container; without CSS it is
        // only as wide as its longest option text (~200 px on most platforms).
        expect(selectWidth).toBeCloseTo(containerWidth, -1); // within 10 px
    });
});

// ─── Page load ────────────────────────────────────────────────────────────────

test.describe('page load', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('has correct title', async ({ page }) => {
        await expect(page).toHaveTitle('DESC LAI Medication Standing Order Tool');
    });

    test('shows the form on load', async ({ page }) => {
        await expect(page.locator('.form-section')).toBeVisible();
    });

    test('does not show guidance section on load', async ({ page }) => {
        await expect(page.locator('.guidance-section')).not.toBeVisible();
    });

    test('shows the medication dropdown', async ({ page }) => {
        await expect(page.locator('#medication')).toBeVisible();
    });

    test('shows the disclaimer', async ({ page }) => {
        await expect(page.locator('.disclaimer')).toBeVisible();
    });

    test('includes protocol download link on page load', async ({ page }) => {
        const link = page.locator('.protocol-link a');
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', './docs/protocol.pdf');
        await expect(link).toHaveAttribute('download', 'DESC LAI Protocol.pdf');
        await expect(link).toHaveText('document');
    });
});

// ─── Field visibility ─────────────────────────────────────────────────────────

test.describe('conditional field visibility', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    const medFields: [string, string][] = [
        ['invega_sustenna',        'invega-sustenna-options'],
        ['invega_trinza',          'trinza-fields'],
        ['invega_hafyera',         'hafyera-fields'],
        ['abilify_maintena',       'abilify-fields'],
        ['aristada',               'aristada-fields'],
        ['uzedy',                  'uzedy-fields'],
        ['haloperidol_decanoate',  'haloperidol-fields'],
        ['fluphenazine_decanoate', 'fluphenazine-fields'],
        ['vivitrol',               'vivitrol-fields'],
        ['sublocade',              'sublocade-fields'],
        ['brixadi',                'brixadi-fields'],
    ];

    for (const [medication, fieldId] of medFields) {
        test(`${medication} + late shows #${fieldId}`, async ({ page }) => {
            await selectField(page, 'medication', medication);
            await selectField(page, 'guidance-type', 'late');
            await expect(page.locator(`#${fieldId}`)).toBeVisible();
        });

        test(`${medication} + early hides #${fieldId}`, async ({ page }) => {
            await selectField(page, 'medication', medication);
            await selectField(page, 'guidance-type', 'late');
            await expect(page.locator(`#${fieldId}`)).toBeVisible();

            await selectField(page, 'guidance-type', 'early');
            await expect(page.locator(`#${fieldId}`)).not.toBeVisible();
        });
    }

    test('invega_sustenna initiation shows date field', async ({ page }) => {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'initiation');
        await expect(page.locator('#first-injection-date')).toBeVisible();
        await expect(page.locator('#maintenance-fields')).not.toBeVisible();
    });

    test('invega_sustenna maintenance shows maintenance fields', async ({ page }) => {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'maintenance');
        await expect(page.locator('#maintenance-fields')).toBeVisible();
        await expect(page.locator('#first-injection-date')).not.toBeVisible();
    });

    test('switching medication hides previous medication fields', async ({ page }) => {
        await selectField(page, 'medication', 'invega_trinza');
        await selectField(page, 'guidance-type', 'late');
        await expect(page.locator('#trinza-fields')).toBeVisible();

        await selectField(page, 'medication', 'uzedy');
        await expect(page.locator('#trinza-fields')).not.toBeVisible();
        await expect(page.locator('#uzedy-fields')).toBeVisible();
    });
});

// ─── Early guidance flow ──────────────────────────────────────────────────────

test.describe('early guidance flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    // before-next only (single constraint)
    const beforeNextOnlyMeds = ['invega_trinza', 'invega_hafyera'];
    // dual-constraint: need both next-injection-date AND last-injection-date
    const dualConstraintMeds = ['invega_sustenna', 'aristada', 'uzedy', 'haloperidol_decanoate'];
    const sinceLastMeds = ['abilify_maintena', 'vivitrol'];
    for (const med of beforeNextOnlyMeds) {
        test(`${med}: shows guidance and hides form`, async ({ page }) => {
            await selectField(page, 'medication', med);
            await selectField(page, 'guidance-type', 'early');
            await fillDate(page, 'next-injection-date', daysFromNow(3));

            await expect(page.locator('.guidance-section')).toBeVisible();
            await expect(page.locator('.form-section')).not.toBeVisible();
        });
    }
    for (const med of dualConstraintMeds) {
        test(`${med}: shows guidance and hides form`, async ({ page }) => {
            await selectField(page, 'medication', med);
            await selectField(page, 'guidance-type', 'early');
            await fillDate(page, 'next-injection-date', daysFromNow(1));
            await fillDate(page, 'last-injection-date', daysAgo(25));

            await expect(page.locator('.guidance-section')).toBeVisible();
            await expect(page.locator('.form-section')).not.toBeVisible();
        });
    }

    for (const med of sinceLastMeds) {
        test(`${med}: shows guidance and hides form`, async ({ page }) => {
            await selectField(page, 'medication', med);
            await selectField(page, 'guidance-type', 'early');
            await fillDate(page, 'last-injection-date', daysAgo(25));

            await expect(page.locator('.guidance-section')).toBeVisible();
            await expect(page.locator('.form-section')).not.toBeVisible();
        });
    }
});

// ─── Late guidance flows ──────────────────────────────────────────────────────

// ─── Late guidance flows ──────────────────────────────────────────────────────

test.describe('late guidance — Invega Sustenna', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('initiation flow renders guidance section', async ({ page }) => {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'initiation');
        await fillDate(page, 'first-injection', daysAgo(30));

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('Invega Sustenna');
        await expect(page.locator('.guidance-content').first()).toBeVisible();
    });

    test('maintenance 234 mg flow renders guidance section', async ({ page }) => {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'maintenance');
        await fillDate(page, 'last-maintenance', daysAgo(50));
        await selectField(page, 'maintenance-dose', '234');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('234 mg');
    });

    test('maintenance 39-to-156 flow renders guidance section', async ({ page }) => {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'maintenance');
        await fillDate(page, 'last-maintenance', daysAgo(50));
        await selectField(page, 'maintenance-dose', '39-to-156');

        await expect(page.locator('.guidance-section')).toBeVisible();
    });
});

test.describe('late guidance — Invega Trinza', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('renders guidance section', async ({ page }) => {
        await selectField(page, 'medication', 'invega_trinza');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-trinza', daysAgo(100));
        await selectField(page, 'trinza-dose', '546');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('Invega Trinza');
        await expect(page.locator('.medication-info')).toContainText('546 mg');
    });
});

test.describe('late guidance — Invega Hafyera', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('on-time window: renders proceed guidance', async ({ page }) => {
        await selectField(page, 'medication', 'invega_hafyera');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-hafyera', daysAgo(190));

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Proceed with administering');
    });

    test('consult window: renders consult required guidance', async ({ page }) => {
        await selectField(page, 'medication', 'invega_hafyera');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-hafyera', daysAgo(210));

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('more than 6 months and 3 weeks after the last Hafyera dose');
        await expect(page.locator('.guidance-section')).toContainText('Consult provider prior to proceeding with any injection');
    });
});

test.describe('late guidance — Abilify Maintena', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('renders routine guidance for 3+ doses within window', async ({ page }) => {
        await selectField(page, 'medication', 'abilify_maintena');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-abilify', daysAgo(35));
        await selectField(page, 'abilify-doses', '3+');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('Abilify Maintena');
    });

    test('renders reinitiation guidance for 1-2 doses beyond window', async ({ page }) => {
        await selectField(page, 'medication', 'abilify_maintena');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-abilify', daysAgo(50));
        await selectField(page, 'abilify-doses', '1-2');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Re-initiate');
    });
});

test.describe('late guidance — Aristada', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('renders no supplementation for 662 mg within window', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(50));
        await selectField(page, 'aristada-dose', '662');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('No supplementation required');
    });

    test('renders 7-day oral supp for 441 mg slightly overdue', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(45));
        await selectField(page, 'aristada-dose', '441');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('7 days');
    });
});

test.describe('late guidance — Uzedy', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('renders guidance for 150-or-less dose', async ({ page }) => {
        await selectField(page, 'medication', 'uzedy');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-uzedy', daysAgo(35));
        await selectField(page, 'uzedy-dose', '150-or-less');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('Uzedy');
    });

    test('renders prescriber consult for 200-or-more dose very overdue', async ({ page }) => {
        await selectField(page, 'medication', 'uzedy');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-uzedy', daysAgo(200));
        await selectField(page, 'uzedy-dose', '200-or-more');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('contact prescriber');
    });
});

// ─── Early guidance — missing medications ────────────────────────────────────

test.describe('early guidance flow — remaining medications', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    // fluphenazine_decanoate is dual-constraint (daysBeforeDue + minDays)
    const dualConstraintMeds = ['fluphenazine_decanoate'];
    const sinceLastMeds  = ['sublocade', 'brixadi'];

    for (const med of dualConstraintMeds) {
        test(`${med}: shows guidance and hides form`, async ({ page }) => {
            await selectField(page, 'medication', med);
            await selectField(page, 'guidance-type', 'early');
            await fillDate(page, 'next-injection-date', daysFromNow(1));
            await fillDate(page, 'last-injection-date', daysAgo(25));

            await expect(page.locator('.guidance-section')).toBeVisible();
            await expect(page.locator('.form-section')).not.toBeVisible();
        });
    }

    for (const med of sinceLastMeds) {
        test(`${med}: shows guidance and hides form`, async ({ page }) => {
            await selectField(page, 'medication', med);
            await selectField(page, 'guidance-type', 'early');
            await fillDate(page, 'last-injection-date', daysAgo(25));

            await expect(page.locator('.guidance-section')).toBeVisible();
            await expect(page.locator('.form-section')).not.toBeVisible();
        });
    }
});

// ─── Late guidance — Haloperidol Decanoate ────────────────────────────────────

test.describe('late guidance — Haloperidol Decanoate', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('1-3 doses < 12 weeks: shows check-in guidance (200 mg threshold, 6-7 day check-in)', async ({ page }) => {
        await selectField(page, 'medication', 'haloperidol_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-haloperidol', daysAgo(60));
        await selectField(page, 'haloperidol-prior-doses', '1-3');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('Haloperidol Decanoate');
        await expect(page.locator('.guidance-section')).toContainText('200 mg or less');
        await expect(page.locator('.guidance-section')).toContainText('6–7 days');
    });

    test('4+ doses < 6 weeks: shows routine guidance (next injection 4 weeks)', async ({ page }) => {
        await selectField(page, 'medication', 'haloperidol_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-haloperidol', daysAgo(30));
        await selectField(page, 'haloperidol-prior-doses', '4+');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('4 weeks');
    });

    test('4+ doses 6-12 weeks: shows check-in guidance', async ({ page }) => {
        await selectField(page, 'medication', 'haloperidol_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-haloperidol', daysAgo(60));
        await selectField(page, 'haloperidol-prior-doses', '4+');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('200 mg or less');
    });

    test('> 12 weeks: shows consult-before-injection guidance', async ({ page }) => {
        await selectField(page, 'medication', 'haloperidol_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-haloperidol', daysAgo(90));
        await selectField(page, 'haloperidol-prior-doses', '1-3');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('BEFORE any injection');
    });
});

// ─── Late guidance — Fluphenazine Decanoate ───────────────────────────────────

test.describe('late guidance — Fluphenazine Decanoate', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('1-2 doses < 4 months: shows check-in guidance (50 mg threshold, 24 hours)', async ({ page }) => {
        await selectField(page, 'medication', 'fluphenazine_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-fluphenazine', daysAgo(90));
        await selectField(page, 'fluphenazine-prior-doses', '1-2');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('Fluphenazine Decanoate');
        await expect(page.locator('.guidance-section')).toContainText('50 mg or less');
        await expect(page.locator('.guidance-section')).toContainText('24 hours');
    });

    test('3+ doses < 6 weeks: shows routine guidance', async ({ page }) => {
        await selectField(page, 'medication', 'fluphenazine_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-fluphenazine', daysAgo(30));
        await selectField(page, 'fluphenazine-prior-doses', '3+');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('previously planned dosing interval');
    });

    test('3+ doses 6 weeks to 4 months: shows check-in guidance', async ({ page }) => {
        await selectField(page, 'medication', 'fluphenazine_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-fluphenazine', daysAgo(90));
        await selectField(page, 'fluphenazine-prior-doses', '3+');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('50 mg or less');
    });

    test('> 4 months: shows consult-before-injection guidance', async ({ page }) => {
        await selectField(page, 'medication', 'fluphenazine_decanoate');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-fluphenazine', daysAgo(130));
        await selectField(page, 'fluphenazine-prior-doses', '1-2');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('BEFORE any injection');
    });
});

// ─── Late guidance — Vivitrol ─────────────────────────────────────────────────

test.describe('late guidance — Vivitrol', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('OUD, 3-4 weeks: administer, no UDS required', async ({ page }) => {
        await selectField(page, 'medication', 'vivitrol');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-vivitrol', daysAgo(25));
        await selectField(page, 'vivitrol-indication', 'oud');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('Vivitrol');
        await expect(page.locator('.guidance-section')).toContainText('No UDS required');
    });

    test('OUD, 4-5 weeks: conditional on intentional fentanyl use report', async ({ page }) => {
        await selectField(page, 'medication', 'vivitrol');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-vivitrol', daysAgo(31));
        await selectField(page, 'vivitrol-indication', 'oud');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('intentional fentanyl use');
    });

    test('OUD, 5-8 weeks: UDS required', async ({ page }) => {
        await selectField(page, 'medication', 'vivitrol');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-vivitrol', daysAgo(45));
        await selectField(page, 'vivitrol-indication', 'oud');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('point-of-care UDS');
    });

    test('OUD, 8+ weeks: consult provider', async ({ page }) => {
        await selectField(page, 'medication', 'vivitrol');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-vivitrol', daysAgo(65));
        await selectField(page, 'vivitrol-indication', 'oud');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Consult provider before');
    });

    test('overdose prevention, 3-5 weeks: administer if no daily opioid use', async ({ page }) => {
        await selectField(page, 'medication', 'vivitrol');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-vivitrol', daysAgo(25));
        await selectField(page, 'vivitrol-indication', 'overdose-prevention');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('no intentional daily use');
    });

    test('overdose prevention, 8+ weeks: consult provider', async ({ page }) => {
        await selectField(page, 'medication', 'vivitrol');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-vivitrol', daysAgo(65));
        await selectField(page, 'vivitrol-indication', 'overdose-prevention');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Consult provider before');
    });

    test('< 3 weeks: shows not-yet-due message', async ({ page }) => {
        await selectField(page, 'medication', 'vivitrol');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-vivitrol', daysAgo(10));
        await selectField(page, 'vivitrol-indication', 'oud');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('not yet overdue');
    });
});

// ─── Late guidance — Sublocade ────────────────────────────────────────────────

test.describe('late guidance — Sublocade', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('100mg, < 5 weeks: administer regardless', async ({ page }) => {
        await selectField(page, 'medication', 'sublocade');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-sublocade', daysAgo(25));
        await selectField(page, 'sublocade-type', '100mg');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('Sublocade');
        await expect(page.locator('.guidance-section')).toContainText('Administer the next injection');
    });

    test('100mg, 5-6 weeks: conditional guidance with moderate dependence option', async ({ page }) => {
        await selectField(page, 'medication', 'sublocade');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-sublocade', daysAgo(38));
        await selectField(page, 'sublocade-type', '100mg');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('fentanyl dependence assessment');
        await expect(page.locator('.guidance-section')).toContainText('moderate fentanyl dependence');
    });

    test('100mg, 6-8 weeks: strict conditional guidance (no moderate option)', async ({ page }) => {
        await selectField(page, 'medication', 'sublocade');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-sublocade', daysAgo(48));
        await selectField(page, 'sublocade-type', '100mg');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('fentanyl dependence assessment');
    });

    test('100mg, 8+ weeks: consult prescriber', async ({ page }) => {
        await selectField(page, 'medication', 'sublocade');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-sublocade', daysAgo(60));
        await selectField(page, 'sublocade-type', '100mg');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Consult a prescriber in real-time');
    });

    test('300mg established, < 7 weeks: administer regardless', async ({ page }) => {
        await selectField(page, 'medication', 'sublocade');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-sublocade', daysAgo(45));
        await selectField(page, 'sublocade-type', '300mg-established');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Administer the next injection');
    });

    test('300mg established, 10+ weeks: consult prescriber', async ({ page }) => {
        await selectField(page, 'medication', 'sublocade');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-sublocade', daysAgo(75));
        await selectField(page, 'sublocade-type', '300mg-established');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Consult a prescriber in real-time');
    });
});

// ─── Late guidance — Brixadi ──────────────────────────────────────────────────

test.describe('late guidance — Brixadi', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('monthly-64, < 5 weeks: administer regardless', async ({ page }) => {
        await selectField(page, 'medication', 'brixadi');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-brixadi', daysAgo(25));
        await selectField(page, 'brixadi-type', 'monthly-64');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('Brixadi');
        await expect(page.locator('.guidance-section')).toContainText('Administer the next injection');
    });

    test('monthly-128, 5-6 weeks: conditional guidance with moderate dependence', async ({ page }) => {
        await selectField(page, 'medication', 'brixadi');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-brixadi', daysAgo(38));
        await selectField(page, 'brixadi-type', 'monthly-128');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('fentanyl dependence assessment');
        await expect(page.locator('.guidance-section')).toContainText('moderate fentanyl dependence');
    });

    test('monthly-96, 8+ weeks: consult prescriber', async ({ page }) => {
        await selectField(page, 'medication', 'brixadi');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-brixadi', daysAgo(60));
        await selectField(page, 'brixadi-type', 'monthly-96');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Consult a prescriber in real-time');
    });

    test('weekly, ≤ 9 days: administer per standing order', async ({ page }) => {
        await selectField(page, 'medication', 'brixadi');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-brixadi', daysAgo(7));
        await selectField(page, 'brixadi-type', 'weekly');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('9 days');
    });

    test('weekly, > 9 days: per prescriber guidance', async ({ page }) => {
        await selectField(page, 'medication', 'brixadi');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-brixadi', daysAgo(12));
        await selectField(page, 'brixadi-type', 'weekly');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('per prescriber guidance');
    });
});

// ─── Late guidance — Invega Trinza (additional doses & reinitiation) ──────────

test.describe('late guidance — Invega Trinza additional tiers', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('410 mg overdue: administer Sustenna 117 mg bridge', async ({ page }) => {
        await selectField(page, 'medication', 'invega_trinza');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-trinza', daysAgo(150));
        await selectField(page, 'trinza-dose', '410');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('410 mg');
        await expect(page.locator('.guidance-section')).toContainText('117 mg');
    });

    test('819 mg overdue: administer Sustenna 156 mg bridge', async ({ page }) => {
        await selectField(page, 'medication', 'invega_trinza');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-trinza', daysAgo(150));
        await selectField(page, 'trinza-dose', '819');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('819 mg');
        await expect(page.locator('.guidance-section')).toContainText('156 mg');
    });

    test('>270 days: shows reinitiation consult guidance', async ({ page }) => {
        await selectField(page, 'medication', 'invega_trinza');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-trinza', daysAgo(280));
        await selectField(page, 'trinza-dose', '546');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Reinitiation');
    });

    test('on-time window (90–120 days): administer usual dose', async ({ page }) => {
        await selectField(page, 'medication', 'invega_trinza');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-trinza', daysAgo(100));
        await selectField(page, 'trinza-dose', '546');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Administer next usual Invega Trinza dose');
    });
});

// ─── Late guidance — Invega Sustenna maintenance (additional tiers) ───────────

test.describe('late guidance — Invega Sustenna maintenance additional tiers', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('>180 days: shows reinitiation consult guidance', async ({ page }) => {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'maintenance');
        await fillDate(page, 'last-maintenance', daysAgo(190));
        await selectField(page, 'maintenance-dose', '234');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('reinitiation');
    });

    test('28–42 days: administer usual dose, schedule 4 weeks later', async ({ page }) => {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'maintenance');
        await fillDate(page, 'last-maintenance', daysAgo(38));
        await selectField(page, 'maintenance-dose', '234');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Administer usual Invega Sustenna dose');
    });
});

// ─── Late guidance — Abilify Maintena (additional tiers) ─────────────────────

test.describe('late guidance — Abilify Maintena additional tiers', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('3+ doses beyond 6-week window: shows reinitiation guidance', async ({ page }) => {
        await selectField(page, 'medication', 'abilify_maintena');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-abilify', daysAgo(56));
        await selectField(page, 'abilify-doses', '3+');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Re-initiate');
        await expect(page.locator('.guidance-section')).toContainText('Administer usual Abilify Maintena monthly dose');
        await expect(page.locator('.guidance-section')).toContainText('Notify patient of the options recommended for reinitiation');
    });

    test('< 4 weeks: shows not-due guidance', async ({ page }) => {
        await selectField(page, 'medication', 'abilify_maintena');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-abilify', daysAgo(20));
        await selectField(page, 'abilify-doses', '3+');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('not due');
    });
});

// ─── Late guidance — Aristada (additional doses & tiers) ─────────────────────

test.describe('late guidance — Aristada additional doses and tiers', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('882 mg within 56 days: no supplementation', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(50));
        await selectField(page, 'aristada-dose', '882');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('No supplementation required');
    });

    test('882 mg 57–84 days: 7-day supplementation', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(70));
        await selectField(page, 'aristada-dose', '882');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('7 days');
    });

    test('882 mg >84 days: 21-day supplementation', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(100));
        await selectField(page, 'aristada-dose', '882');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('21 days');
    });

    test('1064 mg within 70 days: no supplementation', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(65));
        await selectField(page, 'aristada-dose', '1064');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('No supplementation required');
    });

    test('1064 mg 71–84 days: 7-day supplementation', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(78));
        await selectField(page, 'aristada-dose', '1064');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('7 days');
    });

    test('1064 mg >84 days: 21-day supplementation', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(95));
        await selectField(page, 'aristada-dose', '1064');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('21 days');
    });

    test('441 mg >49 days: 21-day supplementation', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(60));
        await selectField(page, 'aristada-dose', '441');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('21 days');
    });

    test('662 mg >84 days: 21-day supplementation', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(90));
        await selectField(page, 'aristada-dose', '662');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('21 days');
    });

    test('< 28 days: shows not-yet-due message', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(20));
        await selectField(page, 'aristada-dose', '662');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('not yet due');
    });
});

// ─── Late guidance — Uzedy (additional tiers) ────────────────────────────────

test.describe('late guidance — Uzedy additional tiers', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('< 28 days: shows not-yet-due message', async ({ page }) => {
        await selectField(page, 'medication', 'uzedy');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-uzedy', daysAgo(20));
        await selectField(page, 'uzedy-dose', '150-or-less');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('not yet due');
    });

    test('28–119 days: administer usual dose, routine window', async ({ page }) => {
        await selectField(page, 'medication', 'uzedy');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-uzedy', daysAgo(60));
        await selectField(page, 'uzedy-dose', '150-or-less');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Administer usual Uzedy maintenance dose');
    });

    test('120–180 days: administer with sedation check-in', async ({ page }) => {
        await selectField(page, 'medication', 'uzedy');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-uzedy', daysAgo(150));
        await selectField(page, 'uzedy-dose', '200-or-more');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('sedation');
    });
});

// ─── Start Over ───────────────────────────────────────────────────────────────

test.describe('start over', () => {
    test('restores the form and clears all fields', async ({ page }) => {
        await page.goto('/');
        await selectField(page, 'medication', 'uzedy');
        await selectField(page, 'guidance-type', 'early');
        await fillDate(page, 'next-injection-date', daysFromNow(1));
        await fillDate(page, 'last-injection-date', daysAgo(25));

        await expect(page.locator('.guidance-section')).toBeVisible();

        await page.click('button:has-text("Start Over")');

        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await expect(page.locator('.form-section')).toBeVisible();
        await expect(page.locator('#medication')).toHaveValue('');
        await expect(page.locator('input[name="guidance-type"]:checked')).toHaveCount(0);
    });

    test('can submit another query after starting over', async ({ page }) => {
        await page.goto('/');
        await selectField(page, 'medication', 'uzedy');
        await selectField(page, 'guidance-type', 'early');
        await fillDate(page, 'next-injection-date', daysFromNow(1));
        await fillDate(page, 'last-injection-date', daysAgo(25));
        await page.click('button:has-text("Start Over")');

        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'early');
        await fillDate(page, 'next-injection-date', daysFromNow(1));
        await fillDate(page, 'last-injection-date', daysAgo(25));

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('Aristada');
    });
});

// ─── Late guidance — Invega Sustenna initiation tiers ────────────────────────

test.describe('late guidance — Invega Sustenna initiation tiers', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    async function submitInitiation(page: Page, daysSinceFirst: number): Promise<void> {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'initiation');
        await fillDate(page, 'first-injection', daysAgo(daysSinceFirst));
    }

    // Tier 1: ≤12 days
    test('10 days: tier 1 — not significantly overdue', async ({ page }) => {
        await submitInitiation(page, 10);
        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('not significantly overdue');
    });

    // Tier 2: 13–28 days
    test('20 days: tier 2 — administer 156 mg + arrange 117 mg', async ({ page }) => {
        await submitInitiation(page, 20);
        await expect(page.locator('.guidance-section')).toContainText('117 mg');
    });

    // Tier 1 vs Tier 2 distinction
    test('10 days does NOT show 117 mg (tier 1, not tier 2)', async ({ page }) => {
        await submitInitiation(page, 10);
        await expect(page.locator('.guidance-section')).not.toContainText('117 mg');
    });

    // Tier 3: 29–49 days
    test('35 days: tier 3 — administer 156 mg + arrange 2nd 156 mg 1 week later', async ({ page }) => {
        await submitInitiation(page, 35);
        await expect(page.locator('.guidance-section')).toContainText('2nd 156 mg injection');
    });

    // Tier 2 vs Tier 3 distinction
    test('20 days does NOT show 2nd 156 mg (tier 2, not tier 3)', async ({ page }) => {
        await submitInitiation(page, 20);
        await expect(page.locator('.guidance-section')).not.toContainText('2nd 156 mg injection');
    });

    // Tier 4: 50–120 days (>7 weeks to 4 months)
    test('100 days: tier 4 — restart initiation with 234 mg', async ({ page }) => {
        await submitInitiation(page, 100);
        await expect(page.locator('.guidance-section')).toContainText('Restart initiation');
    });

    // Tier 5: >120 days (>4 months)
    test('130 days: tier 5 — consult provider before proceeding', async ({ page }) => {
        await submitInitiation(page, 130);
        await expect(page.locator('.guidance-section')).toContainText('Consult provider to get orders');
    });

    test('200 days: tier 5 — consult provider before proceeding', async ({ page }) => {
        await submitInitiation(page, 200);
        await expect(page.locator('.guidance-section')).toContainText('Consult provider to get orders');
    });

    // Tier 4 vs Tier 5 distinction
    test('100 days does NOT show consult guidance (tier 4, not tier 5)', async ({ page }) => {
        await submitInitiation(page, 100);
        await expect(page.locator('.guidance-section')).not.toContainText('Consult provider to get orders');
    });
});

// ─── Late guidance — Invega Sustenna maintenance tiers (full coverage) ────────

test.describe('late guidance — Invega Sustenna maintenance tiers', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    async function submitMaintenance(page: Page, daysSinceLast: number, dose: string): Promise<void> {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'maintenance');
        await fillDate(page, 'last-maintenance', daysAgo(daysSinceLast));
        await selectField(page, 'maintenance-dose', dose);
    }

    // Tier 1: ≤27 days
    test('20 days: tier 1 — not significantly overdue', async ({ page }) => {
        await submitMaintenance(page, 20, '234');
        await expect(page.locator('.guidance-section')).toContainText('not significantly overdue');
    });

    // Tier 1 vs Tier 2 distinction
    test('20 days does NOT show usual dose / 4-week schedule (tier 1, not tier 2)', async ({ page }) => {
        await submitMaintenance(page, 20, '234');
        await expect(page.locator('.guidance-section')).not.toContainText('4 weeks later');
    });

    // Tier 2: 28–42 days
    test('35 days, 234 mg: tier 2 — administer usual dose, schedule 4 weeks later', async ({ page }) => {
        await submitMaintenance(page, 35, '234');
        await expect(page.locator('.guidance-section')).toContainText('Administer usual Invega Sustenna dose');
    });

    // Tier 3: 43–120 days — 39-to-156
    test('100 days, 39-to-156: tier 3 — arrange 2nd usual maintenance dose 1 week later', async ({ page }) => {
        await submitMaintenance(page, 100, '39-to-156');
        await expect(page.locator('.guidance-section')).toContainText('2nd usual maintenance dose');
    });

    // Tier 3: 43–120 days — 234 mg
    test('100 days, 234 mg: tier 3 — administer 156 mg + arrange 2nd 156 mg', async ({ page }) => {
        await submitMaintenance(page, 100, '234');
        await expect(page.locator('.guidance-section')).toContainText('Administer 156 mg Invega Sustenna');
    });

    // Tier 2 vs Tier 3 distinction (234 mg)
    test('35 days, 234 mg does NOT trigger 2-injection re-load (tier 2, not tier 3)', async ({ page }) => {
        await submitMaintenance(page, 35, '234');
        await expect(page.locator('.guidance-section')).not.toContainText('Administer 156 mg Invega Sustenna');
    });

    // Tier 4: >120 days
    test('200 days, 234 mg: tier 4 — consult provider, reinitiation needed', async ({ page }) => {
        await submitMaintenance(page, 200, '234');
        await expect(page.locator('.guidance-section')).toContainText('reinitiation');
    });

    test('200 days, 39-to-156: tier 4 — consult provider, reinitiation needed', async ({ page }) => {
        await submitMaintenance(page, 200, '39-to-156');
        await expect(page.locator('.guidance-section')).toContainText('reinitiation');
    });
});
