import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context, page }) => {
  // Never read or write the shared Firebase project from this regression test.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname) && !url.pathname.startsWith('/api/')) return route.continue();
    return route.abort();
  });
  await page.addInitScript(() => {
    localStorage.setItem('gameshare_continue_browser', 'true');
    localStorage.setItem('bg_active_user_household_v1', 'Kalissa & Allen');
  });
});

test('offline request keeps the form and note and never shows a false success', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('[role="button"]').first().getByRole('button', { name: 'Borrow', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const note = dialog.getByPlaceholder('e.g. Planning for Saturday family game night!');
  await note.fill('Please keep this note on failure');
  await context.setOffline(true);
  await dialog.getByRole('button', { name: /Send Borrow Request to/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not save:' })).toContainText('You are offline');
  await expect(note).toHaveValue('Please keep this note on failure');
  await expect(dialog.getByRole('button', { name: /Send Borrow Request to/ })).toBeVisible();
  await expect(dialog).not.toContainText('Request Sent');
});

test('offline return keeps the confirmation form open', async ({ page, context }) => {
  await page.goto('/');
  await page.getByTitle('Mark this game as returned', { exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  const note = dialog.getByPlaceholder('e.g. All components safe in box, awesome game!');
  await note.fill('Return note');
  await context.setOffline(true);
  await dialog.getByRole('button', { name: 'Confirm Return', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not save:' })).toContainText('You are offline');
  await expect(note).toHaveValue('Return note');
});

test('offline game edit keeps the unsaved input', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Edit .* and link BGG cover/ }).first().click();
  const dialog = page.getByRole('dialog');
  const note = dialog.getByPlaceholder('e.g. Big Box edition, includes expansion 1 & 2');
  await note.fill('Unsaved edit');
  await context.setOffline(true);
  await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not save:' })).toContainText('You are offline');
  await expect(note).toHaveValue('Unsaved edit');
});
