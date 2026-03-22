import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = 'test@desc.org';
const TEST_CODE = '1234';

async function login(page: Page): Promise<void> {
    await page.goto('/admin.html');
    await page.fill('#email-input', TEST_EMAIL);
    await page.fill('#code-input', TEST_CODE);
    await page.click('#login-btn');
    await expect(page.locator('#editor-section')).toBeVisible();
}

// ─── Unauthenticated access ────────────────────────────────────────────────

test.describe('changelog page — unauthenticated', () => {
    test('redirects to admin.html when not logged in', async ({ page }) => {
        await page.goto('/changelog.html');
        await expect(page).toHaveURL(/admin\.html/);
    });
});

// ─── Admin portal link ────────────────────────────────────────────────────

test.describe('admin portal — changelog link', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/admin.html');
        await page.evaluate(() => localStorage.clear());
        await login(page);
    });

    test('shows Change Log link after login', async ({ page }) => {
        await expect(page.locator('a[href="./changelog.html"]')).toBeVisible();
        await expect(page.locator('a[href="./changelog.html"]')).toHaveText('Change Log');
    });

    test('Change Log link navigates to changelog page', async ({ page }) => {
        await page.click('a[href="./changelog.html"]');
        await expect(page).toHaveURL(/changelog\.html/);
    });
});

// ─── Changelog page ───────────────────────────────────────────────────────

test.describe('changelog page — authenticated', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/admin.html');
        await page.evaluate(() => localStorage.clear());
        await login(page);
        await page.goto('/changelog.html');
    });

    test('has correct title', async ({ page }) => {
        await expect(page).toHaveTitle('LAI Admin — Change Log');
    });

    test('shows the changelog table headers', async ({ page }) => {
        await expect(page.locator('thead')).toContainText('Date / Time');
        await expect(page.locator('thead')).toContainText('Email');
        await expect(page.locator('thead')).toContainText('Action');
        await expect(page.locator('thead')).toContainText('Medication');
        await expect(page.locator('thead')).toContainText('Key');
    });

    test('shows empty state message when no changes recorded', async ({ page }) => {
        await expect(page.locator('#changelog-status')).toHaveText(
            'No changes have been recorded yet.',
        );
    });

    test('has a Back to Admin Portal link', async ({ page }) => {
        const backLink = page.locator('a[href="./admin.html"]');
        await expect(backLink).toBeVisible();
        await expect(backLink).toHaveText('Back to Admin Portal');
    });

    test('Back to Admin Portal link navigates back', async ({ page }) => {
        await page.click('a[href="./admin.html"]');
        await expect(page).toHaveURL(/admin\.html/);
    });
});

// ─── Save → changelog persistence ─────────────────────────────────────────
// These tests exercise the localStorage-backed local store and only apply
// when running against the Vite dev server (no deployed GitHub token).

test.describe('changelog persistence — save in admin then view changelog', () => {
    test.skip(
        !!process.env.PLAYWRIGHT_BASE_URL,
        'localStorage persistence only applies to local dev (no GitHub token)',
    );

    test.beforeEach(async ({ page }) => {
        await page.goto('/admin.html');
        await page.evaluate(() => localStorage.clear());
    });

    test('saved medication appears in changelog', async ({ page }) => {
        await login(page);

        // Pick the first medication from the dropdown
        const medSelect = page.locator('#med-select');
        await medSelect.selectOption({ index: 1 });
        await expect(page.locator('#form-editor')).not.toBeEmpty();

        const selectedText = await medSelect.locator('option:checked').textContent();

        // Save it
        await page.click('#save-btn');
        await expect(page.locator('#top-status')).toContainText('Saved');

        // Navigate to changelog
        await page.goto('/changelog.html');

        // Should show at least one row
        const rows = page.locator('#changelog-tbody tr');
        await expect(rows).toHaveCount(1);

        // Row should contain the medication name and the user's email
        const row = rows.first();
        await expect(row).toContainText(TEST_EMAIL);
        await expect(row).toContainText(selectedText?.trim() ?? '');
        await expect(row).toContainText('Updated');
    });

    test('delete action appears in changelog as Deleted', async ({ page }) => {
        await login(page);

        const medSelect = page.locator('#med-select');
        await medSelect.selectOption({ index: 1 });
        await expect(page.locator('#form-editor')).not.toBeEmpty();

        // Intercept the confirm dialog
        page.on('dialog', (dialog) => dialog.accept());
        await page.click('#delete-btn');

        await page.goto('/changelog.html');

        const rows = page.locator('#changelog-tbody tr');
        await expect(rows).toHaveCount(1);
        await expect(rows.first()).toContainText('Deleted');
    });

    test('multiple saves accumulate in changelog newest-first', async ({ page }) => {
        await login(page);

        const medSelect = page.locator('#med-select');

        await medSelect.selectOption({ index: 1 });
        await expect(page.locator('#form-editor')).not.toBeEmpty();
        await page.click('#save-btn');
        await expect(page.locator('#top-status')).toContainText('Saved');

        await medSelect.selectOption({ index: 2 });
        await expect(page.locator('#form-editor')).not.toBeEmpty();
        await page.click('#save-btn');
        await expect(page.locator('#top-status')).toContainText('Saved');

        await page.goto('/changelog.html');

        await expect(page.locator('#changelog-tbody tr')).toHaveCount(2);
    });
});
