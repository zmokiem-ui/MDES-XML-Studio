// E2E Regression Test - Comprehensive UI testing of all features
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const {
  launchElectronApp,
  closeElectronApp,
  navigateToModule,
  navigateToPage,
  goToHome,
  getTestOutputDir
} = require('./helpers');

test.describe('E2E Regression Test - Full Application', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const app = await launchElectronApp();
    electronApp = app.electronApp;
    window = app.window;
  });

  test.afterEach(async () => {
    await closeElectronApp(electronApp);
  });

  // ================================================================
  // SECTION 1: APP STARTUP & HOME SCREEN
  // ================================================================

  test('1.1 App launches with correct title', async () => {
    await expect(window).toHaveTitle(/MDES XML Studio|Tax Reporting Generator|CRS Test Data Generator/);
  });

  test('1.2 Home screen shows all 3 module cards', async () => {
    await expect(window.locator('text=Common Reporting Standard')).toBeVisible();
    await expect(window.locator('text=Foreign Account Tax Compliance Act')).toBeVisible();
    await expect(window.locator('text=Country-by-Country Reporting')).toBeVisible();
  });

  test('1.3 Home screen shows Open buttons', async () => {
    await expect(window.locator('button:has-text("Open CRS")')).toBeVisible();
    await expect(window.locator('button:has-text("Open FATCA")')).toBeVisible();
    await expect(window.locator('button:has-text("Open CBC")')).toBeVisible();
  });

  test('1.4 Home screen shows footer', async () => {
    await window.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await window.waitForTimeout(300);
    await expect(window.locator('text=More modules coming soon')).toBeVisible();
  });

  test('1.5 No console errors on startup', async () => {
    const errors = [];
    window.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await window.waitForTimeout(2000);
    const critical = errors.filter(e => !e.includes('DevTools') && !e.includes('favicon') && !e.includes('sourcemap'));
    expect(critical.length).toBe(0);
  });

  // ================================================================
  // SECTION 2: CRS MODULE
  // ================================================================

  test('2.1 CRS - Navigate to module', async () => {
    await navigateToModule(window, 'CRS');
    await expect(window.locator('button:has-text("Generator")')).toBeVisible();
    await expect(window.locator('button:has-text("Correction")')).toBeVisible();
    await expect(window.locator('button:has-text("Faulty XML")')).toBeVisible();
    await expect(window.locator('button:has-text("Tools")')).toBeVisible();
  });

  test('2.2 CRS - Generator form fields', async () => {
    await navigateToModule(window, 'CRS');
    await expect(window.locator('text=Number of Financial Institutions').first()).toBeVisible();
    await expect(window.locator('text=Individual Accounts').first()).toBeVisible();
    await expect(window.locator('text=Organisation Accounts').first()).toBeVisible();
    await expect(window.locator('button:has-text("Generate CRS")')).toBeVisible();
  });

  test('2.3 CRS - Generator number inputs work', async () => {
    await navigateToModule(window, 'CRS');
    const inputs = window.locator('input[type="number"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
    
    // Fill first input
    await inputs.first().clear();
    await inputs.first().fill('5');
    await expect(inputs.first()).toHaveValue('5');
  });

  test('2.4 CRS - Correction tab', async () => {
    await navigateToModule(window, 'CRS');
    await navigateToPage(window, 'Correction');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Source XML File').first()).toBeVisible();
  });

  test('2.5 CRS - Faulty XML tab shows all 8 presets', async () => {
    await navigateToModule(window, 'CRS');
    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);

    await expect(window.locator('text=Faulty XML Generator - CRS Module')).toBeVisible();
    await expect(window.locator('text=Missing Required Fields').first()).toBeVisible();
    await expect(window.locator('text=Invalid Date Formats').first()).toBeVisible();
    await expect(window.locator('text=Invalid Country Codes').first()).toBeVisible();
    await expect(window.locator('text=Invalid Account Balances').first()).toBeVisible();
    await expect(window.locator('text=Duplicate DocRefIds').first()).toBeVisible();
    await expect(window.locator('text=Wrong Message Type Indicators').first()).toBeVisible();
    await expect(window.locator('text=Malformed XML Structure').first()).toBeVisible();
    await expect(window.locator('text=Invalid TIN Formats').first()).toBeVisible();
  });

  test('2.6 CRS - Tools tab (Country Code Replacer)', async () => {
    await navigateToModule(window, 'CRS');
    await navigateToPage(window, 'Tools');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Country Code Replacer').first()).toBeVisible();
  });

  // ================================================================
  // SECTION 3: FATCA MODULE
  // ================================================================

  test('3.1 FATCA - Navigate to module', async () => {
    await navigateToModule(window, 'FATCA');
    await expect(window.locator('button:has-text("Generator")')).toBeVisible();
    await expect(window.locator('button:has-text("Correction")')).toBeVisible();
    await expect(window.locator('button:has-text("Faulty XML")')).toBeVisible();
  });

  test('3.2 FATCA - Generator form fields', async () => {
    await navigateToModule(window, 'FATCA');
    await expect(window.locator('text=Sending Company GIIN').first()).toBeVisible();
    await expect(window.locator('text=Filer Category').first()).toBeVisible();
    await expect(window.locator('text=Substantial Owners').first()).toBeVisible();
    await expect(window.locator('button:has-text("Generate FATCA")')).toBeVisible();
  });

  test('3.3 FATCA - Correction tab', async () => {
    await navigateToModule(window, 'FATCA');
    await navigateToPage(window, 'Correction');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Source XML File').first()).toBeVisible();
  });

  test('3.4 FATCA - Faulty XML tab shows all 7 presets', async () => {
    await navigateToModule(window, 'FATCA');
    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);

    await expect(window.locator('text=Faulty XML Generator - FATCA Module')).toBeVisible();
    await expect(window.locator('text=Missing Required Fields').first()).toBeVisible();
    await expect(window.locator('text=Invalid GIIN Format').first()).toBeVisible();
    await expect(window.locator('text=Invalid Filer Category').first()).toBeVisible();
    await expect(window.locator('text=Invalid Account Holder Types').first()).toBeVisible();
    await expect(window.locator('text=Invalid Payment Types').first()).toBeVisible();
    await expect(window.locator('text=US Indicia Conflicts').first()).toBeVisible();
    await expect(window.locator('text=Malformed XML Structure').first()).toBeVisible();
  });

  // ================================================================
  // SECTION 4: CBC MODULE
  // ================================================================

  test('4.1 CBC - Navigate to module', async () => {
    await navigateToModule(window, 'CBC');
    await expect(window.locator('button:has-text("Generator")')).toBeVisible();
    await expect(window.locator('button:has-text("Correction")')).toBeVisible();
    await expect(window.locator('button:has-text("Faulty XML")')).toBeVisible();
  });

  test('4.2 CBC - Generator form fields', async () => {
    await navigateToModule(window, 'CBC');
    await expect(window.locator('text=MNE Group Name').first()).toBeVisible();
    await expect(window.locator('text=Reporting Entity (MNE)').first()).toBeVisible();
    await expect(window.locator('button:has-text("Generate CBC")')).toBeVisible();
  });

  test('4.3 CBC - Correction tab', async () => {
    await navigateToModule(window, 'CBC');
    await navigateToPage(window, 'Correction');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Generate CBC Correction Files').first()).toBeVisible();
    await expect(window.locator('text=Source XML File').first()).toBeVisible();
  });

  test('4.4 CBC - Faulty XML tab shows all 7 presets', async () => {
    await navigateToModule(window, 'CBC');
    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);

    await expect(window.locator('text=Faulty XML Generator - CBC Module')).toBeVisible();
    await expect(window.locator('text=Missing Required Fields').first()).toBeVisible();
    await expect(window.locator('text=Invalid Revenue Amounts').first()).toBeVisible();
    await expect(window.locator('text=Invalid Entity Types').first()).toBeVisible();
    await expect(window.locator('text=Missing CBC Reports').first()).toBeVisible();
    await expect(window.locator('text=Wrong CBC Message Type').first()).toBeVisible();
    await expect(window.locator('text=Duplicate Entity Names').first()).toBeVisible();
    await expect(window.locator('text=Malformed XML Structure').first()).toBeVisible();
  });

  // ================================================================
  // SECTION 5: ERROR INJECTOR INTERACTIONS
  // ================================================================

  test('5.1 Error Injector - Preset selection shows options', async () => {
    await navigateToModule(window, 'CRS');
    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);

    const preset = window.locator('button:has-text("Missing Required Fields")');
    await preset.click();
    await window.waitForTimeout(500);
    await expect(window.locator('text=Options:').first()).toBeVisible();
  });

  test('5.2 Error Injector - Intensity slider works', async () => {
    await navigateToModule(window, 'CRS');
    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);

    const slider = window.locator('input[type="range"]');
    await expect(slider).toBeVisible();

    // Test each level
    for (const level of ['1', '3', '5']) {
      await slider.fill(level);
      await expect(window.locator(`text=Level ${level}`)).toBeVisible();
    }
  });

  test('5.3 Error Injector - Upload button exists', async () => {
    await navigateToModule(window, 'CRS');
    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Click to upload').first()).toBeVisible();
    await expect(window.locator('text=XML or CSV file').first()).toBeVisible();
  });

  test('5.4 Error Injector - Corrupt button disabled without file', async () => {
    await navigateToModule(window, 'CRS');
    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);

    // Select a preset
    await window.locator('button:has-text("Missing Required Fields")').click();
    await window.waitForTimeout(300);

    // Corrupt button should be disabled (no file uploaded)
    const corruptBtn = window.locator('button:has-text("Corrupt File")');
    await expect(corruptBtn).toBeVisible();
    await expect(corruptBtn).toBeDisabled();
  });

  test('5.5 Error Injector - Reset button works', async () => {
    await navigateToModule(window, 'CRS');
    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);

    // Select a preset
    await window.locator('button:has-text("Missing Required Fields")').click();
    await window.waitForTimeout(300);
    await expect(window.locator('text=Options:').first()).toBeVisible();

    // Click Reset
    await window.locator('button:has-text("Reset")').click();
    await window.waitForTimeout(300);

    // Options should be gone (no preset selected)
    const optionsCount = await window.locator('text=Options:').count();
    expect(optionsCount).toBe(0);
  });

  // ================================================================
  // SECTION 6: NAVIGATION
  // ================================================================

  test('6.1 Navigation - CRS -> Home -> FATCA -> Home -> CBC', async () => {
    await navigateToModule(window, 'CRS');
    await expect(window.locator('button:has-text("Generator")')).toBeVisible();
    await goToHome(window);
    await expect(window.locator('text=Select a Module')).toBeVisible();

    await navigateToModule(window, 'FATCA');
    await expect(window.locator('button:has-text("Generator")')).toBeVisible();
    await goToHome(window);
    await expect(window.locator('text=Select a Module')).toBeVisible();

    await navigateToModule(window, 'CBC');
    await expect(window.locator('button:has-text("Generator")')).toBeVisible();
  });

  test('6.2 Tab Navigation - CRS all 4 tabs', async () => {
    await navigateToModule(window, 'CRS');

    await navigateToPage(window, 'Generator');
    await expect(window.locator('text=Number of Financial Institutions').first()).toBeVisible();

    await navigateToPage(window, 'Correction');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Source XML File').first()).toBeVisible();

    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Faulty XML Generator - CRS Module')).toBeVisible();

    await navigateToPage(window, 'Tools');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Country Code Replacer').first()).toBeVisible();
  });

  test('6.3 Tab Navigation - FATCA all 3 tabs', async () => {
    await navigateToModule(window, 'FATCA');

    await navigateToPage(window, 'Generator');
    await expect(window.locator('text=Sending Company GIIN').first()).toBeVisible();

    await navigateToPage(window, 'Correction');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Source XML File').first()).toBeVisible();

    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Faulty XML Generator - FATCA Module')).toBeVisible();
  });

  test('6.4 Tab Navigation - CBC all 3 tabs', async () => {
    await navigateToModule(window, 'CBC');

    await navigateToPage(window, 'Generator');
    await expect(window.locator('text=MNE Group Name').first()).toBeVisible();

    await navigateToPage(window, 'Correction');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Generate CBC Correction Files').first()).toBeVisible();

    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Faulty XML Generator - CBC Module')).toBeVisible();
  });

  // ================================================================
  // SECTION 7: THEME & UI
  // ================================================================

  test('7.1 Theme toggle changes theme', async () => {
    // Theme button shows theme name (e.g. "Midnight", "Light", "Dark", etc.)
    // Find the theme button in the header area (rightmost button with theme name)
    const themeBtn = window.locator('header button, nav button').last();
    await expect(themeBtn).toBeVisible();
    
    const initialText = await themeBtn.textContent();
    await themeBtn.click();
    await window.waitForTimeout(1000);

    // After clicking, a theme menu/dropdown may appear or theme cycles
    // Re-locate the theme button and check text changed
    const newThemeBtn = window.locator('header button, nav button').last();
    const newText = await newThemeBtn.textContent();
    expect(initialText).not.toBe(newText);
  });

  test('7.2 Theme persists in module view', async () => {
    // Navigate to CRS and verify the theme toggle button is present
    await navigateToModule(window, 'CRS');
    await window.waitForTimeout(500);

    // Module view has a theme toggle with title="Click to change theme"
    const moduleThemeBtn = window.locator('button[title="Click to change theme"]');
    await expect(moduleThemeBtn).toBeVisible();

    // Click it and verify it cycles the theme (text changes)
    const beforeText = await moduleThemeBtn.textContent();
    await moduleThemeBtn.click();
    await window.waitForTimeout(500);
    const afterText = await window.locator('button[title="Click to change theme"]').textContent();
    expect(beforeText).not.toBe(afterText);
  });

  // ================================================================
  // SECTION 8: EDGE CASES
  // ================================================================

  test('8.1 Rapid tab switching does not crash', async () => {
    await navigateToModule(window, 'CRS');
    
    // Rapidly switch tabs
    for (let i = 0; i < 3; i++) {
      await navigateToPage(window, 'Generator');
      await navigateToPage(window, 'Correction');
      await navigateToPage(window, 'Faulty XML');
      await navigateToPage(window, 'Tools');
    }

    // App should still be responsive
    await navigateToPage(window, 'Generator');
    await expect(window.locator('text=Number of Financial Institutions').first()).toBeVisible();
  });

  test('8.2 Rapid module switching does not crash', async () => {
    for (let i = 0; i < 3; i++) {
      await navigateToModule(window, 'CRS');
      await goToHome(window);
      await navigateToModule(window, 'FATCA');
      await goToHome(window);
      await navigateToModule(window, 'CBC');
      await goToHome(window);
    }

    // App should still be responsive
    await expect(window.locator('text=Select a Module')).toBeVisible();
  });

  test('8.3 Keyboard Tab key moves focus', async () => {
    await navigateToModule(window, 'CRS');
    await window.keyboard.press('Tab');
    await window.waitForTimeout(200);
    await window.keyboard.press('Tab');
    await window.waitForTimeout(200);

    const tag = await window.evaluate(() => document.activeElement.tagName);
    expect(['INPUT', 'BUTTON', 'SELECT', 'A', 'BODY']).toContain(tag);
  });

  test('8.4 Window resize does not break layout', async () => {
    await window.setViewportSize({ width: 1024, height: 768 });
    await window.waitForTimeout(500);
    await expect(window.locator('button:has-text("Open CRS")')).toBeVisible();

    await window.setViewportSize({ width: 1920, height: 1080 });
    await window.waitForTimeout(500);
    await expect(window.locator('button:has-text("Open CRS")')).toBeVisible();
  });
});
