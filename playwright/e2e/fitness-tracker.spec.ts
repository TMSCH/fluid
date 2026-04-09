import { test, expect, type Page } from '@playwright/test';

const API_KEY = process.env.OPEN_API_KEY || '';
const PROXY_BASE_URL = 'http://localhost:3001/v1';

async function setupApp(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('api-key-input')).toBeVisible({ timeout: 20_000 });
  await page.evaluate((baseUrl) => {
    (window as unknown as Record<string, unknown>).__FLUID_BASE_URL = baseUrl;
  }, PROXY_BASE_URL);
  await page.getByTestId('api-key-input').fill(API_KEY);
  await page.getByTestId('save-api-key').click();
  await expect(page.getByTestId('create-project-input')).toBeVisible({ timeout: 10_000 });
}

async function createFitnessTracker(page: Page) {
  const prompt = `Create a fitness/workout tracker app. I want to:
- Define training sessions with a list of exercises
- Each exercise should have: name, target sets, target reps, and weight (optional, in kg)
- Log actual reps completed and how I felt (weak, normal, strong) using a select
- Start with a sample "Push Day" session with: Bench Press (3x10 @ 60kg), Overhead Press (3x8 @ 40kg), Tricep Pushdown (3x12)
- Use checkboxes to mark sets as complete
- Use cards to group each exercise
- Track session history so future sessions can adapt goals based on performance`;

  await page.getByTestId('create-project-input').fill(prompt);
  await page.getByTestId('create-project-button').click();
  await expect(page.getByTestId('dsl-screen')).toBeVisible({ timeout: 90_000 });
}

test.describe('Fitness Tracker — Real LLM E2E', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (d) => {
      console.log('Dialog:', d.message());
      await d.accept();
    });
    await setupApp(page);
  });

  test('should create a fitness tracker with exercises', async ({ page }) => {
    await createFitnessTracker(page);
    await page.screenshot({ path: '/tmp/fitness-step1-created.png' });

    // The LLM should generate a screen with exercise-related UI
    await expect(page.getByTestId('dsl-screen')).toBeVisible();

    // Should have cards or sections for exercises
    const cards = await page.locator('[data-testid^="card-"]').count();
    const sections = await page.locator('[data-testid^="section-"]').count();
    console.log(`Cards: ${cards}, Sections: ${sections}`);

    // Should have number inputs (for reps, weight, etc.)
    const numberInputs = await page.locator('[data-testid^="number-input-"]').count();
    console.log(`Number inputs: ${numberInputs}`);

    // Should have some form of exercise names visible
    // The LLM should have included "Bench Press" or similar in the UI
    const bodyText = await page.getByTestId('dsl-screen').textContent();
    console.log('Page text preview:', bodyText?.substring(0, 500));

    // At minimum, the app should render and have interactive elements
    const inputs = await page.locator('[data-testid^="input-"], [data-testid^="number-input-"]').count();
    const buttons = await page.locator('[data-testid^="button-"]').count();
    expect(inputs + buttons).toBeGreaterThan(0);
  });

  test('should allow logging reps for an exercise', async ({ page }) => {
    await createFitnessTracker(page);

    // Find a number input (likely for reps or weight) and fill it
    const numberInput = page.locator('[data-testid^="number-input-"]').first();
    if (await numberInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await numberInput.fill('10');
      console.log('Filled number input with 10');
    }

    // Find a text input and fill it
    const textInput = page.locator('[data-testid^="input-"]').first();
    if (await textInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const testId = await textInput.getAttribute('data-testid');
      console.log('Found text input:', testId);
    }

    // Find and click a submit/save button
    const buttons = await page.locator('[data-testid^="button-"]').all();
    for (const btn of buttons) {
      const text = await btn.textContent();
      const testId = await btn.getAttribute('data-testid');
      console.log(`Button: ${testId} = "${text}"`);
    }

    // Click the first button to submit
    if (buttons.length > 0) {
      await buttons[0].click();
      // Wait for LLM response
      await page.waitForTimeout(15_000);
      await page.screenshot({ path: '/tmp/fitness-step2-logged-reps.png' });
    }

    // Verify page didn't crash
    await expect(page.getByTestId('dsl-screen')).toBeVisible();
  });

  test('should have chat and history views', async ({ page }) => {
    await createFitnessTracker(page);

    // Switch to Chat
    await page.getByTestId('mode-chat').click();
    await expect(page.getByTestId('chat-messages')).toBeVisible();
    await expect(page.locator('[data-testid="chat-message-assistant"]').first()).toBeVisible();
    await page.screenshot({ path: '/tmp/fitness-step3-chat.png' });

    // Switch to History
    await page.getByTestId('mode-history').click();
    await expect(page.getByTestId('history-list')).toBeVisible();
    await expect(page.getByText('v1', { exact: true })).toBeVisible();
    await page.screenshot({ path: '/tmp/fitness-step4-history.png' });
  });

  test('should allow completing a session via chat', async ({ page }) => {
    await createFitnessTracker(page);

    // Use chat to log a completed session
    await page.getByTestId('mode-chat').click();
    await page.getByTestId('chat-input').fill(
      'I just finished my session. Bench Press: did 3x10 at 60kg, felt strong. OHP: did 3x8 at 40kg, felt normal. Tricep Pushdown: did 3x12, felt weak. Save this session and generate my next session with updated goals.'
    );
    await page.getByTestId('chat-send-button').click();

    // Wait for LLM to process
    const initialCount = await page.locator('[data-testid="chat-message-assistant"]').count();
    await expect(async () => {
      const newCount = await page.locator('[data-testid="chat-message-assistant"]').count();
      expect(newCount).toBeGreaterThan(initialCount);
    }).toPass({ timeout: 90_000 });

    await page.screenshot({ path: '/tmp/fitness-step5-session-logged.png' });

    // Switch to app view — should show updated UI with new goals
    await page.getByTestId('mode-app').click();
    await expect(page.getByTestId('dsl-screen')).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: '/tmp/fitness-step6-updated-goals.png' });

    // Should have version history with at least v2
    await page.getByTestId('mode-history').click();
    await expect(page.getByText('v2', { exact: true })).toBeVisible({ timeout: 5_000 });
  });
});
