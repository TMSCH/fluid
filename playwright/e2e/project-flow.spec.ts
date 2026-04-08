import { test, expect } from '@playwright/test';

test.describe('Fluid Mini-App Runtime', () => {
  test('should show the home screen with setup prompt when no API key', async ({ page }) => {
    await page.goto('/');
    // Should show the API key setup screen
    await expect(page.getByTestId('api-key-input')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('save-api-key')).toBeVisible();
  });

  test('should accept an API key and show the create project screen', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('api-key-input').fill('sk-test-key-for-e2e');
    await page.getByTestId('save-api-key').click();

    // After entering API key, should see the create input
    await expect(page.getByTestId('create-project-input')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Your personal mini-apps')).toBeVisible();
  });

  test('should show empty state when no projects exist', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('api-key-input').fill('sk-test-key-for-e2e');
    await page.getByTestId('save-api-key').click();

    await expect(page.getByText('No projects yet')).toBeVisible({ timeout: 10_000 });
  });
});
