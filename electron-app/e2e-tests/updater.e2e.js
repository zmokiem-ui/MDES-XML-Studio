const { test, expect } = require('@playwright/test');
const { version: appVersion } = require('../package.json');
const { launchElectronApp, closeElectronApp } = require('./helpers');

test.describe('Updater settings', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    ({ electronApp, window } = await launchElectronApp());
  });

  test.afterAll(async () => {
    await closeElectronApp(electronApp);
  });

  test('shows the app version, toggles auto-update, and reports unavailable dev service', async () => {
    await window.click('[data-testid="nav-settings"]');
    await expect(window.locator('[data-testid="update-section"]')).toBeVisible();
    await expect(window.locator('[data-testid="app-version"]')).toHaveText(`v${appVersion}`);

    const toggle = window.locator('[data-testid="auto-update-toggle"]');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await window.click('[data-testid="check-for-updates"]');
    await expect(window.locator('[data-testid="update-error"]')).toContainText('Updates not available in dev mode');
  });
});
