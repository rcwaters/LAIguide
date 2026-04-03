import { test, expect, Page } from '@playwright/test';

// Set by global-setup.ts when a local .env with ADMIN_PAT is present.
// Used to skip tests that are not verifiable against the live GitHub store.
const HAS_GITHUB_TOKEN = !!process.env.HAS_GITHUB_TOKEN;

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
        await expect(page).toHaveTitle('Change Log');
    });

    test('shows the changelog table headers', async ({ page }) => {
        await expect(page.locator('thead')).toContainText('Date');
        await expect(page.locator('thead')).toContainText('Email');
        await expect(page.locator('thead')).toContainText('Action');
        await expect(page.locator('thead')).toContainText('Medication');
        await expect(page.locator('thead')).not.toContainText('Key');
    });

    test('action header shows "(click to expand)" hint', async ({ page }) => {
        const actionTh = page.locator('thead th', { hasText: 'Action' });
        await expect(actionTh.locator('.th-hint')).toHaveText('(click to expand)');
    });

    test('shows empty state message when no changes recorded', async ({ page }) => {
        test.skip(
            HAS_GITHUB_TOKEN || !process.env.CI,
            'Empty state only verifiable in CI where the store is guaranteed empty',
        );
        // Explicitly remove the changelog key and reload so this test is not
        // sensitive to any state written between localStorage.clear() and now.
        await page.evaluate(() => localStorage.removeItem('lai_local_changelog'));
        await page.reload();
        await expect(page.locator('#changelog-status')).toHaveText(
            'No changes have been recorded yet.',
        );
    });

    test('has a Back to Admin Portal link', async ({ page }) => {
        const backLink = page.locator('a[href="./admin.html"]');
        await expect(backLink).toBeVisible();
        await expect(backLink).toHaveText('Admin Portal');
    });

    test('Back to Admin Portal link navigates back', async ({ page }) => {
        await page.click('a[href="./admin.html"]');
        await expect(page).toHaveURL(/admin\.html/);
    });
});

// ─── Save → changelog persistence ─────────────────────────────────────────
// These tests are skipped: appendChangelog only runs when a GitHub token is
// present, so the local store never records entries.

test.describe('changelog persistence — save in admin then view changelog', () => {
    test.skip(
        true,
        'Local changelog disabled — appendChangelog only runs with GitHub token',
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

        // Should show at least one main row (excludes hidden detail rows)
        const rows = page.locator('#changelog-tbody tr:not(.changelog-details)');
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

        const rows = page.locator('#changelog-tbody tr:not(.changelog-details)');
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

        await expect(page.locator('#changelog-tbody tr:not(.changelog-details)')).toHaveCount(2);
    });

    test('saved medication shows expandable "Updated N items" badge', async ({ page }) => {
        await login(page);

        const medSelect = page.locator('#med-select');
        await medSelect.selectOption({ index: 1 });
        await expect(page.locator('#form-editor')).not.toBeEmpty();
        await page.click('#save-btn');
        await expect(page.locator('#top-status')).toContainText('Saved');

        await page.goto('/changelog.html');

        const badge = page.locator('.action-badge').first();
        await expect(badge).toContainText('Updated');
        // The badge text should indicate a count of items changed
        await expect(badge).toHaveAttribute('data-expandable', 'true');
    });

    test('clicking expandable badge reveals change detail row', async ({ page }) => {
        await login(page);

        const medSelect = page.locator('#med-select');
        await medSelect.selectOption({ index: 1 });
        await expect(page.locator('#form-editor')).not.toBeEmpty();
        await page.click('#save-btn');
        await expect(page.locator('#top-status')).toContainText('Saved');

        await page.goto('/changelog.html');

        const badge = page.locator('.action-badge[data-expandable]').first();
        // Detail row should be hidden before click
        const detailRow = page.locator('.changelog-details').first();
        await expect(detailRow).not.toHaveClass(/open/);

        await badge.click();
        await expect(detailRow).toHaveClass(/open/);

        // Clicking again collapses it
        await badge.click();
        await expect(detailRow).not.toHaveClass(/open/);
    });

    test('restore bar is visible on changelog page', async ({ page }) => {
        await login(page);
        await page.goto('/changelog.html');
        await expect(page.locator('#restore-bar')).toBeVisible();
        await expect(page.locator('#restore-time')).toBeVisible();
        await expect(page.locator('#restore-btn')).toBeVisible();
    });

    test('restore dropdown includes "Default data" option', async ({ page }) => {
        await login(page);
        await page.goto('/changelog.html');
        const defaultOption = page.locator('#restore-time option[value="__default__"]');
        await expect(defaultOption).toBeAttached();
        await expect(defaultOption).toHaveText('Default data (original bundled JSON)');
    });

    test('restore entry appears in changelog after restore', async ({ page }) => {
        await login(page);

        // Save a med first to create a save point
        const medSelect = page.locator('#med-select');
        await medSelect.selectOption({ index: 1 });
        await expect(page.locator('#form-editor')).not.toBeEmpty();
        await page.click('#save-btn');
        await expect(page.locator('#top-status')).toContainText('Saved');

        await page.goto('/changelog.html');

        // Restore to default data
        await page.locator('#restore-time').selectOption('__default__');
        page.on('dialog', (dialog) => dialog.accept());
        await page.locator('#restore-btn').click();

        await expect(page.locator('#changelog-status')).toContainText('Restored');

        // A "Restored" badge should now appear at the top
        const firstBadge = page.locator('.action-badge').first();
        await expect(firstBadge).toContainText('Restored');
    });
});
