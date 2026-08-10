const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');
const { electronEnv } = require('./helpers');

test.describe('Bug Reporting - Simple Verification', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../electron/main.js')],
      env: electronEnv({ NODE_ENV: 'test' })
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    
    // Wait for app to fully load
    await window.waitForTimeout(3000);
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('App loads successfully', async () => {
    // Just verify the app window exists and has content
    const title = await window.title();
    console.log('Window title:', title);
    
    // Take a screenshot to see what's on screen
    await window.screenshot({ path: 'test-results/app-loaded.png' });
    
    // Check if any navigation is visible
    const body = await window.locator('body').textContent();
    console.log('Body contains text:', body.length > 0);
    
    expect(body.length).toBeGreaterThan(0);
  });

  test('Can find Settings navigation', async () => {
    // Wait longer and try to find any button
    await window.waitForTimeout(3000);
    
    // Take screenshot before looking for settings
    await window.screenshot({ path: 'test-results/before-settings.png' });
    
    // Try multiple selectors
    const selectors = [
      '[data-testid="nav-settings"]',
      'button[title="Settings"]',
      'button:has-text("Settings")',
      '[aria-label="Settings"]'
    ];
    
    let found = false;
    for (const selector of selectors) {
      try {
        const element = await window.locator(selector).first();
        const isVisible = await element.isVisible({ timeout: 2000 });
        if (isVisible) {
          console.log(`✓ Found Settings with selector: ${selector}`);
          found = true;
          break;
        }
      } catch (e) {
        console.log(`✗ Selector failed: ${selector}`);
      }
    }
    
    expect(found).toBe(true);
  });

  test('Bug report section exists in Settings', async () => {
    await window.waitForTimeout(3000);
    
    // Click Settings
    await window.click('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.waitForTimeout(2000);
    await window.screenshot({ path: 'test-results/settings-page-top.png' });
    
    // Scroll down to find bug report section (it's below Partner Jurisdictions)
    await window.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await window.waitForTimeout(1000);
    await window.screenshot({ path: 'test-results/settings-page-bottom.png' });
    
    // Look for bug report section
    const bugReportSection = window.locator('[data-testid="bug-report-section"]');
    await bugReportSection.scrollIntoViewIfNeeded();
    const bugReportVisible = await bugReportSection.isVisible({ timeout: 5000 });
    
    if (bugReportVisible) {
      console.log('✓ Bug report section is visible');
      
      // Take screenshot of the section
      await bugReportSection.screenshot({ 
        path: 'test-results/bug-report-section.png' 
      });
    }
    
    expect(bugReportVisible).toBe(true);
  });

  test('Bug report form opens and has all fields', async () => {
    await window.waitForTimeout(3000);
    
    // Navigate to Settings
    await window.click('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.waitForTimeout(1000);
    
    // Scroll to bug report section
    const bugReportSection = window.locator('[data-testid="bug-report-section"]');
    await bugReportSection.scrollIntoViewIfNeeded();
    await window.waitForTimeout(500);
    
    // Click Report Bug button
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(1000);
    
    // Take screenshot of form
    await window.screenshot({ path: 'test-results/bug-report-form.png' });
    
    // Verify all fields exist
    const fields = [
      'bug-title-input',
      'bug-description-input',
      'bug-steps-input',
      'bug-expected-input',
      'bug-actual-input',
      'bug-email-input',
      'bug-screenshot-button',
      'bug-submit-button',
      'bug-cancel-button'
    ];
    
    for (const field of fields) {
      const exists = await window.locator(`[data-testid="${field}"]`).isVisible({ timeout: 2000 });
      console.log(`${field}: ${exists ? '✓' : '✗'}`);
      expect(exists).toBe(true);
    }
  });

  test('Form validation works - title required', async () => {
    await window.waitForTimeout(3000);
    await window.click('[data-testid="nav-settings"]', { timeout: 10000 });
    await window.waitForTimeout(1000);
    
    // Scroll to bug report section
    const bugReportSection = window.locator('[data-testid="bug-report-section"]');
    await bugReportSection.scrollIntoViewIfNeeded();
    await window.waitForTimeout(500);
    
    await window.click('[data-testid="report-bug-button"]');
    await window.waitForTimeout(500);
    
    // Try to submit without title
    await window.fill('[data-testid="bug-description-input"]', 'Test description');
    await window.click('[data-testid="bug-submit-button"]');
    await window.waitForTimeout(500);
    
    // Check for error message
    const errorVisible = await window.locator('[data-testid="bug-title-error"]').isVisible({ timeout: 2000 });
    
    if (errorVisible) {
      console.log('✓ Title validation error shown');
    } else {
      console.log('✗ Title validation error NOT shown');
      await window.screenshot({ path: 'test-results/validation-failed.png' });
    }
    
    expect(errorVisible).toBe(true);
  });
});
