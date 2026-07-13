const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { version: appVersion } = require('../package.json');

const packagedAppPath = process.env.PACKAGED_APP_PATH;
const outputDir = path.join(os.tmpdir(), 'mdes-xml-studio-packaged-smoke');
const crsPath = path.join(outputDir, 'crs.xml');
const fatcaPath = path.join(outputDir, 'fatca.xml');
const cbcPath = path.join(outputDir, 'cbc.xml');

test.describe.serial('Packaged application smoke', () => {
  test.skip(!packagedAppPath, 'Set PACKAGED_APP_PATH to the unpacked application executable.');
  test.describe.configure({ timeout: 180000 });

  let electronApp;
  let window;
  const consoleErrors = [];

  test.beforeAll(async () => {
    fs.rmSync(outputDir, { recursive: true, force: true });
    fs.mkdirSync(outputDir, { recursive: true });

    const env = { ...process.env, NODE_ENV: 'production', E2E_TEST: 'true' };
    delete env.ELECTRON_RUN_AS_NODE;
    electronApp = await electron.launch({ executablePath: packagedAppPath, env });
    window = await electronApp.firstWindow();
    window.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(3000);
  });

  test.afterAll(async () => {
    if (electronApp) await electronApp.close();
  });

  test('launches with the packaged version and settings', async () => {
    await expect(window).toHaveTitle(/MDES XML Studio/);
    await window.click('[data-testid="nav-settings"]');
    await expect(window.locator('[data-testid="app-version"]')).toHaveText(`v${appVersion}`);
  });

  test('uses bundled CRS backend for generation, validation, and correction', async () => {
    const generation = await window.evaluate(data => window.electronAPI.generateCRS(data), {
      mode: 'random',
      transmittingCountry: 'NL',
      receivingCountry: 'DE',
      reportingPeriod: '2024',
      sendingCompanyIN: '123456789',
      numReportingFIs: '1',
      individualAccounts: '1',
      organisationAccounts: '1',
      controllingPersons: '2',
      reportingFITINs: ['987654321'],
      accountHolderMode: 'random',
      testMode: true,
      outputPath: crsPath,
    });
    expect(generation.success).toBe(true);
    expect(fs.existsSync(crsPath)).toBe(true);

    const validation = await window.evaluate(file => window.electronAPI.validateXml(file), crsPath);
    expect(validation.is_valid).toBe(true);
    expect(validation.xsd_valid).toBe(true);

    const correctionPath = path.join(outputDir, 'crs-correction.xml');
    const correction = await window.evaluate(options => window.electronAPI.generateCorrection(options), {
      xmlPath: crsPath,
      outputPath: correctionPath,
      correctIndividual: 1,
      correctOrganisation: 0,
      deleteIndividual: 0,
      deleteOrganisation: 0,
      modifyBalance: true,
      testMode: true,
    });
    expect(correction.success).toBe(true);
    expect(fs.existsSync(correctionPath)).toBe(true);
  });

  test('uses bundled FATCA backend for generation and validation', async () => {
    const generation = await window.evaluate(data => window.electronAPI.generateFATCA(data), {
      variant: 'fatca-crs',
      transmittingCountry: 'NL',
      receivingCountry: 'US',
      reportingPeriod: '2024',
      sendingCompanyIN: 'A1B2C3.00000.SP.350',
      numReportingFIs: '1',
      filerCategory: 'FATCA601',
      individualAccounts: '1',
      organisationAccounts: '1',
      substantialOwners: '1',
      reportingFITINs: ['A1B2C3.00000.SP.350'],
      accountHolderMode: 'random',
      testMode: true,
      outputPath: fatcaPath,
    });
    expect(generation.success).toBe(true);
    expect(fs.existsSync(fatcaPath)).toBe(true);
    expect(fs.readFileSync(fatcaPath, 'utf8')).not.toContain('MessageHeaderMessageRefID');

    const validation = await window.evaluate(file => window.electronAPI.validateFatcaXml(file), fatcaPath);
    expect(validation.is_valid).toBe(true);
    expect(validation.xsd_valid).toBe(true);
  });

  test('uses bundled CBC backend for generation and validation', async () => {
    const generation = await window.evaluate(data => window.electronAPI.generateCBC(data), {
      mode: 'random',
      transmittingCountry: 'NL',
      reportingPeriod: '2024',
      sendingEntityIN: '123456789',
      numCbcReports: '2',
      constEntitiesPerReport: '2',
      reportingRole: 'CBC701',
      testMode: true,
      outputPath: cbcPath,
    });
    expect(generation.success).toBe(true);
    expect(fs.existsSync(cbcPath)).toBe(true);

    const validation = await window.evaluate(file => window.electronAPI.validateCbcXml(file), cbcPath);
    expect(validation.is_valid).toBe(true);
    expect(validation.xsd_valid).toBe(true);
  });

  test('uses bundled error injector and remains free of renderer errors', async () => {
    const result = await window.evaluate(config => window.electronAPI.corruptFile(config), {
      module: 'crs',
      fileType: 'xml',
      corruptionLevel: 1,
      preset: 'missing_required',
      customOptions: {},
      inputFile: crsPath,
    });
    expect(result.success).toBe(true);
    expect(fs.existsSync(result.outputPath)).toBe(true);
    expect(consoleErrors).toEqual([]);
  });
});
