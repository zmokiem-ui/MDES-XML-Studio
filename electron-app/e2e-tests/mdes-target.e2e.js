// MDES targets, end to end through the running app.
//
// The Python suite proves the rules are read correctly; this proves the wiring:
// that a target saved through the UI reaches the backend, that preflight comes
// back with the instance's own answer, and that one call produces a package the
// app can then open.
//
// Needs a real MDES database. Set:
//   MDES_TEST_DB    server/database, e.g. "localhost\\SQLEXPRESS/MDES-DEMO"
//   MDES_TEST_PROPS path to that instance's .properties file
// Without them every test here skips.

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { launchElectronApp, closeElectronApp } = require('./helpers');

const TEST_DB = process.env.MDES_TEST_DB || '';
const TEST_PROPS = process.env.MDES_TEST_PROPS || '';
const CONFIGURED = Boolean(TEST_DB && TEST_DB.includes('/') && TEST_PROPS);

const TARGET_NAME = 'pytest target';

let electronApp;
let window;
let workDir;

test.beforeAll(async () => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdes-target-e2e-'));
  ({ electronApp, window } = await launchElectronApp());
});

test.afterAll(async () => {
  if (window && CONFIGURED) {
    await api('mdesTargetDelete', TARGET_NAME).catch(() => {});
  }
  await closeElectronApp(electronApp);
  if (workDir) fs.rmSync(workDir, { recursive: true, force: true });
});

const api = (fn, ...args) => window.evaluate(
  ([name, callArgs]) => window.electronAPI[name](...callArgs),
  [fn, args]
);

test.beforeEach(() => {
  test.skip(!CONFIGURED, 'Set MDES_TEST_DB and MDES_TEST_PROPS to run these');
});

test('detection finds properties files and MDES databases', async () => {
  const result = await api('mdesTargetDiscover', {});
  expect(result.success).toBe(true);
  // Identified by their tables, not their names, so any MDES database counts.
  expect(Array.isArray(result.databases)).toBe(true);
  expect(Array.isArray(result.propertiesFiles)).toBe(true);
});

test('a half-filled target is refused, naming what is missing', async () => {
  // The real failure this guards: placeholder text that looked like a filled
  // field, so the form was submitted with the properties path, server and
  // database all empty - and saved silently.
  const saved = await api('mdesTargetSave', {
    name: 'incomplete', username: 'QSR-LAP-0248\SQLEXPRESS',
  });
  expect(saved.success).toBe(false);
  expect(saved.missing).toEqual(
    expect.arrayContaining(['Properties file', 'SQL Server', 'Database'])
  );

  const listed = await api('mdesTargetList');
  expect((listed.targets || []).some(t => t.name === 'incomplete')).toBe(false);
});

test('a connection can be tried before it is saved', async () => {
  const [server, database] = TEST_DB.split(/\/(?=[^/]*$)/);

  const bad = await api('mdesTargetTest', { propsPath: TEST_PROPS });
  expect(bad.success).toBe(false);
  expect(bad.error).toContain('SQL Server');

  const good = await api('mdesTargetTest', { propsPath: TEST_PROPS, server, database });
  expect(good.success).toBe(true);
  expect(good.ownCountry).toMatch(/^[A-Z]{2}$/);
  expect(good.database.name).toBe(database);

  // Trying it must not have saved anything.
  const listed = await api('mdesTargetList');
  expect((listed.targets || []).some(t => t.database === database
    && t.name !== TARGET_NAME)).toBe(false);
});

test('a target can be saved and read back', async () => {
  const [server, database] = TEST_DB.split(/\/(?=[^/]*$)/);
  const saved = await api('mdesTargetSave', {
    name: TARGET_NAME, propsPath: TEST_PROPS, server, database,
  });
  expect(saved.success).toBe(true);

  const resolved = await api('mdesTargetResolve', TARGET_NAME);
  expect(resolved.success).toBe(true);
  expect(resolved.ownCountry).toMatch(/^[A-Z]{2}$/);
  expect(resolved.properties.modules.length).toBeGreaterThan(0);
});

test('preflight answers with the instance own rules', async () => {
  const result = await api('mdesTargetPreflight', { target: TARGET_NAME });
  expect(result.success).toBe(true);
  expect(result.checks.length).toBeGreaterThan(5);

  // Receiver is forced to whatever the instance is; a delivery for anyone else
  // is MDES 50012.
  const resolved = await api('mdesTargetResolve', TARGET_NAME);
  expect(result.receiver).toBe(resolved.ownCountry);

  // Every check must be self-explanatory: a title and a reason, always.
  for (const check of result.checks) {
    expect(check.title).toBeTruthy();
    expect(check.detail).toBeTruthy();
  }
});

test('addressing another country is refused, naming 50012', async () => {
  const resolved = await api('mdesTargetResolve', TARGET_NAME);
  const wrong = resolved.ownCountry === 'ZZ' ? 'YY' : 'ZZ';
  const result = await api('mdesTargetPreflight', { target: TARGET_NAME, receiver: wrong });
  const receiver = result.checks.find(c => c.id === 'receiver');
  expect(receiver.outcome).toBe('fail');
  expect(receiver.mdesError).toBe('50012');
  expect(result.blocked).toBe(true);
});

test('one call builds a package the app can open again', async () => {
  const preflight = await api('mdesTargetPreflight', { target: TARGET_NAME });
  test.skip(preflight.blocked, `Target is not usable: ${JSON.stringify(preflight.predictedErrors)}`);
  test.skip(!preflight.sender, 'No sender on this target has a matching certificate');

  const password = process.env[`MDES_SIGNING_PASSWORD_${preflight.sender}`];
  test.skip(!password, `Set MDES_SIGNING_PASSWORD_${preflight.sender} to run the build`);
  await api('ctsSetPassword', preflight.sender, password);

  const built = await api('mdesTargetBuild', { target: TARGET_NAME, outputDir: workDir });
  expect(built.success).toBe(true);
  expect(fs.existsSync(built.filePath)).toBe(true);
  // Entry names are derived from the countries preflight chose, so this is also
  // a check that the two halves agree.
  expect(built.entries[0]).toBe(`${built.sender}_CRS_Metadata.xml`);
  expect(built.entries[1]).toBe(`${built.receiver}_CRS_Key`);

  // The receiver is the instance itself, and its signing certificate is the same
  // keypair as its encryption certificate, so the app can reopen what it built.
  const receiverPassword = process.env[`MDES_SIGNING_PASSWORD_${built.receiver}`];
  if (receiverPassword) {
    await api('ctsSetPassword', built.receiver, receiverPassword);
    const opened = await api('ctsUnpack', {
      packageFile: built.filePath, country: built.receiver,
    });
    expect(opened.success).toBe(true);
    expect(opened.signature.valid).toBe(true);
    expect(opened.metadata.CTSSenderCountryCd).toBe(built.sender);
    expect(opened.metadata.CTSReceiverCountryCd).toBe(built.receiver);
  }
});

test('developer mode gates the whole feature', async () => {
  // With it off, neither the settings panel nor the build card exists.
  await window.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('crs-settings') || '{}');
    localStorage.setItem('crs-settings', JSON.stringify({ ...saved, developerMode: false }));
  });
  await window.reload();
  await window.waitForTimeout(2000);
  await window.click('button:has-text("Open CRS")');
  await window.waitForTimeout(800);
  await window.click('button:has-text("Package")');
  await expect(window.locator('text=Build for an MDES instance')).toHaveCount(0);

  await window.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('crs-settings') || '{}');
    localStorage.setItem('crs-settings', JSON.stringify({ ...saved, developerMode: true }));
  });
  await window.reload();
  await window.waitForTimeout(2000);
  await window.click('button:has-text("Open CRS")');
  await window.waitForTimeout(800);
  await window.click('button:has-text("Package")');
  await expect(window.locator('text=Build for an MDES instance')).toBeVisible();
  // Wait for the target list and its preflight, so the screenshot shows the
  // card doing its job rather than mid-load.
  await expect(window.locator('text=This target wants')).toBeVisible({ timeout: 30000 });
  await window.screenshot({ path: 'e2e-test-results/mdes-target-build.png', fullPage: true });
});
