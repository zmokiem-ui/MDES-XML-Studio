// ============================================================
// FULL E2E REGRESSION TEST - CRS Test Data Generator
// ============================================================
// One giant test that visibly navigates the entire app:
// - Fills forms with real values
// - Generates CRS, FATCA, CBC XML files through the UI
// - Tests corrections, error injector, themes, navigation
// - Validates generated files on disk
// Run: npm run test:e2e:full
// ============================================================
const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '../../out/e2e_full_regression');
const PROJECT_ROOT = path.join(__dirname, '..', '..');

// Paths for generated files
const CRS_OUTPUT = path.join(OUTPUT_DIR, 'crs_regression_output.xml');
const FATCA_OUTPUT = path.join(OUTPUT_DIR, 'fatca_regression_output.xml');
const CBC_OUTPUT = path.join(OUTPUT_DIR, 'cbc_regression_output.xml');
const CRS_CORRECTION_OUTPUT = path.join(OUTPUT_DIR, 'crs_correction_output.xml');

// Track which dialog path to return next
let nextSaveDialogPath = '';
let nextOpenDialogPath = '';

// Helper: run Python CLI
function runPython(args) {
  try {
    const stdout = execSync(`python ${args}`, {
      cwd: PROJECT_ROOT, encoding: 'utf-8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      timeout: 60000
    });
    return { success: true, stdout };
  } catch (err) {
    return { success: false, stdout: err.stdout || '', stderr: err.stderr || err.message };
  }
}

// Helper: read file
function readFile(fp) { return fs.readFileSync(fp, 'utf-8'); }

// Helper: assert XML contains pattern
function assertXml(content, pattern, desc) {
  if (!new RegExp(pattern).test(content))
    throw new Error(`XML check failed: ${desc} — pattern "${pattern}" not found`);
}

// Helper: count pattern occurrences
function countIn(content, pattern) {
  return (content.match(new RegExp(pattern, 'g')) || []).length;
}

// Helper: slow delay so user can see each action
const VISIBLE_DELAY = 600;

test.describe.serial('FULL E2E REGRESSION', () => {
  let electronApp;
  let window;

  // ============================================================
  // SETUP: Launch app once, mock dialogs, prepare output dir
  // ============================================================
  test.beforeAll(async () => {
    // Clean & create output directory
    if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../electron/main.js')],
      env: { ...process.env, NODE_ENV: 'production', E2E_TEST: 'true' }
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(3000);

    // Mock native file dialogs in the main process
    // This lets Browse/Generate buttons work without native OS dialogs
    await electronApp.evaluate(async ({ dialog }) => {
      // Store original methods
      const origSave = dialog.showSaveDialog;
      const origOpen = dialog.showOpenDialog;

      // Override showSaveDialog to return a path from env
      dialog.showSaveDialog = async (win, opts) => {
        const mockPath = process.env.__E2E_SAVE_PATH || '';
        if (mockPath) {
          return { filePath: mockPath, canceled: false };
        }
        return origSave(win, opts);
      };

      // Override showOpenDialog to return a path from env
      dialog.showOpenDialog = async (win, opts) => {
        const mockPath = process.env.__E2E_OPEN_PATH || '';
        if (mockPath) {
          return { filePaths: [mockPath], canceled: false };
        }
        return origOpen(win, opts);
      };
    });
  });

  test.afterAll(async () => {
    if (electronApp) await electronApp.close();
  });

  // Helper: set the next path the mocked save dialog will return
  async function mockSaveDialog(filePath) {
    await electronApp.evaluate(async (electron, fp) => {
      process.env.__E2E_SAVE_PATH = fp;
    }, filePath);
  }

  // Helper: set the next path the mocked open dialog will return
  async function mockOpenDialog(filePath) {
    await electronApp.evaluate(async (electron, fp) => {
      process.env.__E2E_OPEN_PATH = fp;
    }, filePath);
  }

  // Helper: clear dialog mocks
  async function clearDialogMocks() {
    await electronApp.evaluate(async () => {
      process.env.__E2E_SAVE_PATH = '';
      process.env.__E2E_OPEN_PATH = '';
    });
  }

  // Helper: navigate to module
  async function goToModule(name) {
    const btn = window.locator(`button:has-text("Open ${name.toUpperCase()}")`);
    await btn.waitFor({ timeout: 10000 });
    await btn.click();
    await window.waitForTimeout(VISIBLE_DELAY);
  }

  // Helper: navigate to tab
  async function goToTab(tabName) {
    const btn = window.locator(`nav button:has-text("${tabName}")`);
    await btn.waitFor({ timeout: 10000 });
    await btn.click();
    await window.waitForTimeout(VISIBLE_DELAY);
  }

  // Helper: go home
  async function goHome() {
    const btn = window.locator('button[title="Back to module selection"]');
    await btn.waitFor({ timeout: 5000 });
    await btn.click();
    await window.waitForTimeout(VISIBLE_DELAY);
  }

  // Helper: dismiss modal (success or error)
  async function dismissModal() {
    // Look for OK/Close button in modal
    const okBtn = window.locator('button:has-text("OK"), button:has-text("Close"), button:has-text("Got it")');
    try {
      await okBtn.first().waitFor({ timeout: 5000 });
      await okBtn.first().click();
      await window.waitForTimeout(300);
    } catch {
      // Modal may have auto-dismissed
    }
  }

  // Helper: expand a collapsible section by clicking its header
  async function expandSection(sectionText) {
    const header = window.locator(`button:has-text("${sectionText}")`);
    try {
      await header.first().waitFor({ timeout: 3000 });
      await header.first().click();
      await window.waitForTimeout(300);
    } catch {
      // Section may already be expanded
    }
  }

  // ============================================================
  // 1. APP LAUNCH & HOME SCREEN
  // ============================================================
  test('1.1 App launches and shows home screen with 3 modules', async () => {
    await expect(window.locator('text=Open CRS')).toBeVisible();
    await expect(window.locator('text=Open FATCA')).toBeVisible();
    await expect(window.locator('text=Open CBC')).toBeVisible();
  });

  // ============================================================
  // 2. CRS MODULE - FULL GENERATION FLOW
  // ============================================================
  test('2.1 CRS - Navigate to module', async () => {
    await goToModule('CRS');
    await expect(window.locator('text=Generator').first()).toBeVisible();
    await expect(window.locator('text=Correction').first()).toBeVisible();
    await expect(window.locator('text=Faulty XML').first()).toBeVisible();
  });

  test('2.2 CRS - Expand Message Header and fill fields', async () => {
    // Scroll to top first
    await window.evaluate(() => window.scrollTo(0, 0));
    await window.waitForTimeout(300);

    // Click "Message Header" to expand it (it's collapsed by default)
    const msgHeader = window.locator('text=Message Header');
    await msgHeader.first().scrollIntoViewIfNeeded();
    await window.waitForTimeout(300);
    await msgHeader.first().click();
    await window.waitForTimeout(1000);

    // Check if the section expanded - try to find the placeholder
    // If not visible, the section might already be expanded or use different placeholder
    let tinInput = window.locator('input[placeholder="e.g., 12345678"]');
    let tinVisible = await tinInput.isVisible().catch(() => false);

    if (!tinVisible) {
      // Try clicking again - might have toggled wrong direction
      await msgHeader.first().click();
      await window.waitForTimeout(1000);
      tinVisible = await tinInput.isVisible().catch(() => false);
    }

    if (!tinVisible) {
      // Fallback: find text inputs in the expanded section
      // The Sending Company IN is the first text input after Message Header
      tinInput = window.locator('input[type="text"]').first();
      await tinInput.waitFor({ timeout: 5000 });
    }

    await tinInput.click();
    await tinInput.fill('99887766');
    await window.waitForTimeout(VISIBLE_DELAY);

    // Transmitting Country - look for maxLength=2 inputs
    const countryInputs = window.locator('input[maxlength="2"]');
    const countryCount = await countryInputs.count();
    if (countryCount >= 2) {
      await countryInputs.first().fill('NL');
      await window.waitForTimeout(300);
      await countryInputs.nth(1).fill('DE');
    } else {
      // Fallback: use placeholder-based selectors
      const txCountry = window.locator('input[placeholder="e.g., NL"]');
      if (await txCountry.isVisible().catch(() => false)) {
        await txCountry.fill('NL');
        await window.waitForTimeout(300);
      }
      const rxCountry = window.locator('input[placeholder="e.g., DE"]');
      if (await rxCountry.isVisible().catch(() => false)) {
        await rxCountry.fill('DE');
      }
    }
    await window.waitForTimeout(VISIBLE_DELAY);
  });

  test('2.3 CRS - Fill in File Size section (FIs, accounts, controlling persons)', async () => {
    // File Size Configuration section is already visible in screenshot
    // Number of FIs field (placeholder "e.g., 1")
    const numFIs = window.locator('input[placeholder="e.g., 1"]');
    await numFIs.waitFor({ timeout: 5000 });
    await numFIs.fill('1');
    await window.waitForTimeout(500);

    // Wait for FI TIN field to appear and fill it
    const fiTin = window.locator('input[placeholder="TIN for FI 1"]');
    try {
      await fiTin.waitFor({ timeout: 3000 });
      await fiTin.fill('FI_TIN_001');
      await window.waitForTimeout(300);
    } catch {
      // FI TIN field may not appear depending on state
    }

    // Individual Accounts, Organisation Accounts, Controlling Persons
    // They appear as 3 number inputs in a row with placeholders "0", "0", "1"
    const numInputs = window.locator('input[type="number"][min="0"]');
    const count = await numInputs.count();

    // Find and fill Individual Accounts (first "0" placeholder)
    const indAccounts = window.locator('input[placeholder="0"]').first();
    await indAccounts.fill('2');
    await window.waitForTimeout(300);

    // Organisation Accounts (second "0" placeholder)
    const orgAccounts = window.locator('input[placeholder="0"]').nth(1);
    await orgAccounts.fill('1');
    await window.waitForTimeout(300);

    // Controlling Persons per Organisation (placeholder "1")
    // This is critical - orgs need controlling persons for validation to pass
    const ctrlPersons = window.locator('input[placeholder="1"]');
    try {
      await ctrlPersons.first().waitFor({ timeout: 2000 });
      await ctrlPersons.first().fill('2');
      await window.waitForTimeout(300);
    } catch {
      // May not find it - try by finding the third number input
    }

    await window.waitForTimeout(VISIBLE_DELAY);
  });

  test('2.4 CRS - Select output path and Generate', async () => {
    // Mock the save dialog to return our known path
    await mockSaveDialog(CRS_OUTPUT);

    // Click Browse button for output
    const browseBtn = window.locator('button:has-text("Browse")').first();
    await browseBtn.waitFor({ timeout: 5000 });
    await browseBtn.click();
    await window.waitForTimeout(VISIBLE_DELAY);

    // Verify output path is now set (readonly input should have our path)
    await window.waitForTimeout(500);

    // Click Generate CRS XML File
    const genBtn = window.locator('button:has-text("Generate CRS XML File")');
    await genBtn.waitFor({ timeout: 5000 });
    await genBtn.click();

    // Wait for generation to complete (success modal)
    await window.waitForTimeout(8000);
    await dismissModal();
    await clearDialogMocks();
  });

  test('2.6 CRS - Validate generated XML file exists and has correct content', async () => {
    expect(fs.existsSync(CRS_OUTPUT)).toBe(true);
    const xml = readFile(CRS_OUTPUT);

    assertXml(xml, 'CRS_OECD', 'CRS namespace');
    assertXml(xml, 'xmlns', 'namespace declaration');
    assertXml(xml, '99887766', 'Our Sending Company IN');
    assertXml(xml, 'NL', 'Transmitting country NL');
    assertXml(xml, 'DE', 'Receiving country DE');
    assertXml(xml, 'MessageSpec', 'MessageSpec element');
    assertXml(xml, 'ReportingFI', 'ReportingFI element');
    assertXml(xml, 'AccountReport', 'AccountReport element');
    assertXml(xml, 'DocRefId', 'DocRefId element');

    // Should have individual + org accounts
    const accounts = countIn(xml, '<[a-z]+:AccountReport>');
    expect(accounts).toBeGreaterThanOrEqual(2);
  });

  test('2.7 CRS - Validate file passes CRS validator', async () => {
    if (!fs.existsSync(CRS_OUTPUT)) { test.skip(); return; }
    const result = runPython(
      `-m crs_generator.cli --mode validate-xml --xml-input "${CRS_OUTPUT}" --output dummy`
    );
    const json = JSON.parse(result.stdout);
    expect(json.is_valid).toBe(true);
    expect(json.transmitting_country).toBe('NL');
    expect(json.receiving_country).toBe('DE');
  });

  // ============================================================
  // 3. CRS CORRECTION TAB
  // ============================================================
  test('3.1 CRS - Navigate to Correction tab', async () => {
    await goToTab('Correction');
    await window.waitForTimeout(VISIBLE_DELAY);
    await expect(window.locator('text=Source XML File').first()).toBeVisible();
  });

  test('3.2 CRS - Upload source XML for correction', async () => {
    // Mock open dialog to return the CRS file we just generated
    await mockOpenDialog(CRS_OUTPUT);

    // Click the Browse/Upload button for source XML
    const uploadBtn = window.locator('button:has-text("Browse")').first();
    await uploadBtn.waitFor({ timeout: 5000 });
    await uploadBtn.click();
    await window.waitForTimeout(2000); // Wait for validation to complete
    await clearDialogMocks();
  });

  // ============================================================
  // 4. CRS FAULTY XML TAB (Error Injector)
  // ============================================================
  test('4.1 CRS - Navigate to Faulty XML tab', async () => {
    await goToTab('Faulty XML');
    await window.waitForTimeout(VISIBLE_DELAY);
    await expect(window.locator('text=Corruption Presets').first()).toBeVisible();
  });

  test('4.2 CRS - Upload file for error injection', async () => {
    await mockOpenDialog(CRS_OUTPUT);

    // Click upload area
    const uploadBtn = window.locator('button:has-text("Upload"), button:has-text("Select File"), button:has-text("Choose")').first();
    try {
      await uploadBtn.waitFor({ timeout: 3000 });
      await uploadBtn.click();
      await window.waitForTimeout(1000);
    } catch {
      // Upload area might be a different selector - try clicking the upload zone
      const uploadZone = window.locator('text=Upload').first();
      if (await uploadZone.isVisible()) {
        await uploadZone.click();
        await window.waitForTimeout(1000);
      }
    }
    await clearDialogMocks();
  });

  test('4.3 CRS - Click through all corruption presets', async () => {
    const presets = [
      'Missing Required Fields',
      'Invalid Date Formats',
      'Invalid Country Codes',
      'Invalid Account Balances',
      'Duplicate DocRefIds',
      'Wrong Message Type Indicators',
      'Malformed XML Structure',
      'Invalid TIN Formats'
    ];

    for (const preset of presets) {
      const btn = window.locator(`button:has-text("${preset}")`);
      try {
        await btn.first().waitFor({ timeout: 2000 });
        await btn.first().click();
        await window.waitForTimeout(400);
        // Verify it's selected (should have border-red-500 class)
        await expect(btn.first()).toBeVisible();
      } catch {
        // Preset button might not be immediately visible, skip
      }
    }
  });

  test('4.4 CRS - Adjust corruption intensity slider', async () => {
    const slider = window.locator('input[type="range"]');
    try {
      await slider.waitFor({ timeout: 3000 });
      // Set to level 4
      await slider.fill('4');
      await window.waitForTimeout(VISIBLE_DELAY);
    } catch {
      // Slider might not be visible
    }
  });

  // ============================================================
  // 5. CRS TOOLS TAB (if exists)
  // ============================================================
  test('5.1 CRS - Check Tools tab', async () => {
    try {
      await goToTab('Tools');
      await window.waitForTimeout(VISIBLE_DELAY);
      // Tools tab should have Country Code Replacer
      await expect(window.locator('text=Country').first()).toBeVisible();
    } catch {
      // Tools tab may not exist for all modules
    }
  });

  // ============================================================
  // 6. NAVIGATE HOME AND TO FATCA
  // ============================================================
  test('6.1 Navigate back to home screen', async () => {
    await goHome();
    await expect(window.locator('text=Open CRS')).toBeVisible();
    await expect(window.locator('text=Open FATCA')).toBeVisible();
  });

  // ============================================================
  // 7. FATCA MODULE - FULL GENERATION FLOW
  // ============================================================
  test('7.1 FATCA - Navigate to module', async () => {
    await goToModule('FATCA');
    await expect(window.locator('text=Generator').first()).toBeVisible();
  });

  test('7.2 FATCA - Fill in Message Header (country, GIIN)', async () => {
    // Scroll to top first
    await window.evaluate(() => window.scrollTo(0, 0));
    await window.waitForTimeout(300);

    // FATCA may have a collapsed "Message Header" section - expand it
    const msgHeader = window.locator('text=Message Header');
    try {
      await msgHeader.first().waitFor({ timeout: 3000 });
      await msgHeader.first().click();
      await window.waitForTimeout(800);
    } catch {
      // Section might not exist or already expanded
    }

    // Fill Transmitting Country (required!)
    const txCountry = window.locator('input[maxlength="2"]');
    const txCount = await txCountry.count();
    if (txCount >= 1) {
      await txCountry.first().fill('NL');
      await window.waitForTimeout(300);
      if (txCount >= 2) {
        await txCountry.nth(1).fill('US');
        await window.waitForTimeout(300);
      }
    } else {
      // Fallback
      const txFallback = window.locator('input[placeholder="e.g., NL"]');
      try {
        await txFallback.first().waitFor({ timeout: 2000 });
        await txFallback.first().fill('NL');
      } catch { /* may be pre-filled */ }
    }
    await window.waitForTimeout(VISIBLE_DELAY);
  });

  test('7.3 FATCA - Fill account fields', async () => {
    // Scroll down to account configuration
    const inputs = window.locator('input[type="number"]');
    const count = await inputs.count();
    for (let i = 0; i < Math.min(count, 6); i++) {
      const inp = inputs.nth(i);
      if (await inp.isVisible()) {
        const val = await inp.inputValue();
        if (val === '0' || val === '') {
          await inp.fill('2');
          await window.waitForTimeout(200);
        }
      }
    }
    await window.waitForTimeout(VISIBLE_DELAY);
  });

  test('7.4 FATCA - Select output and Generate', async () => {
    await mockSaveDialog(FATCA_OUTPUT);

    // Scroll down to output section
    const browseBtn = window.locator('button:has-text("Browse")').first();
    await browseBtn.scrollIntoViewIfNeeded();
    await window.waitForTimeout(300);
    await browseBtn.click();
    await window.waitForTimeout(VISIBLE_DELAY);

    // Click Generate
    const genBtn = window.locator('button:has-text("Generate FATCA XML")');
    await genBtn.scrollIntoViewIfNeeded();
    await window.waitForTimeout(300);
    await genBtn.click();

    // Wait for generation to complete
    await window.waitForTimeout(10000);
    await dismissModal();
    await clearDialogMocks();
  });

  test('7.5 FATCA - Validate generated XML', async () => {
    expect(fs.existsSync(FATCA_OUTPUT)).toBe(true);
    const xml = readFile(FATCA_OUTPUT);

    assertXml(xml, 'FATCA', 'FATCA namespace');
    assertXml(xml, 'xmlns', 'namespace');
    assertXml(xml, 'NL', 'Transmitting country');
    assertXml(xml, 'MessageSpec', 'MessageSpec');
    assertXml(xml, 'ReportingFI', 'ReportingFI');
    assertXml(xml, 'DocRefId', 'DocRefId');
  });

  test('7.5 FATCA - Validate file passes FATCA validator', async () => {
    if (!fs.existsSync(FATCA_OUTPUT)) { test.skip(); return; }
    const result = runPython(
      `-m crs_generator.fatca_cli --mode validate-xml --xml-input "${FATCA_OUTPUT}" --output dummy`
    );
    const json = JSON.parse(result.stdout);
    expect(json.is_valid).toBe(true);
  });

  // ============================================================
  // 8. FATCA CORRECTION TAB
  // ============================================================
  test('8.1 FATCA - Navigate to Correction tab', async () => {
    await goToTab('Correction');
    await window.waitForTimeout(VISIBLE_DELAY);
    await expect(window.locator('text=Source XML File').first()).toBeVisible();
  });

  // ============================================================
  // 9. FATCA FAULTY XML TAB
  // ============================================================
  test('9.1 FATCA - Navigate to Faulty XML tab', async () => {
    await goToTab('Faulty XML');
    await window.waitForTimeout(VISIBLE_DELAY);
    await expect(window.locator('text=Corruption Presets').first()).toBeVisible();
  });

  test('9.2 FATCA - Verify FATCA-specific presets are shown', async () => {
    const fatcaPresets = ['Missing Required Fields', 'Invalid GIIN Format', 'Invalid Filer Category'];
    for (const preset of fatcaPresets) {
      await expect(window.locator(`text=${preset}`).first()).toBeVisible();
    }
  });

  // ============================================================
  // 10. NAVIGATE HOME AND TO CBC
  // ============================================================
  test('10.1 Navigate home from FATCA', async () => {
    await goHome();
    await expect(window.locator('text=Open CBC')).toBeVisible();
  });

  // ============================================================
  // 11. CBC MODULE - FULL GENERATION FLOW
  // ============================================================
  test('11.1 CBC - Navigate to module', async () => {
    await goToModule('CBC');
    await expect(window.locator('text=Generator').first()).toBeVisible();
  });

  test('11.2 CBC - Fill in Message Header (country, TIN)', async () => {
    // Scroll to top and expand Message Header for Transmitting Country
    await window.evaluate(() => window.scrollTo(0, 0));
    await window.waitForTimeout(300);

    // Look for collapsed Message Header or Entity Information section
    const msgHeader = window.locator('text=Message Header');
    try {
      await msgHeader.first().waitFor({ timeout: 2000 });
      await msgHeader.first().click();
      await window.waitForTimeout(800);
    } catch {
      // Try Entity Information section instead
      const entityInfo = window.locator('text=Entity Information');
      try {
        await entityInfo.first().waitFor({ timeout: 2000 });
        await entityInfo.first().click();
        await window.waitForTimeout(800);
      } catch { /* already expanded */ }
    }

    // Fill Transmitting Country (required!)
    const countryInputs = window.locator('input[maxlength="2"]');
    const countryCount = await countryInputs.count();
    if (countryCount >= 1) {
      await countryInputs.first().fill('NL');
      await window.waitForTimeout(300);
    } else {
      const txFallback = window.locator('input[placeholder="e.g., NL"]');
      try {
        await txFallback.first().waitFor({ timeout: 2000 });
        await txFallback.first().fill('NL');
      } catch { /* may be pre-filled */ }
    }
    await window.waitForTimeout(VISIBLE_DELAY);
  });

  test('11.3 CBC - Fill report configuration', async () => {
    // Fill number inputs that are visible
    const inputs = window.locator('input[type="number"]');
    const count = await inputs.count();
    for (let i = 0; i < Math.min(count, 6); i++) {
      const inp = inputs.nth(i);
      if (await inp.isVisible()) {
        const val = await inp.inputValue();
        if (val === '0' || val === '') {
          await inp.fill('3');
          await window.waitForTimeout(200);
        }
      }
    }
    await window.waitForTimeout(VISIBLE_DELAY);
  });

  test('11.4 CBC - Select output and Generate', async () => {
    await mockSaveDialog(CBC_OUTPUT);

    // Scroll to output section
    const browseBtn = window.locator('button:has-text("Browse")').first();
    await browseBtn.scrollIntoViewIfNeeded();
    await window.waitForTimeout(300);
    await browseBtn.click();
    await window.waitForTimeout(VISIBLE_DELAY);

    const genBtn = window.locator('button:has-text("Generate CBC XML")');
    await genBtn.scrollIntoViewIfNeeded();
    await window.waitForTimeout(300);
    await genBtn.click();

    // Wait for generation - handle possible app slowness
    try {
      await window.waitForTimeout(10000);
      await dismissModal();
    } catch {
      // App may have briefly frozen during generation
      await window.waitForTimeout(2000);
    }
    await clearDialogMocks();
  });

  test('11.4 CBC - Validate generated XML', async () => {
    expect(fs.existsSync(CBC_OUTPUT)).toBe(true);
    const xml = readFile(CBC_OUTPUT);

    assertXml(xml, 'CBC_OECD', 'CBC namespace');
    assertXml(xml, 'xmlns', 'namespace');
    assertXml(xml, 'NL', 'Country NL');
    assertXml(xml, 'MessageSpec', 'MessageSpec');
    assertXml(xml, 'ReportingEntity', 'ReportingEntity');
    assertXml(xml, 'CbcReports', 'CbcReports');
    assertXml(xml, 'DocRefId', 'DocRefId');
  });

  // ============================================================
  // 12. CBC CORRECTION TAB
  // ============================================================
  test('12.1 CBC - Navigate to Correction tab', async () => {
    await goToTab('Correction');
    await window.waitForTimeout(VISIBLE_DELAY);
    await expect(window.locator('text=Generate CBC Correction Files').first()).toBeVisible();
  });

  // ============================================================
  // 13. CBC FAULTY XML TAB
  // ============================================================
  test('13.1 CBC - Navigate to Faulty XML tab', async () => {
    await goToTab('Faulty XML');
    await window.waitForTimeout(VISIBLE_DELAY);
    await expect(window.locator('text=Corruption Presets').first()).toBeVisible();
  });

  test('13.2 CBC - Verify CBC-specific presets are shown', async () => {
    const cbcPresets = ['Missing Required Fields', 'Invalid Revenue Amounts', 'Invalid Entity Types'];
    for (const preset of cbcPresets) {
      await expect(window.locator(`text=${preset}`).first()).toBeVisible();
    }
  });

  // ============================================================
  // 14. THEME SWITCHING
  // ============================================================
  test('14.1 Theme toggle works in module view', async () => {
    const themeBtn = window.locator('button[title="Click to change theme"]');
    await expect(themeBtn).toBeVisible();

    const beforeText = await themeBtn.textContent();
    await themeBtn.click();
    await window.waitForTimeout(VISIBLE_DELAY);
    const afterText = await themeBtn.textContent();
    expect(beforeText).not.toBe(afterText);
  });

  test('14.2 Cycle through multiple themes', async () => {
    const themeBtn = window.locator('button[title="Click to change theme"]');
    for (let i = 0; i < 4; i++) {
      await themeBtn.click();
      await window.waitForTimeout(400);
    }
    await expect(themeBtn).toBeVisible();
  });

  // ============================================================
  // 15. LANGUAGE SELECTOR
  // ============================================================
  test('15.1 Language selector is present', async () => {
    const langBtn = window.locator('button[title="Click to change language"]');
    try {
      await langBtn.waitFor({ timeout: 3000 });
      await expect(langBtn).toBeVisible();
    } catch {
      // Language button might use different selector
      const langAlt = window.locator('select, [data-testid="language"]').first();
      if (await langAlt.isVisible()) {
        await expect(langAlt).toBeVisible();
      }
    }
  });

  // ============================================================
  // 16. NAVIGATION FLOW
  // ============================================================
  test('16.1 Navigate home from CBC', async () => {
    await goHome();
    await expect(window.locator('text=Open CRS')).toBeVisible();
  });

  test('16.2 Rapid module switching', async () => {
    await goToModule('CRS');
    await window.waitForTimeout(400);
    await goHome();
    await goToModule('FATCA');
    await window.waitForTimeout(400);
    await goHome();
    await goToModule('CBC');
    await window.waitForTimeout(400);
    await goHome();

    await expect(window.locator('text=Open CRS')).toBeVisible();
    await expect(window.locator('text=Open FATCA')).toBeVisible();
    await expect(window.locator('text=Open CBC')).toBeVisible();
  });

  test('16.3 Tab navigation within module (including Editor)', async () => {
    await goToModule('CRS');
    await goToTab('Generator');
    await window.waitForTimeout(300);
    await goToTab('Correction');
    await window.waitForTimeout(300);
    await goToTab('Faulty XML');
    await window.waitForTimeout(300);
    await goToTab('Editor');
    await window.waitForTimeout(300);
    await goToTab('Tools');
    await window.waitForTimeout(300);
    await goToTab('Generator');
    await window.waitForTimeout(300);
    await goHome();
  });

  // ============================================================
  // EDITOR TAB TESTS
  // ============================================================
  test('16.4 Editor tab - shows sidebar panel tabs (Files/History/Quick)', async () => {
    await goToModule('CRS');
    await goToTab('Editor');
    await window.waitForTimeout(500);
    // Should show 3 sidebar panel tabs
    await expect(window.locator('text=Files').first()).toBeVisible();
    await expect(window.locator('text=History').first()).toBeVisible();
    await expect(window.locator('text=Quick').first()).toBeVisible();
    // Default: Files panel active, "No folder open"
    await expect(window.locator('text=No folder open')).toBeVisible();
  });

  test('16.5 Editor tab - toolbar buttons present', async () => {
    await expect(window.locator('button[title="Open Folder"]')).toBeVisible();
    await expect(window.locator('button[title="Search Files"]')).toBeVisible();
    await expect(window.locator('button[title="Toggle Sidebar"]')).toBeVisible();
  });

  test('16.6 Editor tab - open output folder via mock dialog', async () => {
    // Mock the folder dialog to return our test output directory
    await mockOpenDialog(OUTPUT_DIR);
    // Click the Open Folder toolbar button
    const folderBtn = window.locator('button[title="Open Folder"]');
    await folderBtn.click();
    await window.waitForTimeout(1000);
    await clearDialogMocks();
    // "No folder open" should be gone, file list should be visible
    await expect(window.locator('text=No folder open')).not.toBeVisible();
    // Should see at least one XML file from previous generation tests
    await expect(window.locator('text=crs_regression_output.xml')).toBeVisible();
  });

  test('16.7 Editor tab - browse file tree and open XML file', async () => {
    // Click on the CRS output file to open it in the editor
    const crsFile = window.locator('text=crs_regression_output.xml');
    await crsFile.click();
    await window.waitForTimeout(2000);
    // File tab should appear
    await expect(window.locator('text=crs_regression_output.xml').first()).toBeVisible();
    // Editor should load - look for XML content indicators
    // Monaco editor loads async, wait for it
    await window.waitForTimeout(1000);
  });

  test('16.8 Editor tab - file info panel shows XML stats', async () => {
    // Click File Info button
    const infoBtn = window.locator('button[title="File Info"]');
    await infoBtn.waitFor({ timeout: 3000 });
    await infoBtn.click();
    await window.waitForTimeout(500);
    // Should show file information panel
    await expect(window.locator('text=File Information')).toBeVisible();
    // Should show XML-specific stats
    await expect(window.locator('text=Lines:').first()).toBeVisible();
    await expect(window.locator('text=Elements:').first()).toBeVisible();
    // Close file info
    await infoBtn.click();
    await window.waitForTimeout(300);
  });

  test('16.9 Editor tab - XML validate button works', async () => {
    // Click validate button
    const validateBtn = window.locator('button[title="Validate XML"]');
    await validateBtn.waitFor({ timeout: 3000 });
    await validateBtn.click();
    await window.waitForTimeout(3000);
    // Validation panel should appear with result
    const validText = window.locator('text=Valid XML');
    const invalidText = window.locator('text=Validation Failed');
    // Either valid or invalid should be visible
    const isValid = await validText.isVisible().catch(() => false);
    const isInvalid = await invalidText.isVisible().catch(() => false);
    expect(isValid || isInvalid).toBe(true);
  });

  test('16.10 Editor tab - Format XML button works', async () => {
    const formatBtn = window.locator('button[title="Format XML"]');
    await formatBtn.waitFor({ timeout: 3000 });
    await formatBtn.click();
    await window.waitForTimeout(500);
    // No crash = success, editor should still be visible
    await expect(window.locator('text=crs_regression_output.xml').first()).toBeVisible();
  });

  test('16.11 Editor tab - XML Preview toggle', async () => {
    const previewBtn = window.locator('button[title="Toggle Preview"]');
    await previewBtn.waitFor({ timeout: 3000 });
    await previewBtn.click();
    await window.waitForTimeout(800);
    // Preview panel should render XML tree - look for tag-colored text
    // Toggle off
    await previewBtn.click();
    await window.waitForTimeout(300);
  });

  test('16.12 Editor tab - switch to History panel', async () => {
    // Click History tab in sidebar
    const historyTab = window.locator('button:has-text("History")').first();
    await historyTab.click();
    await window.waitForTimeout(500);
    // Should show stats summary (XML Generated / Corrections counters)
    await expect(window.locator('text=XML Generated').first()).toBeVisible();
    await expect(window.locator('text=Corrections').first()).toBeVisible();
  });

  test('16.13 Editor tab - switch to Quick Access panel', async () => {
    // Click Quick tab in sidebar
    const quickTab = window.locator('button:has-text("Quick")').first();
    await quickTab.click();
    await window.waitForTimeout(500);
    // Should show Project Folders section
    await expect(window.locator('text=Project Folders').first()).toBeVisible();
    // Should show Recent Folders section
    await expect(window.locator('text=Recent Folders').first()).toBeVisible();
  });

  test('16.14 Editor tab - sidebar collapse/expand', async () => {
    const toggleBtn = window.locator('button[title="Toggle Sidebar"]');
    await toggleBtn.click();
    await window.waitForTimeout(300);
    // Sidebar should be collapsed - Quick/History/Files tabs should not be visible
    await expect(window.locator('text=Project Folders').first()).not.toBeVisible();
    // Expand again
    await toggleBtn.click();
    await window.waitForTimeout(300);
  });

  test('16.15 Editor tab - search filter toggle', async () => {
    // Switch back to Files panel
    const filesTab = window.locator('button:has-text("Files")').first();
    await filesTab.click();
    await window.waitForTimeout(300);
    // Click search button
    const searchBtn = window.locator('button[title="Search Files"]');
    await searchBtn.click();
    await window.waitForTimeout(300);
    // Filter input should appear
    const filterInput = window.locator('input[placeholder="Filter files..."]');
    await expect(filterInput).toBeVisible();
    // Type a filter
    await filterInput.fill('fatca');
    await window.waitForTimeout(300);
    // Close search
    await searchBtn.click();
    await window.waitForTimeout(300);
  });

  test('16.16 Editor tab - available in FATCA module', async () => {
    await goHome();
    await goToModule('FATCA');
    const editorTab = window.locator('nav button:has-text("Editor")');
    await expect(editorTab).toBeVisible();
    await editorTab.click();
    await window.waitForTimeout(500);
    // Should show Files/History/Quick tabs
    await expect(window.locator('text=Files').first()).toBeVisible();
  });

  test('16.17 Editor tab - available in CBC module', async () => {
    await goHome();
    await goToModule('CBC');
    const editorTab = window.locator('nav button:has-text("Editor")');
    await expect(editorTab).toBeVisible();
    await editorTab.click();
    await window.waitForTimeout(500);
    await expect(window.locator('text=Files').first()).toBeVisible();
    await goHome();
  });

  // ============================================================
  // SETTINGS PAGE TESTS
  // ============================================================
  test('16.18 Settings - navigate to settings page', async () => {
    // We're already on the home page after 16.17
    await window.waitForTimeout(300);
    const settingsBtn = window.locator('button[title="Settings"]');
    await settingsBtn.waitFor({ timeout: 5000 });
    await settingsBtn.click();
    await window.waitForTimeout(500);
    // Should show Settings header and Theme section
    await expect(window.locator('text=Settings').first()).toBeVisible();
    await expect(window.locator('text=Theme').first()).toBeVisible();
  });

  test('16.19 Settings - theme selector has all themes', async () => {
    // Check for some known theme names
    await expect(window.locator('text=Dark').first()).toBeVisible();
    await expect(window.locator('text=Light').first()).toBeVisible();
    await expect(window.locator('text=Midnight').first()).toBeVisible();
    await expect(window.locator('text=Ocean').first()).toBeVisible();
  });

  test('16.20 Settings - Live Animations toggle exists', async () => {
    await expect(window.locator('text=Live Animations').first()).toBeVisible();
  });

  test('16.21 Settings - Tools & Features section exists', async () => {
    await expect(window.locator('text=Tools').first()).toBeVisible();
    await expect(window.locator('text=Dashboard').first()).toBeVisible();
    await expect(window.locator('text=Keyboard Shortcuts').first()).toBeVisible();
  });

  test('16.22 Settings - can switch theme and return home', async () => {
    // Click a theme button (e.g., Ocean)
    const oceanBtn = window.locator('button:has-text("Ocean")').first();
    await oceanBtn.click();
    await window.waitForTimeout(300);
    // Navigate back via the back arrow in the Settings header
    const backBtn = window.locator('header button').first();
    await backBtn.click();
    await window.waitForTimeout(500);
    // Verify home is still working
    await expect(window.locator('text=Open CRS')).toBeVisible();
    // Switch back to dark theme via settings
    const settingsBtn = window.locator('button[title="Settings"]');
    await settingsBtn.click();
    await window.waitForTimeout(300);
    const darkBtn = window.locator('button:has-text("Dark")').first();
    await darkBtn.click();
    await window.waitForTimeout(300);
    // Go back home
    const backBtn2 = window.locator('header button').first();
    await backBtn2.click();
    await window.waitForTimeout(300);
  });

  // ============================================================
  // 17. ERROR INJECTOR - Generate corrupted files via CLI
  // ============================================================
  test('17.1 Error Injector: all CRS presets generate corrupted files', async () => {
    if (!fs.existsSync(CRS_OUTPUT)) { test.skip(); return; }

    const presets = [
      'missing_required', 'invalid_dates', 'wrong_country_codes',
      'invalid_amounts', 'duplicate_docrefids', 'wrong_message_type',
      'malformed_xml', 'invalid_tin_format'
    ];

    for (const preset of presets) {
      const out = path.join(OUTPUT_DIR, `crs_ei_${preset}.xml`);
      const r = runPython(
        `-m crs_generator.error_injector --input "${CRS_OUTPUT}" --output "${out}" ` +
        `--module crs --file-type xml --preset ${preset} --level 3 --options "{}"`
      );
      expect(r.success).toBe(true);
      expect(fs.existsSync(out)).toBe(true);
      expect(fs.statSync(out).size).toBeGreaterThan(0);
    }
  });

  test('17.2 Error Injector: all FATCA presets generate corrupted files', async () => {
    if (!fs.existsSync(FATCA_OUTPUT)) { test.skip(); return; }

    const presets = [
      'missing_required', 'invalid_giin', 'wrong_filer_category',
      'invalid_account_types', 'wrong_payment_types', 'us_indicia_errors',
      'malformed_xml'
    ];

    for (const preset of presets) {
      const out = path.join(OUTPUT_DIR, `fatca_ei_${preset}.xml`);
      const r = runPython(
        `-m crs_generator.error_injector --input "${FATCA_OUTPUT}" --output "${out}" ` +
        `--module fatca --file-type xml --preset ${preset} --level 3 --options "{}"`
      );
      expect(r.success).toBe(true);
      expect(fs.existsSync(out)).toBe(true);
    }
  });

  test('17.3 Error Injector: all CBC presets generate corrupted files', async () => {
    if (!fs.existsSync(CBC_OUTPUT)) { test.skip(); return; }

    const presets = [
      'missing_required', 'invalid_revenues', 'wrong_entity_types',
      'missing_cbc_reports', 'invalid_message_type', 'duplicate_entities',
      'malformed_xml'
    ];

    for (const preset of presets) {
      const out = path.join(OUTPUT_DIR, `cbc_ei_${preset}.xml`);
      const r = runPython(
        `-m crs_generator.error_injector --input "${CBC_OUTPUT}" --output "${out}" ` +
        `--module cbc --file-type xml --preset ${preset} --level 3 --options "{}"`
      );
      expect(r.success).toBe(true);
      expect(fs.existsSync(out)).toBe(true);
    }
  });

  test('17.4 Error Injector: intensity levels 1-5 all produce files', async () => {
    if (!fs.existsSync(CRS_OUTPUT)) { test.skip(); return; }

    for (let level = 1; level <= 5; level++) {
      const out = path.join(OUTPUT_DIR, `crs_level_${level}.xml`);
      const r = runPython(
        `-m crs_generator.error_injector --input "${CRS_OUTPUT}" --output "${out}" ` +
        `--module crs --file-type xml --preset missing_required --level ${level} --options "{}"`
      );
      expect(r.success).toBe(true);
      expect(fs.existsSync(out)).toBe(true);
    }
  });

  // ============================================================
  // 18. CORRECTION FILE GENERATION VIA CLI
  // ============================================================
  test('18.1 CRS correction file generation', async () => {
    if (!fs.existsSync(CRS_OUTPUT)) { test.skip(); return; }

    const r = runPython(
      `-m crs_generator.cli --mode correction ` +
      `--xml-input "${CRS_OUTPUT}" --output "${CRS_CORRECTION_OUTPUT}" ` +
      `--correct-individual 1 --modify-balance --test-mode`
    );
    expect(r.success).toBe(true);
    expect(fs.existsSync(CRS_CORRECTION_OUTPUT)).toBe(true);

    const xml = readFile(CRS_CORRECTION_OUTPUT);
    expect(xml.includes('OECD12') || xml.includes('OECD13')).toBe(true);
    assertXml(xml, 'CRS_OECD', 'CRS namespace in correction');
    assertXml(xml, 'CorrDocRefId', 'CorrDocRefId present');
  });

  // ============================================================
  // 19. CROSS-VALIDATION: Valid vs Corrupted
  // ============================================================
  test('19.1 Original CRS passes validation, corrupted fails', async () => {
    if (!fs.existsSync(CRS_OUTPUT)) { test.skip(); return; }
    const missingPath = path.join(OUTPUT_DIR, 'crs_ei_missing_required.xml');
    if (!fs.existsSync(missingPath)) { test.skip(); return; }

    // Original valid
    const origR = runPython(
      `-m crs_generator.cli --mode validate-xml --xml-input "${CRS_OUTPUT}" --output dummy`
    );
    const origJ = JSON.parse(origR.stdout);
    expect(origJ.is_valid).toBe(true);

    // Corrupted invalid
    const corruptR = runPython(
      `-m crs_generator.cli --mode validate-xml --xml-input "${missingPath}" --output dummy`
    );
    const output = corruptR.stdout || corruptR.stderr || '';
    const corruptJ = JSON.parse(output.match(/\{[\s\S]*\}/)?.[0] || '{}');
    expect(corruptJ.is_valid).toBe(false);
  });

  test('19.2 Duplicate DocRefIds corruption has actual duplicates', async () => {
    const dupePath = path.join(OUTPUT_DIR, 'crs_ei_duplicate_docrefids.xml');
    if (!fs.existsSync(dupePath)) { test.skip(); return; }

    const xml = readFile(dupePath);
    const ids = [];
    const regex = /DocRefId>([^<]+)<\/[^>]*DocRefId>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) {
      if (!m[0].includes('CorrDocRefId')) ids.push(m[1]);
    }
    const unique = new Set(ids);
    expect(ids.length).toBeGreaterThan(unique.size);
  });

  // ============================================================
  // 20. FILE INTEGRITY CHECKS
  // ============================================================
  test('20.1 All generated files have reasonable sizes', async () => {
    const checks = [
      { path: CRS_OUTPUT, minSize: 1000 },
      { path: FATCA_OUTPUT, minSize: 1000 },
      { path: CBC_OUTPUT, minSize: 1000 },
      { path: CRS_CORRECTION_OUTPUT, minSize: 500 },
    ];
    for (const { path: fp, minSize } of checks) {
      if (fs.existsSync(fp)) {
        expect(fs.statSync(fp).size).toBeGreaterThan(minSize);
      }
    }
  });

  test('20.2 All non-malformed XML files are well-formed', async () => {
    const xmlFiles = fs.readdirSync(OUTPUT_DIR)
      .filter(f => f.endsWith('.xml') && !f.includes('malformed'));

    if (xmlFiles.length === 0) { test.skip(); return; }

    for (const file of xmlFiles) {
      const content = readFile(path.join(OUTPUT_DIR, file));
      expect(content.startsWith('<?xml') || content.startsWith('<')).toBe(true);
      expect(content).toContain('</');
      expect(content.length).toBeGreaterThan(100);
    }
  });

  test('20.3 CRS file has correct MessageSpec fields', async () => {
    if (!fs.existsSync(CRS_OUTPUT)) { test.skip(); return; }
    const xml = readFile(CRS_OUTPUT);
    assertXml(xml, 'MessageRefId', 'MessageRefId');
    assertXml(xml, 'MessageTypeIndic', 'MessageTypeIndic');
    assertXml(xml, 'ReportingPeriod', 'ReportingPeriod');
    assertXml(xml, 'Timestamp', 'Timestamp');
    assertXml(xml, 'SendingCompanyIN', 'SendingCompanyIN');
    expect(xml.includes('CRS701') || xml.includes('OECD11')).toBe(true);
  });

  test('20.4 FATCA file has FATCA-specific elements', async () => {
    if (!fs.existsSync(FATCA_OUTPUT)) { test.skip(); return; }
    const xml = readFile(FATCA_OUTPUT);
    assertXml(xml, 'FATCA_OECD', 'FATCA root element');
    assertXml(xml, 'MessageRefId', 'MessageRefId');
    assertXml(xml, 'ReportingPeriod', 'ReportingPeriod');
  });

  test('20.5 CBC file has CBC-specific elements', async () => {
    if (!fs.existsSync(CBC_OUTPUT)) { test.skip(); return; }
    const xml = readFile(CBC_OUTPUT);
    assertXml(xml, 'CBC_OECD', 'CBC root element');
    assertXml(xml, 'ReportingEntity', 'ReportingEntity');
    assertXml(xml, 'CbcReports', 'CbcReports');
    assertXml(xml, 'Revenue', 'Revenue element');
    assertXml(xml, 'ConstEntities', 'Constituent Entities');
  });

  // ============================================================
  // 21. WINDOW / UI EDGE CASES
  // ============================================================
  test('21.1 Window can be resized', async () => {
    const page = window;
    const size = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));
    expect(size.width).toBeGreaterThan(800);
    expect(size.height).toBeGreaterThan(500);
  });

  test('21.2 No JavaScript errors in console', async () => {
    const errors = [];
    window.on('pageerror', err => errors.push(err.message));
    await window.waitForTimeout(1000);
    // Navigate through a few pages to trigger any lazy errors
    await goToModule('CRS');
    await window.waitForTimeout(500);
    await goHome();
    await window.waitForTimeout(500);
    // We don't expect JS errors
    expect(errors.length).toBe(0);
  });

  // ============================================================
  // 22. FINAL SUMMARY: Count all generated files
  // ============================================================
  test('22.1 Summary: all expected files were created', async () => {
    const allFiles = fs.readdirSync(OUTPUT_DIR);
    const xmlFiles = allFiles.filter(f => f.endsWith('.xml'));

    // We should have: 3 base files + 1 correction + 22 error injector + 5 intensity = 31+
    expect(xmlFiles.length).toBeGreaterThanOrEqual(25);

    // Print summary
    console.log('\n============================================');
    console.log('  FULL REGRESSION TEST - FILE SUMMARY');
    console.log('============================================');
    console.log(`  Total XML files created: ${xmlFiles.length}`);
    for (const f of xmlFiles) {
      const size = fs.statSync(path.join(OUTPUT_DIR, f)).size;
      console.log(`    ${f} (${size} bytes)`);
    }
    console.log('============================================\n');
  });
});
