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
    test('shows Change Log link after login', async ({ page }) => {
        await login(page);
        await expect(page.locator('a[href="./changelog.html"]')).toBeVisible();
        await expect(page.locator('a[href="./changelog.html"]')).toHaveText('Change Log');
    });

    test('Change Log link navigates to changelog page', async ({ page }) => {
        await login(page);
        await page.click('a[href="./changelog.html"]');
        await expect(page).toHaveURL(/changelog\.html/);
    });
});

// ─── Changelog page ───────────────────────────────────────────────────────

test.describe('changelog page — authenticated', () => {
    test.beforeEach(async ({ page }) => {
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
