const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');
const { electronEnv } = require('./helpers');

test.describe('Bug Reporting - GitHub Integration', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../electron/main.js')],
      env: electronEnv({ NODE_ENV: 'development' })
    });
    
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(3000);
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('Full bug report opens a pre-filled public GitHub issue', async () => {
    // Navigate to Settings
    await window.click('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.waitForTimeout(1000);

    // Scroll to bug report section
    const bugReportSection = window.locator('[data-testid="bug-report-section"]');
    await bugReportSection.scrollIntoViewIfNeeded();
    await window.waitForTimeout(500);

    // Take screenshot before opening form
    await window.screenshot({ path: 'test-results/before-bug-report.png' });

    // Click Report Bug button
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(1000);

    // Verify form is open
    const formVisible = await window.locator('[data-testid="bug-report-form"]').isVisible();
    expect(formVisible).toBe(true);
    console.log('✓ Bug report form opened');

    // Take screenshot of form
    await window.screenshot({ path: 'test-results/bug-report-form-open.png' });

    // Fill out the form
    const timestamp = new Date().toISOString();
    await window.fill('[data-testid="bug-title-input"]', `E2E Test Bug Report - ${timestamp}`);
    await window.fill('[data-testid="bug-description-input"]', 'This is an automated test bug report created by the E2E test suite to verify the bug reporting feature works correctly.');
    await window.fill('[data-testid="bug-steps-input"]', '1. Run E2E test suite\n2. Navigate to Settings\n3. Click Report a Bug\n4. Fill form\n5. Submit');
    await window.fill('[data-testid="bug-expected-input"]', 'Bug report should be created successfully in GitHub');
    await window.fill('[data-testid="bug-actual-input"]', 'Testing actual behavior');
    await window.fill('[data-testid="bug-email-input"]', 'test@example.com');

    console.log('✓ Form filled with test data');

    // Take screenshot of filled form
    await window.screenshot({ path: 'test-results/bug-report-form-filled.png' });

    // Submit the form
    await window.click('[data-testid="bug-submit-button"]');
    console.log('✓ Submit button clicked, waiting for response...');

    await window.waitForTimeout(1000);

    // Take screenshot after submission
    await window.screenshot({ path: 'test-results/after-submission.png' });

    // E2E_TEST prevents a real browser launch while exercising the complete IPC flow.
    const modalVisible = await window.locator('.fixed.inset-0.bg-black\\/50').isVisible({ timeout: 5000 });
    expect(modalVisible).toBe(true);
    const modalText = await window.locator('.fixed.inset-0.bg-black\\/50').textContent();
    expect(modalText).toContain('pre-filled public GitHub issue');

    // Verify form closed or modal is showing
    const formStillVisible = await window.locator('[data-testid="bug-report-form"]').isVisible({ timeout: 2000 }).catch(() => false);
    expect(formStillVisible).toBe(false);
  });

  test('Screenshot capture functionality', async () => {
    // Navigate to Settings
    await window.click('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.waitForTimeout(1000);

    // Scroll to bug report section
    const bugReportSection = window.locator('[data-testid="bug-report-section"]');
    await bugReportSection.scrollIntoViewIfNeeded();
    await window.waitForTimeout(500);

    // Open bug report form
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(1000);

    // Click screenshot button
    await window.click('[data-testid="bug-screenshot-button"]');
    await window.waitForTimeout(2000);

    await expect(window.locator('[data-testid="bug-screenshot-copied"]')).toBeVisible();

    console.log('✓ Screenshot button clicked');

    // Take screenshot to verify state
    await window.screenshot({ path: 'test-results/after-screenshot-capture.png' });

    // Note: We can't easily verify the screenshot was captured without inspecting internal state
    // But we can verify the button works without errors
    console.log('✓ Screenshot capture completed without errors');
  });

  test('Form validation prevents empty submission', async () => {
    // Navigate to Settings
    await window.click('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.waitForTimeout(1000);

    // Scroll to bug report section
    const bugReportSection = window.locator('[data-testid="bug-report-section"]');
    await bugReportSection.scrollIntoViewIfNeeded();
    await window.waitForTimeout(500);

    // Open bug report form
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(1000);

    // Try to submit without filling anything
    await window.click('[data-testid="bug-submit-button"]');
    await window.waitForTimeout(500);

    // Check for validation errors
    const titleError = await window.locator('[data-testid="bug-title-error"]').isVisible({ timeout: 2000 });
    const descError = await window.locator('[data-testid="bug-description-error"]').isVisible({ timeout: 2000 });

    console.log(`Title validation error shown: ${titleError}`);
    console.log(`Description validation error shown: ${descError}`);

    expect(titleError || descError).toBe(true);
    console.log('✓ Form validation prevents empty submission');
  });

  test('Cancel button closes form', async () => {
    // Navigate to Settings
    await window.click('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.waitForTimeout(1000);

    // Scroll to bug report section
    const bugReportSection = window.locator('[data-testid="bug-report-section"]');
    await bugReportSection.scrollIntoViewIfNeeded();
    await window.waitForTimeout(500);

    // Open bug report form
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(1000);

    // Verify form is open
    let formVisible = await window.locator('[data-testid="bug-report-form"]').isVisible();
    expect(formVisible).toBe(true);

    // Click cancel
    await window.click('[data-testid="bug-cancel-button"]');
    await window.waitForTimeout(500);

    // Verify form is closed
    formVisible = await window.locator('[data-testid="bug-report-form"]').isVisible({ timeout: 2000 }).catch(() => false);
    expect(formVisible).toBe(false);
    console.log('✓ Cancel button closes form');
  });
});
