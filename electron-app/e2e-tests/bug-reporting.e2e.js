const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');

test.describe('Bug Reporting Feature', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../electron/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('11.1 Bug report section visible in Settings', async () => {
    // Navigate to Settings
    await window.waitForSelector('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.click('[data-testid="nav-settings"]');
    await window.waitForTimeout(1000);

    // Check for bug report section
    const bugReportSection = window.locator('[data-testid="bug-report-section"]');
    await expect(bugReportSection).toBeVisible();

    // Check for "Report a Bug" button or heading
    const reportButton = window.locator('[data-testid="report-bug-button"]');
    await expect(reportButton).toBeVisible();
  });

  test('11.2 Bug report form renders with all required fields', async () => {
    // Navigate to Settings
    await window.waitForSelector('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.click('[data-testid="nav-settings"]');
    await window.waitForTimeout(1000);

    // Open bug report form
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(500);

    // Verify form fields exist
    await expect(window.locator('[data-testid="bug-title-input"]')).toBeVisible();
    await expect(window.locator('[data-testid="bug-description-input"]')).toBeVisible();
    await expect(window.locator('[data-testid="bug-steps-input"]')).toBeVisible();
    await expect(window.locator('[data-testid="bug-expected-input"]')).toBeVisible();
    await expect(window.locator('[data-testid="bug-actual-input"]')).toBeVisible();
    await expect(window.locator('[data-testid="bug-email-input"]')).toBeVisible();
    await expect(window.locator('[data-testid="bug-submit-button"]')).toBeVisible();
  });

  test('11.3 Form validation - title required', async () => {
    // Navigate to Settings
    await window.waitForSelector('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.click('[data-testid="nav-settings"]');
    await window.waitForTimeout(1000);

    // Open bug report form
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(500);

    // Try to submit without title
    await window.fill('[data-testid="bug-description-input"]', 'Test description');
    await window.click('[data-testid="bug-submit-button"]');
    await window.waitForTimeout(300);

    // Should show validation error
    const errorMessage = window.locator('[data-testid="bug-title-error"]');
    await expect(errorMessage).toBeVisible();
  });

  test('11.4 Form validation - description required', async () => {
    // Navigate to Settings
    await window.waitForSelector('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.click('[data-testid="nav-settings"]');
    await window.waitForTimeout(1000);

    // Open bug report form
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(500);

    // Try to submit without description
    await window.fill('[data-testid="bug-title-input"]', 'Test Bug');
    await window.click('[data-testid="bug-submit-button"]');
    await window.waitForTimeout(300);

    // Should show validation error
    const errorMessage = window.locator('[data-testid="bug-description-error"]');
    await expect(errorMessage).toBeVisible();
  });

  test('11.5 Form validation - email format validation', async () => {
    // Navigate to Settings
    await window.waitForSelector('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.click('[data-testid="nav-settings"]');
    await window.waitForTimeout(1000);

    // Open bug report form
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(500);

    // Fill with invalid email
    await window.fill('[data-testid="bug-title-input"]', 'Test Bug');
    await window.fill('[data-testid="bug-description-input"]', 'Test description');
    await window.fill('[data-testid="bug-email-input"]', 'invalid-email');
    await window.click('[data-testid="bug-submit-button"]');
    await window.waitForTimeout(300);

    // Should show email validation error
    const errorMessage = window.locator('[data-testid="bug-email-error"]');
    await expect(errorMessage).toBeVisible();
  });

  test('11.6 Screenshot capture button exists', async () => {
    // Navigate to Settings
    await window.waitForSelector('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.click('[data-testid="nav-settings"]');
    await window.waitForTimeout(1000);

    // Open bug report form
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(500);

    // Check for screenshot button
    const screenshotButton = window.locator('[data-testid="bug-screenshot-button"]');
    await expect(screenshotButton).toBeVisible();
  });

  test('11.7 System information displayed in form', async () => {
    // Navigate to Settings
    await window.waitForSelector('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.click('[data-testid="nav-settings"]');
    await window.waitForTimeout(1000);

    // Open bug report form
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(500);

    // Check for system info section
    const systemInfo = window.locator('[data-testid="bug-system-info"]');
    await expect(systemInfo).toBeVisible();

    // Should contain app version
    const systemInfoText = await systemInfo.textContent();
    expect(systemInfoText).toContain('Version');
    expect(systemInfoText).toContain('1.1.2');
  });

  test('11.8 Cancel button closes form', async () => {
    // Navigate to Settings
    await window.waitForSelector('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.click('[data-testid="nav-settings"]');
    await window.waitForTimeout(1000);

    // Open bug report form
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(500);

    // Verify form is visible
    await expect(window.locator('[data-testid="bug-report-form"]')).toBeVisible();

    // Click cancel
    await window.click('[data-testid="bug-cancel-button"]');
    await window.waitForTimeout(300);

    // Form should be hidden
    await expect(window.locator('[data-testid="bug-report-form"]')).not.toBeVisible();
  });

  test('11.9 Form clears after cancel', async () => {
    // Navigate to Settings
    await window.waitForSelector('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.click('[data-testid="nav-settings"]');
    await window.waitForTimeout(1000);

    // Open bug report form
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(500);

    // Fill some fields
    await window.fill('[data-testid="bug-title-input"]', 'Test Bug');
    await window.fill('[data-testid="bug-description-input"]', 'Test description');

    // Cancel
    await window.click('[data-testid="bug-cancel-button"]');
    await window.waitForTimeout(300);

    // Reopen form
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(500);

    // Fields should be empty
    const titleValue = await window.locator('[data-testid="bug-title-input"]').inputValue();
    const descValue = await window.locator('[data-testid="bug-description-input"]').inputValue();
    expect(titleValue).toBe('');
    expect(descValue).toBe('');
  });

  test('11.10 Bug report section translates to Dutch', async () => {
    // Navigate to Settings
    await window.waitForSelector('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.click('[data-testid="nav-settings"]');
    await window.waitForTimeout(1000);

    // Switch to Dutch
    await window.click('[data-testid="language-nl"]');
    await window.waitForTimeout(500);

    // Check bug report button text is in Dutch
    const reportButton = window.locator('[data-testid="report-bug-button"]');
    const buttonText = await reportButton.textContent();
    expect(buttonText).toContain('Rapporteer'); // Dutch for "Report"
  });

  test('11.11 Bug report section translates to Spanish', async () => {
    // Navigate to Settings
    await window.waitForSelector('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.click('[data-testid="nav-settings"]');
    await window.waitForTimeout(1000);

    // Switch to Spanish
    await window.click('[data-testid="language-es"]');
    await window.waitForTimeout(500);

    // Check bug report button text is in Spanish
    const reportButton = window.locator('[data-testid="report-bug-button"]');
    const buttonText = await reportButton.textContent();
    expect(buttonText).toContain('Reportar'); // Spanish for "Report"
  });
});
