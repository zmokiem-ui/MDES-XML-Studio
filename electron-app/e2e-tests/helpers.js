// Helper utilities for Electron E2E tests
const { _electron: electron } = require('playwright');
const path = require('path');

/**
 * Launch the Electron app in production mode (uses built dist, no DevTools)
 */
async function launchElectronApp() {
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '../electron/main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      E2E_TEST: 'true'
    }
  });

  // In production mode, there's only one window (no DevTools)
  const window = await electronApp.firstWindow();
  
  // Wait for app to be fully loaded
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(3000); // Give React time to hydrate
  
  return { electronApp, window };
}

/**
 * Close the Electron app
 */
async function closeElectronApp(electronApp) {
  await electronApp.close();
}

/**
 * Wait for element and click
 */
async function clickElement(window, selector, options = {}) {
  await window.waitForSelector(selector, { timeout: 10000, ...options });
  await window.click(selector);
}

/**
 * Fill input field
 */
async function fillInput(window, selector, value) {
  await window.waitForSelector(selector, { timeout: 10000 });
  await window.fill(selector, value);
}

/**
 * Select from dropdown
 */
async function selectOption(window, selector, value) {
  await window.waitForSelector(selector, { timeout: 10000 });
  await window.selectOption(selector, value);
}

/**
 * Wait for text to appear
 */
async function waitForText(window, text, options = {}) {
  await window.waitForSelector(`text=${text}`, { timeout: 10000, ...options });
}

/**
 * Check if element exists
 */
async function elementExists(window, selector) {
  try {
    await window.waitForSelector(selector, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Take screenshot
 */
async function takeScreenshot(window, name) {
  await window.screenshot({ 
    path: path.join(__dirname, '../e2e-test-results/screenshots', `${name}.png`),
    fullPage: true 
  });
}

/**
 * Get output directory for test files
 */
function getTestOutputDir() {
  return path.join(__dirname, '../../out/e2e_test_output');
}

/**
 * Wait for file to be created
 */
async function waitForFile(filePath, timeoutMs = 10000) {
  const fs = require('fs');
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (fs.existsSync(filePath)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
}

/**
 * Navigate to a module
 */
async function navigateToModule(window, moduleName) {
  // Click on "Open CRS" / "Open FATCA" / "Open CBC" button
  const btn = window.locator(`button:has-text("Open ${moduleName.toUpperCase()}")`);
  await btn.waitFor({ timeout: 10000 });
  await btn.click();
  await window.waitForTimeout(1500);
}

/**
 * Navigate to a page within a module
 */
async function navigateToPage(window, pageName) {
  // Click on nav button (Generator, Correction, Faulty XML, Tools)
  const btn = window.locator(`nav button:has-text("${pageName}")`);
  await btn.waitFor({ timeout: 10000 });
  await btn.click();
  await window.waitForTimeout(500);
}

/**
 * Go back to home
 */
async function goToHome(window) {
  const btn = window.locator('button[title="Back to module selection"]');
  await btn.waitFor({ timeout: 5000 });
  await btn.click();
  await window.waitForTimeout(1500);
}

module.exports = {
  launchElectronApp,
  closeElectronApp,
  clickElement,
  fillInput,
  selectOption,
  waitForText,
  elementExists,
  takeScreenshot,
  getTestOutputDir,
  waitForFile,
  navigateToModule,
  navigateToPage,
  goToHome
};
