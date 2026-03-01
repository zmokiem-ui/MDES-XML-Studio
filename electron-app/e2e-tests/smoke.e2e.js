// E2E Smoke Test - Quick validation of core UI functionality
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const {
  launchElectronApp,
  closeElectronApp,
  clickElement,
  fillInput,
  waitForText,
  navigateToModule,
  navigateToPage,
  goToHome,
  getTestOutputDir
} = require('./helpers');

test.describe('E2E Smoke Test', () => {
  let electronApp;
  let window;
  const outputDir = getTestOutputDir();

  test.beforeAll(async () => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  test.beforeEach(async () => {
    const app = await launchElectronApp();
    electronApp = app.electronApp;
    window = app.window;
  });

  test.afterEach(async () => {
    await closeElectronApp(electronApp);
  });

  test('1. App launches and shows module selection', async () => {
    await expect(window).toHaveTitle(/MDES XML Studio|Tax Reporting Generator|CRS Test Data Generator/);

    // Verify module cards
    await expect(window.locator('text=Common Reporting Standard')).toBeVisible();
    await expect(window.locator('text=Foreign Account Tax Compliance Act')).toBeVisible();
    await expect(window.locator('text=Country-by-Country Reporting')).toBeVisible();

    // Verify Open buttons
    await expect(window.locator('button:has-text("Open CRS")')).toBeVisible();
    await expect(window.locator('button:has-text("Open FATCA")')).toBeVisible();
    await expect(window.locator('button:has-text("Open CBC")')).toBeVisible();

    // Verify footer
    await expect(window.locator('text=More modules coming soon')).toBeVisible();
  });

  test('2. CRS Module - Navigate and verify form', async () => {
    await navigateToModule(window, 'CRS');
    await window.waitForTimeout(1000);

    // Verify tabs exist
    await expect(window.locator('button:has-text("Generator")')).toBeVisible();
    await expect(window.locator('button:has-text("Correction")')).toBeVisible();
    await expect(window.locator('button:has-text("Faulty XML")')).toBeVisible();
    await expect(window.locator('button:has-text("Tools")')).toBeVisible();

    // Verify generator form fields
    await expect(window.locator('text=Number of Financial Institutions').first()).toBeVisible();
    await expect(window.locator('text=Individual Accounts').first()).toBeVisible();

    // Verify Generate button
    const generateBtn = window.locator('button:has-text("Generate CRS")');
    await expect(generateBtn).toBeVisible();
  });

  test('3. FATCA Module - Navigate and verify form', async () => {
    await navigateToModule(window, 'FATCA');
    await window.waitForTimeout(1000);

    // Verify tabs
    await expect(window.locator('button:has-text("Generator")')).toBeVisible();
    await expect(window.locator('button:has-text("Correction")')).toBeVisible();
    await expect(window.locator('button:has-text("Faulty XML")')).toBeVisible();

    // Verify FATCA-specific fields
    await expect(window.locator('text=Sending Company GIIN').first()).toBeVisible();
    await expect(window.locator('text=Filer Category').first()).toBeVisible();
  });

  test('4. CBC Module - Navigate and verify form', async () => {
    await navigateToModule(window, 'CBC');
    await window.waitForTimeout(1000);

    // Verify tabs
    await expect(window.locator('button:has-text("Generator")')).toBeVisible();
    await expect(window.locator('button:has-text("Correction")')).toBeVisible();
    await expect(window.locator('button:has-text("Faulty XML")')).toBeVisible();

    // Verify CBC-specific fields
    await expect(window.locator('text=MNE Group Name').first()).toBeVisible();
    await expect(window.locator('text=Reporting Entity (MNE)').first()).toBeVisible();
  });

  test('5. Faulty XML Generator - CRS presets', async () => {
    await navigateToModule(window, 'CRS');
    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);

    // Verify Error Injector UI
    await expect(window.locator('text=Faulty XML Generator - CRS Module')).toBeVisible();
    await expect(window.locator('text=Upload File').first()).toBeVisible();
    await expect(window.locator('text=Corruption Intensity').first()).toBeVisible();

    // Verify presets are visible
    await expect(window.locator('text=Missing Required Fields').first()).toBeVisible();
    await expect(window.locator('text=Invalid Date Formats').first()).toBeVisible();
    await expect(window.locator('text=Invalid Country Codes').first()).toBeVisible();
    await expect(window.locator('text=Malformed XML Structure').first()).toBeVisible();
  });

  test('6. Theme Toggle', async () => {
    // Navigate to CRS module to access the theme cycle button in the header
    await navigateToModule(window, 'CRS');
    await window.waitForTimeout(500);

    // Find the theme toggle button in the module header
    const themeBtn = window.locator('button[title="Click to change theme"]');
    await themeBtn.waitFor({ timeout: 10000 });

    // Get initial theme name
    const initialText = await themeBtn.textContent();

    // Click to cycle to next theme
    await themeBtn.click();
    await window.waitForTimeout(500);

    // Verify theme text changed
    const newText = await themeBtn.textContent();
    expect(initialText).not.toBe(newText);
  });

  test('7. Navigation - Home button returns to module selection', async () => {
    await navigateToModule(window, 'CRS');
    await window.waitForTimeout(1000);

    // Go back to home
    await goToHome(window);
    await window.waitForTimeout(1000);

    // Verify we're back at module selection
    await expect(window.locator('text=Select a Module')).toBeVisible();
    await expect(window.locator('text=Common Reporting Standard')).toBeVisible();
  });

  test('8. Tab Navigation within CRS', async () => {
    await navigateToModule(window, 'CRS');
    await window.waitForTimeout(500);

    // Generator tab
    await navigateToPage(window, 'Generator');
    await expect(window.locator('text=Number of Financial Institutions').first()).toBeVisible();

    // Correction tab
    await navigateToPage(window, 'Correction');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Source XML File').first()).toBeVisible();

    // Faulty XML tab
    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Faulty XML Generator - CRS Module')).toBeVisible();

    // Tools tab
    await navigateToPage(window, 'Tools');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Country Code Replacer').first()).toBeVisible();
  });

  test('9. Error Injector preset selection', async () => {
    await navigateToModule(window, 'CRS');
    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);

    // Click a preset
    const preset = window.locator('button:has-text("Missing Required Fields")');
    await preset.click();
    await window.waitForTimeout(500);

    // Verify options checkboxes appear
    await expect(window.locator('text=Options:').first()).toBeVisible();

    // Test intensity slider
    const slider = window.locator('input[type="range"]');
    await expect(slider).toBeVisible();
    await slider.fill('5');
    await expect(window.locator('text=Level 5')).toBeVisible();
    await expect(window.locator('text=Fatal errors')).toBeVisible();
  });

  test('10. All modules have Faulty XML tab', async () => {
    // CRS
    await navigateToModule(window, 'CRS');
    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Faulty XML Generator - CRS Module')).toBeVisible();
    await goToHome(window);
    await window.waitForTimeout(500);

    // FATCA
    await navigateToModule(window, 'FATCA');
    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Faulty XML Generator - FATCA Module')).toBeVisible();
    await goToHome(window);
    await window.waitForTimeout(500);

    // CBC
    await navigateToModule(window, 'CBC');
    await navigateToPage(window, 'Faulty XML');
    await window.waitForTimeout(500);
    await expect(window.locator('text=Faulty XML Generator - CBC Module')).toBeVisible();
  });
});
