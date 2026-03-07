import { test, expect, Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
}

async function selectField(page: Page, id: string, value: string): Promise<void> {
    await page.selectOption(`#${id}`, value);
}

async function fillDate(page: Page, id: string, value: string): Promise<void> {
    await page.fill(`#${id}`, value);
}

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
});

// ─── Field visibility ─────────────────────────────────────────────────────────

test.describe('conditional field visibility', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    const medFields: [string, string][] = [
        ['invega_sustenna',  'invega-sustenna-options'],
        ['invega_trinza',    'trinza-fields'],
        ['invega_hafyera',   'hafyera-fields'],
        ['abilify_maintena', 'abilify-fields'],
        ['aristada',         'aristada-fields'],
        ['uzedy',            'uzedy-fields'],
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

// ─── Validation ───────────────────────────────────────────────────────────────

test.describe('form validation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    async function expectAlert(page: Page, trigger: () => Promise<void>, expectedMessage: string): Promise<void> {
        let message = '';
        page.once('dialog', async dialog => {
            message = dialog.message();
            await dialog.dismiss();
        });
        await trigger();
        expect(message).toBe(expectedMessage);
    }

    test('alerts when no medication selected', async ({ page }) => {
        await expectAlert(
            page,
            () => page.click('button:has-text("Submit")'),
            'Please select a medication.',
        );
    });

    test('alerts when no guidance type selected', async ({ page }) => {
        await selectField(page, 'medication', 'uzedy');
        await expectAlert(
            page,
            () => page.click('button:has-text("Submit")'),
            'Please select a guidance type.',
        );
    });

    test('uzedy + late: alerts when no date entered', async ({ page }) => {
        await selectField(page, 'medication', 'uzedy');
        await selectField(page, 'guidance-type', 'late');
        await expectAlert(
            page,
            () => page.click('button:has-text("Submit")'),
            'Please enter the date of last Uzedy injection.',
        );
    });

    test('uzedy + late: alerts when no dose selected', async ({ page }) => {
        await selectField(page, 'medication', 'uzedy');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-uzedy', daysAgo(35));
        await expectAlert(
            page,
            () => page.click('button:has-text("Submit")'),
            'Please select the Uzedy maintenance dose.',
        );
    });

    test('aristada + late: alerts when no dose selected', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(50));
        await expectAlert(
            page,
            () => page.click('button:has-text("Submit")'),
            'Please select the dose of last Aristada injection.',
        );
    });
});

// ─── Early guidance flow ──────────────────────────────────────────────────────

test.describe('early guidance flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    const medications = [
        'invega_sustenna', 'invega_trinza', 'invega_hafyera',
        'abilify_maintena', 'aristada', 'uzedy',
        'haloperidol_decanoate', 'vivitrol',
    ];

    for (const med of medications) {
        test(`${med}: shows guidance and hides form`, async ({ page }) => {
            await selectField(page, 'medication', med);
            await selectField(page, 'guidance-type', 'early');
            await page.click('button:has-text("Submit")');

            await expect(page.locator('.guidance-section')).toBeVisible();
            await expect(page.locator('.form-section')).not.toBeVisible();
        });
    }
});

// ─── Late guidance flows ──────────────────────────────────────────────────────

test.describe('late guidance — Invega Sustenna', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('initiation flow renders guidance section', async ({ page }) => {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'initiation');
        await fillDate(page, 'first-injection', daysAgo(30));
        await page.click('button:has-text("Submit")');

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
        await page.click('button:has-text("Submit")');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('234 mg');
    });

    test('maintenance 156-or-less flow renders guidance section', async ({ page }) => {
        await selectField(page, 'medication', 'invega_sustenna');
        await selectField(page, 'guidance-type', 'late');
        await selectField(page, 'invega-type', 'maintenance');
        await fillDate(page, 'last-maintenance', daysAgo(50));
        await selectField(page, 'maintenance-dose', '156-or-less');
        await page.click('button:has-text("Submit")');

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
        await page.click('button:has-text("Submit")');

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
        await page.click('button:has-text("Submit")');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('Proceed with administering');
    });

    test('consult window: renders consult required guidance', async ({ page }) => {
        await selectField(page, 'medication', 'invega_hafyera');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-hafyera', daysAgo(210));
        await page.click('button:has-text("Submit")');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('CONSULT PROVIDER REQUIRED');
    });
});

test.describe('late guidance — Abilify Maintena', () => {
    test.beforeEach(async ({ page }) => { await page.goto('/'); });

    test('renders routine guidance for 3+ doses within window', async ({ page }) => {
        await selectField(page, 'medication', 'abilify_maintena');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-abilify', daysAgo(35));
        await selectField(page, 'abilify-doses', '3+');
        await page.click('button:has-text("Submit")');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('Abilify Maintena');
    });

    test('renders reinitiation guidance for 1-2 doses beyond window', async ({ page }) => {
        await selectField(page, 'medication', 'abilify_maintena');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-abilify', daysAgo(50));
        await selectField(page, 'abilify-doses', '1-2');
        await page.click('button:has-text("Submit")');

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
        await page.click('button:has-text("Submit")');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('No supplementation required');
    });

    test('renders 7-day oral supp for 441 mg slightly overdue', async ({ page }) => {
        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-aristada', daysAgo(45));
        await selectField(page, 'aristada-dose', '441');
        await page.click('button:has-text("Submit")');

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
        await page.click('button:has-text("Submit")');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('Uzedy');
    });

    test('renders prescriber consult for 200-or-more dose very overdue', async ({ page }) => {
        await selectField(page, 'medication', 'uzedy');
        await selectField(page, 'guidance-type', 'late');
        await fillDate(page, 'last-uzedy', daysAgo(200));
        await selectField(page, 'uzedy-dose', '200-or-more');
        await page.click('button:has-text("Submit")');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.guidance-section')).toContainText('contact prescriber');
    });
});

// ─── Start Over ───────────────────────────────────────────────────────────────

test.describe('start over', () => {
    test('restores the form and clears all fields', async ({ page }) => {
        await page.goto('/');
        await selectField(page, 'medication', 'uzedy');
        await selectField(page, 'guidance-type', 'early');
        await page.click('button:has-text("Submit")');

        await expect(page.locator('.guidance-section')).toBeVisible();

        await page.click('button:has-text("Start Over")');

        await expect(page.locator('.guidance-section')).not.toBeVisible();
        await expect(page.locator('.form-section')).toBeVisible();
        await expect(page.locator('#medication')).toHaveValue('');
        await expect(page.locator('#guidance-type')).toHaveValue('');
    });

    test('can submit another query after starting over', async ({ page }) => {
        await page.goto('/');
        await selectField(page, 'medication', 'uzedy');
        await selectField(page, 'guidance-type', 'early');
        await page.click('button:has-text("Submit")');
        await page.click('button:has-text("Start Over")');

        await selectField(page, 'medication', 'aristada');
        await selectField(page, 'guidance-type', 'early');
        await page.click('button:has-text("Submit")');

        await expect(page.locator('.guidance-section')).toBeVisible();
        await expect(page.locator('.medication-info')).toContainText('Aristada');
    });
});
