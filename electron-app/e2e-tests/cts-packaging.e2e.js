// End-to-end check of CTS packaging inside the running app.
//
// The Python suite proves the format; this proves the wiring: that the
// certificate store seeds itself into userData on first run, that a password
// set through Settings reaches the backend, and that the Package tab turns a
// generated XML into a delivery ZIP the app can then read back.
//
// A signing password is needed to sign anything, and this repository does not
// carry one. Set MDES_SIGNING_PASSWORD_NL to run the packaging half; without it
// the read-only half still runs.

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { launchElectronApp, closeElectronApp } = require('./helpers');

const NL_PASSWORD = process.env.MDES_SIGNING_PASSWORD_NL || '';

let electronApp;
let window;
let workDir;

test.beforeAll(async () => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cts-e2e-'));
  execFileSync('python', [
    '-m', 'crs_generator.cli', '--mode', 'random',
    '--file-type', 'foreign', '--sending-country', 'NL',
    '--receiving-country', 'GL', '--tax-year', '2024',
    '--mytin', '999999999', '--num-fis', '1',
    '--individual-accounts', '1', '--organisation-accounts', '0',
    '--output', path.join(workDir, 'source.xml'),
  ], { cwd: path.join(__dirname, '..', '..') });
  ({ electronApp, window } = await launchElectronApp());
});

test.afterAll(async () => {
  await closeElectronApp(electronApp);
  if (workDir) fs.rmSync(workDir, { recursive: true, force: true });
});

// Everything here goes through the same preload bridge the UI uses, so a
// broken IPC contract fails these rather than only showing up by hand.
const api = (fn, ...args) => window.evaluate(
  ([name, callArgs]) => window.electronAPI[name](...callArgs),
  [fn, args]
);

test('the certificate store seeds itself and reports every country', async () => {
  const result = await api('ctsListCertificates');
  expect(result.success).toBe(true);
  expect(result.countries).toEqual(
    expect.arrayContaining(['AW', 'CW', 'FR', 'GB', 'GL', 'IT', 'MH', 'NL', 'US', 'VU', 'WS'])
  );
  // The store the app works from is the user-writable copy, not the bundle.
  expect(result.store.toLowerCase()).toContain('certificates');
});

test('no bundled certificate is expiring', async () => {
  const result = await api('ctsListCertificates');
  expect(result.warnings).toEqual([]);
});

test('a package can be inspected without any private key', async () => {
  const fixture = path.join(
    __dirname, '..', '..', 'tests', 'fixtures', 'cts', 'reference_delivery_CW_to_NL.zip'
  );
  const result = await api('ctsUnpack', { packageFile: fixture });
  expect(result.success).toBe(true);
  expect(result.entries).toEqual(['CW_CRS_Metadata.xml', 'NL_CRS_Key', 'CW_CRS_Payload']);
  expect(result.metadata.CTSSenderCountryCd).toBe('CW');
  expect(result.decrypted).toBe(false);
  expect(result.identity.receiver).toBe('NL');
});

test('packaging is refused until a signing password is stored', async () => {
  // Clear any password a previous run left behind, so the refusal is real.
  await api('ctsSetPassword', 'NL', '');
  const result = await api('ctsPack', {
    sourceFile: path.join(workDir, 'source.xml'),
    sender: 'NL',
    receiver: 'GL',
    communicationType: 'CRS',
    taxYear: 2024,
    outputDir: workDir,
  });
  expect(result.success).toBe(false);
  expect(result.error).toContain('NL');
});

test('the Package tab is reachable and renders', async () => {
  await window.click('button:has-text("Open CRS")');
  await window.waitForTimeout(1000);
  await window.click('button:has-text("Package")');
  await expect(window.locator('text=Encrypt and package')).toBeVisible();
  await expect(window.locator('text=Inspect a package')).toBeVisible();
  await expect(window.locator('input[placeholder="From XML"]')).toHaveCount(4);
  await window.screenshot({ path: 'e2e-test-results/package-tab.png', fullPage: true });
});

test('inspection separates general validation from target comparison', async () => {
  if (await window.locator('text=Encrypt and package').count() === 0) {
    await window.click('button:has-text("Open CRS")');
    await window.waitForTimeout(1000);
    await window.click('button:has-text("Package")');
  }
  const mode = window.locator('select[aria-label="Inspection mode"]');
  await expect(mode).toHaveValue('general');
  await mode.selectOption('target');
  await expect(window.locator('select[aria-label="MDES target for inspection"]')).toBeVisible();
  await expect(window.locator('text=Target mode compares this package')).toBeVisible();
  await mode.selectOption('general');
  await expect(mode).toHaveValue('general');
});

test('the Certificates screen lists the store with expiry', async () => {
  // Settings is reached from the module-select header, so leave the module first.
  await window.click('button[title="Back to module selection"]');
  await window.click('[data-testid="nav-settings"]');
  // Settings sections are collapsed until asked for; the store is behind this one.
  await expect(window.locator('h3:has-text("Certificates")')).toBeVisible({ timeout: 15000 });
  await window.click('[data-testid="certificates-section"] button[aria-expanded="false"]');
  // Every country in the store gets a row, with the key size that decides how
  // long the wrapped key will be.
  await expect(window.locator('td:has-text("NL")').first()).toBeVisible();
  await expect(window.locator('text=RSA-4096').first()).toBeVisible();
  await window.screenshot({ path: 'e2e-test-results/certificates-settings.png', fullPage: true });
});

test('a stored password produces a package the app can read back', async () => {
  test.skip(!NL_PASSWORD, 'Set MDES_SIGNING_PASSWORD_NL to run the packaging path');

  const saved = await api('ctsSetPassword', 'NL', NL_PASSWORD);
  expect(saved.success).toBe(true);

  const checked = await api('ctsCheckPassword', 'NL');
  expect(checked.canSign).toBe(true);

  const packed = await api('ctsPack', {
    sourceFile: path.join(workDir, 'source.xml'),
    sender: 'NL',
    receiver: 'GL',
    communicationType: 'CRS',
    taxYear: 2024,
    outputDir: workDir,
  });
  expect(packed.success).toBe(true);
  expect(packed.entries).toEqual(['NL_CRS_Metadata.xml', 'GL_CRS_Key', 'NL_CRS_Payload']);
  expect(packed.senderFileId).toMatch(/^NL_GL_CRS_NL2024GL/);
  expect(fs.existsSync(packed.filePath)).toBe(true);

  // GL's signing certificate is the same keypair as its encryption certificate,
  // so the app can open what it just addressed to Greenland.
  await api('ctsSetPassword', 'GL', process.env.MDES_SIGNING_PASSWORD_GL || 'greenland');
  const opened = await api('ctsUnpack', { packageFile: packed.filePath, country: 'GL' });
  expect(opened.success).toBe(true);
  expect(opened.decrypted).toBe(true);
  expect(opened.signature.valid).toBe(true);
  expect(opened.warnings).toEqual([]);
});

test('a deliberate defect produces a package that reports the MDES failure', async () => {
  test.skip(!NL_PASSWORD, 'Set MDES_SIGNING_PASSWORD_NL to run the packaging path');

  await api('ctsSetPassword', 'NL', NL_PASSWORD);
  const packed = await api('ctsPack', {
    sourceFile: path.join(workDir, 'source.xml'),
    sender: 'NL',
    receiver: 'GL',
    communicationType: 'CRS',
    taxYear: 2024,
    outputDir: workDir,
    defects: ['uncompressed_payload'],
  });
  expect(packed.success).toBe(true);
  expect(packed.defects).toContain('uncompressed_payload');

  const opened = await api('ctsUnpack', { packageFile: packed.filePath, country: 'GL' });
  expect(opened.warnings.join(' ')).toContain('50003');
});
