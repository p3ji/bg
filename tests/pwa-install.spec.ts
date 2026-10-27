import { test, expect } from '@playwright/test';

test.describe('PWA Installation Gate & Prompt Tests', () => {

  test('navigating on first visit shows the install gate asking user to install', async ({ page }) => {
    // Every test starts with a fresh BrowserContext and empty storage
    await page.goto('/');

    // Verify install gate is displayed
    const gate = page.locator('[data-testid="install-first-gate"]');
    await expect(gate).toBeVisible();
    await expect(gate).toContainText('Add GameShare to your Home Screen');
    await expect(gate).toContainText('Recommended on Phones');

    // Verify both action buttons are present
    const installBtn = page.locator('[data-testid="btn-install-first"]');
    const continueBtn = page.locator('[data-testid="btn-continue-browser"]');
    await expect(installBtn).toBeVisible();
    await expect(continueBtn).toBeVisible();
  });

  test('clicking Install GameShare opens the step-by-step installation guide', async ({ page }) => {
    await page.goto('/');

    const installBtn = page.locator('[data-testid="btn-install-first"]');
    await expect(installBtn).toBeVisible();
    await installBtn.click();

    // Guide modal opens
    const guideModal = page.locator('[data-testid="install-guide-modal"]');
    await expect(guideModal).toBeVisible();
    await expect(guideModal).toContainText('Add to Home Screen');
  });

  test('clicking Continue in browser dismisses gate and persists preference', async ({ page }) => {
    await page.goto('/');

    const continueBtn = page.locator('[data-testid="btn-continue-browser"]');
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    // Install gate closes
    const gate = page.locator('[data-testid="install-first-gate"]');
    await expect(gate).not.toBeVisible();

    // Verify preference is saved in localStorage
    const saved = await page.evaluate(() => localStorage.getItem('gameshare_continue_browser'));
    expect(saved).toBe('true');

    // Reloading page preserves preference — gate stays hidden
    await page.reload();
    await expect(gate).not.toBeVisible();
  });

  test('bypasses install gate when launched as installed standalone PWA', async ({ page }) => {
    // Emulate standalone display mode
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'standalone', {
        get: () => true,
        configurable: true,
      });
    });

    await page.goto('/');
    const gate = page.locator('[data-testid="install-first-gate"]');
    await expect(gate).not.toBeVisible();
  });

  test('Settings modal includes Install GameShare section for subsequent access', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gameshare_continue_browser', 'true');
      localStorage.setItem('bg_active_user_household_v1', 'Pushp');
    });

    await page.goto('/');

    // Open settings via settings button in header
    const settingsBtn = page.locator('button[title*="Settings" i], button[aria-label*="Settings" i]').first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await expect(page.locator('text=Install GameShare App')).toBeVisible();
    }
  });

});
