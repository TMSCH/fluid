import { test, expect, type Page } from '@playwright/test';

// Use real OpenAI API key from environment
const API_KEY = process.env.OPEN_API_KEY || '';
// Use local CORS proxy to avoid browser CORS issues with OpenAI API
const PROXY_BASE_URL = 'http://localhost:3001/v1';

if (!API_KEY) {
  console.warn('WARNING: OPEN_API_KEY not set. Tests will fail without a real API key.');
}

/** Helper to set up the app with the real API key via local proxy */
async function setupWithApiKey(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('api-key-input')).toBeVisible({ timeout: 20_000 });

  // Inject the proxy base URL into the app's global config before entering the key
  await page.evaluate((baseUrl) => {
    (window as unknown as Record<string, unknown>).__FLUID_BASE_URL = baseUrl;
  }, PROXY_BASE_URL);

  await page.getByTestId('api-key-input').fill(API_KEY);
  await page.getByTestId('save-api-key').click();
  await expect(page.getByTestId('create-project-input')).toBeVisible({ timeout: 10_000 });
}

/** Helper to create a todo project via real LLM and wait for it to render */
async function createTodoProject(page: Page) {
  await page.getByTestId('create-project-input').fill('Make me a simple todo list app');
  await page.getByTestId('create-project-button').click();
  // Real LLM call — give it up to 90s
  await expect(page.getByTestId('dsl-screen')).toBeVisible({ timeout: 90_000 });
}

test.describe('Fluid Mini-App Runtime — Real LLM E2E', () => {
  test.setTimeout(180_000);

  test.describe('Setup Flow', () => {
    test('should show the API key setup screen initially', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByTestId('api-key-input')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('save-api-key')).toBeVisible();
      await expect(page.getByText('Fluid')).toBeVisible();
      await expect(page.getByText('Create personal tools by chatting')).toBeVisible();
    });

    test('should accept API key and show the project list', async ({ page }) => {
      await setupWithApiKey(page);
      await expect(page.getByText('Your personal mini-apps')).toBeVisible();
    });
  });

  test.describe('Todo App — Full Flow with Real LLM', () => {
    test.beforeEach(async ({ page }) => {
      page.on('dialog', async (d) => {
        console.log('Dialog:', d.message());
        await d.accept();
      });
      await setupWithApiKey(page);
    });

    test('should create a todo list project via real LLM', async ({ page }) => {
      await createTodoProject(page);

      // The LLM should have generated a screen with some todo-related UI
      await expect(page.getByTestId('dsl-screen')).toBeVisible();

      // Should have at least one interactive element (input, button, or form)
      const hasInput = await page.locator('[data-testid^="input-"]').count();
      const hasButton = await page.locator('[data-testid^="button-"]').count();
      const hasForm = await page.locator('[data-testid^="form-"]').count();
      expect(hasInput + hasButton + hasForm).toBeGreaterThan(0);
    });

    test('should add a todo item via form submission', async ({ page }) => {
      await createTodoProject(page);

      // Find the first text input and type a todo
      const input = page.locator('[data-testid^="input-"]').first();
      await expect(input).toBeVisible({ timeout: 5_000 });
      await input.fill('Buy groceries');

      // Find and click the submit/add button
      const submitButton = page.locator('[data-testid^="button-"]').first();
      await submitButton.click();

      // Wait for LLM to process and return updated UI with the todo
      await expect(page.getByText('Buy groceries')).toBeVisible({ timeout: 90_000 });
    });

    test('should navigate between App, Chat, and History views', async ({ page }) => {
      await createTodoProject(page);

      // Switch to Chat view
      await page.getByTestId('mode-chat').click();
      await expect(page.getByTestId('chat-messages')).toBeVisible();
      await expect(page.getByTestId('chat-input')).toBeVisible();

      // There should be at least one assistant message from creation
      await expect(page.locator('[data-testid="chat-message-assistant"]').first()).toBeVisible();

      // Switch to History view
      await page.getByTestId('mode-history').click();
      await expect(page.getByTestId('history-list')).toBeVisible();
      await expect(page.getByText(/Version History/)).toBeVisible();
      await expect(page.getByText('v1', { exact: true })).toBeVisible();

      // Switch back to App view
      await page.getByTestId('mode-app').click();
      await expect(page.getByTestId('dsl-screen')).toBeVisible();
    });

    test('should send a chat message and get LLM response', async ({ page }) => {
      await createTodoProject(page);

      // Switch to chat
      await page.getByTestId('mode-chat').click();
      const initialCount = await page.locator('[data-testid="chat-message-assistant"]').count();

      await page.getByTestId('chat-input').fill('Add a task called "Walk the dog"');
      await page.getByTestId('chat-send-button').click();

      // Wait for a new assistant message to appear
      await expect(async () => {
        const newCount = await page.locator('[data-testid="chat-message-assistant"]').count();
        expect(newCount).toBeGreaterThan(initialCount);
      }).toPass({ timeout: 90_000 });

      // Switch to app and check if the todo was added
      await page.getByTestId('mode-app').click();
      await expect(page.getByText('Walk the dog')).toBeVisible({ timeout: 10_000 });
    });

    test('should build version history after interactions', async ({ page }) => {
      await createTodoProject(page);

      // Do a form interaction to create v2
      const input = page.locator('[data-testid^="input-"]').first();
      await expect(input).toBeVisible({ timeout: 5_000 });
      await input.fill('Read a book');
      const submitButton = page.locator('[data-testid^="button-"]').first();
      await submitButton.click();

      // Wait for LLM response
      await expect(page.getByText('Read a book')).toBeVisible({ timeout: 90_000 });

      // Check history
      await page.getByTestId('mode-history').click();
      await expect(page.getByText('v1', { exact: true })).toBeVisible();
      await expect(page.getByText('v2', { exact: true })).toBeVisible();
    });
  });
});
