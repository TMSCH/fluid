import { test, expect } from '@playwright/test';

test('demo: full Todo app flow with screenshots', async ({ page }) => {
  test.setTimeout(120_000);

  page.on('dialog', async (d) => await d.accept());

  // Step 1: Home screen with API key setup
  await page.goto('/');
  await expect(page.getByTestId('api-key-input')).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: '/tmp/e2e-step1-home.png' });

  // Step 2: Enter demo API key and see project list
  await page.getByTestId('api-key-input').fill('demo');
  await page.getByTestId('save-api-key').click();
  await expect(page.getByTestId('create-project-input')).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: '/tmp/e2e-step2-projectlist.png' });

  // Step 3: Create a todo project (mock LLM generates full UI)
  await page.getByTestId('create-project-input').fill('Make me a todo list');
  await page.getByTestId('create-project-button').click();
  await expect(page.getByTestId('dsl-screen')).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: '/tmp/e2e-step3-created.png' });

  // Step 4: Add first todo
  await page.getByTestId('input-new_todo_title').fill('Buy groceries');
  await page.getByTestId('button-submit_form').click();
  await expect(page.getByText('Buy groceries')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: '/tmp/e2e-step4-added-first.png' });

  // Step 5: Add second todo
  await page.getByTestId('input-new_todo_title').fill('Walk the dog');
  await page.getByTestId('button-submit_form').click();
  await expect(page.getByText('Walk the dog')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: '/tmp/e2e-step5-added-second.png' });

  // Step 6: Add third todo
  await page.getByTestId('input-new_todo_title').fill('Read a book');
  await page.getByTestId('button-submit_form').click();
  await expect(page.getByText('Read a book')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: '/tmp/e2e-step6-three-todos.png' });

  // Step 7: Switch to Chat and add via chat
  await page.getByTestId('mode-chat').click();
  await page.getByTestId('chat-input').fill('add Clean the kitchen');
  await page.getByTestId('chat-send-button').click();
  await expect(page.getByText(/Clean the kitchen/).first()).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: '/tmp/e2e-step7-chat.png' });

  // Step 8: Back to App view — all todos should be there
  await page.getByTestId('mode-app').click();
  await expect(page.getByText('Clean the kitchen')).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: '/tmp/e2e-step8-app-with-all.png' });

  // Step 9: History view
  await page.getByTestId('mode-history').click();
  await expect(page.getByText('v1', { exact: true })).toBeVisible();
  await page.screenshot({ path: '/tmp/e2e-step9-history.png' });
});
