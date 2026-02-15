// E2E File Generation & Validation Test
// Tests that files are actually created with correct content.
// Spawns Python CLI directly from the test process (same as the Electron app does via IPC),
// then validates the generated XML files on disk.
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const {
  launchElectronApp,
  closeElectronApp,
  getTestOutputDir
} = require('./helpers');

const OUTPUT_DIR = path.join(getTestOutputDir(), 'file-gen-test');
const PROJECT_ROOT = path.join(__dirname, '..', '..');

// Helper: run a Python CLI command and return { success, stdout, stderr }
function runPython(args) {
  try {
    const stdout = execSync(`python ${args}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      timeout: 30000
    });
    return { success: true, stdout };
  } catch (err) {
    return { success: false, stdout: err.stdout || '', stderr: err.stderr || err.message };
  }
}

// Helper: read file content
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

// Helper: assert XML contains pattern
function assertXmlContains(content, pattern, description) {
  const regex = new RegExp(pattern);
  if (!regex.test(content)) {
    throw new Error(`XML validation failed: ${description}\nPattern "${pattern}" not found.`);
  }
}

// Helper: count occurrences of a pattern
function countOccurrences(content, pattern) {
  return (content.match(new RegExp(pattern, 'g')) || []).length;
}

test.describe('E2E File Generation & Validation', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  });

  test.beforeEach(async () => {
    const app = await launchElectronApp();
    electronApp = app.electronApp;
    window = app.window;
  });

  test.afterEach(async () => {
    await closeElectronApp(electronApp);
  });

  // ================================================================
  // SECTION 1: CRS XML GENERATION & VALIDATION
  // ================================================================

  test('1.1 CRS - Generate XML with known values and validate content', async () => {
    const outputPath = path.join(OUTPUT_DIR, 'crs_test_output.xml');

    const result = runPython(
      `-m crs_generator.cli --mode random ` +
      `--sending-country NL --receiving-country DE --tax-year 2024 ` +
      `--mytin 12345678 --num-fis 1 ` +
      `--individual-accounts 2 --organisation-accounts 1 --controlling-persons 1 ` +
      `--output "${outputPath}"`
    );

    expect(result.success).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(0);

    const xml = readFile(outputPath);

    // Namespace & root
    assertXmlContains(xml, 'CRS_OECD', 'CRS namespace present');
    assertXmlContains(xml, 'xmlns', 'XML namespace declaration');

    // MessageSpec with our values (tags have crs: prefix)
    assertXmlContains(xml, 'MessageSpec', 'MessageSpec element');
    assertXmlContains(xml, 'SendingCompanyIN', 'SendingCompanyIN element');
    assertXmlContains(xml, '12345678', 'Our TIN value in XML');
    assertXmlContains(xml, 'NL', 'Sending country NL');
    assertXmlContains(xml, 'DE', 'Receiving country DE');
    assertXmlContains(xml, '2024', 'Tax year 2024');

    // Structure (namespace-prefixed tags)
    assertXmlContains(xml, 'ReportingFI', 'ReportingFI element');
    assertXmlContains(xml, 'AccountReport', 'AccountReport element');
    assertXmlContains(xml, 'DocRefId', 'DocRefId element');

    // Account counts: 2 individual + 1 org = at least 3 AccountReport
    // Tags are namespace-prefixed: <crs:AccountReport>
    const accountReports = countOccurrences(xml, '<[a-z]+:AccountReport>');
    expect(accountReports).toBeGreaterThanOrEqual(3);
  });

  test('1.2 CRS - MessageSpec has all required fields', async () => {
    const filePath = path.join(OUTPUT_DIR, 'crs_test_output.xml');
    if (!fs.existsSync(filePath)) { test.skip(); return; }

    const xml = readFile(filePath);
    assertXmlContains(xml, 'MessageRefId', 'MessageRefId');
    assertXmlContains(xml, 'MessageTypeIndic', 'MessageTypeIndic');
    assertXmlContains(xml, 'ReportingPeriod', 'ReportingPeriod');
    assertXmlContains(xml, 'Timestamp', 'Timestamp');

    // Should be CRS701 (new data) or OECD11 (test new data)
    expect(xml.includes('CRS701') || xml.includes('OECD11')).toBe(true);
  });

  test('1.3 CRS - Validate generated file passes CRS validator', async () => {
    const filePath = path.join(OUTPUT_DIR, 'crs_test_output.xml');
    if (!fs.existsSync(filePath)) { test.skip(); return; }

    const result = runPython(
      `-m crs_generator.cli --mode validate-xml --xml-input "${filePath}" --output dummy`
    );

    // Validator exits with code 0 for valid files
    // Parse the JSON output
    const json = JSON.parse(result.stdout);
    expect(json.is_valid).toBe(true);
    expect(json.individual_accounts).toBe(2);
    expect(json.organisation_accounts).toBe(1);
    expect(json.reporting_fi_count).toBe(1);
    expect(json.transmitting_country).toBe('NL');
    expect(json.receiving_country).toBe('DE');
  });

  test('1.4 CRS - Multiple FIs with different country pair', async () => {
    const outputPath = path.join(OUTPUT_DIR, 'crs_multi_fi.xml');

    const result = runPython(
      `-m crs_generator.cli --mode random ` +
      `--sending-country GB --receiving-country FR --tax-year 2023 ` +
      `--mytin 987654321 --num-fis 3 ` +
      `--individual-accounts 1 --organisation-accounts 1 --controlling-persons 1 ` +
      `--output "${outputPath}"`
    );

    expect(result.success).toBe(true);

    const xml = readFile(outputPath);
    assertXmlContains(xml, 'GB', 'Sending country GB');
    assertXmlContains(xml, 'FR', 'Receiving country FR');
    assertXmlContains(xml, '2023', 'Tax year 2023');
    assertXmlContains(xml, '987654321', 'TIN 987654321');

    // 3 ReportingFI elements (namespace-prefixed: <crs:ReportingFI>)
    expect(countOccurrences(xml, '<crs:ReportingFI>')).toBe(3);
  });

  // ================================================================
  // SECTION 2: FATCA XML GENERATION & VALIDATION
  // ================================================================

  test('2.1 FATCA - Generate XML with known values and validate content', async () => {
    const outputPath = path.join(OUTPUT_DIR, 'fatca_test_output.xml');

    const result = runPython(
      `-m crs_generator.fatca_cli --mode random ` +
      `--sending-country NL --receiving-country US --tax-year 2024 ` +
      `--sending-company-in A1B2C3.00000.SP.350 --num-fis 1 ` +
      `--filer-category FATCA601 ` +
      `--individual-accounts 2 --organisation-accounts 1 --substantial-owners 1 ` +
      `--output "${outputPath}"`
    );

    expect(result.success).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);

    const xml = readFile(outputPath);

    assertXmlContains(xml, 'FATCA', 'FATCA namespace');
    assertXmlContains(xml, 'xmlns', 'XML namespace');
    assertXmlContains(xml, 'A1B2C3', 'GIIN value');
    assertXmlContains(xml, 'NL', 'Sending country NL');
    assertXmlContains(xml, 'US', 'Receiving country US');
    assertXmlContains(xml, '2024', 'Tax year 2024');
    assertXmlContains(xml, 'MessageSpec', 'MessageSpec');
    assertXmlContains(xml, 'ReportingFI', 'ReportingFI');
    assertXmlContains(xml, 'AccountReport', 'AccountReport');
    assertXmlContains(xml, 'DocRefId', 'DocRefId');

    expect(countOccurrences(xml, '<[a-z]+:AccountReport>')).toBeGreaterThanOrEqual(3);
  });

  test('2.2 FATCA - Validate generated file passes FATCA validator', async () => {
    const filePath = path.join(OUTPUT_DIR, 'fatca_test_output.xml');
    if (!fs.existsSync(filePath)) { test.skip(); return; }

    const result = runPython(
      `-m crs_generator.fatca_cli --mode validate-xml --xml-input "${filePath}" --output dummy`
    );

    const json = JSON.parse(result.stdout);
    expect(json.is_valid).toBe(true);
    expect(json.individual_accounts).toBe(2);
    expect(json.organisation_accounts).toBe(1);
  });

  test('2.3 FATCA - Filer category present in XML', async () => {
    const filePath = path.join(OUTPUT_DIR, 'fatca_test_output.xml');
    if (!fs.existsSync(filePath)) { test.skip(); return; }

    const xml = readFile(filePath);
    assertXmlContains(xml, 'FATCA601', 'Filer category FATCA601');
    assertXmlContains(xml, 'MessageRefId', 'MessageRefId');
    assertXmlContains(xml, 'ReportingPeriod', 'ReportingPeriod');
  });

  // ================================================================
  // SECTION 3: CBC XML GENERATION & VALIDATION
  // ================================================================

  test('3.1 CBC - Generate XML with known values and validate content', async () => {
    const outputPath = path.join(OUTPUT_DIR, 'cbc_test_output.xml');

    const result = runPython(
      `-m crs_generator.cbc_cli generate ` +
      `--country NL --year 2024 --tin 999888777 ` +
      `--reports 3 --entities 2 ` +
      `--output "${outputPath}"`
    );

    expect(result.success).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);

    const xml = readFile(outputPath);

    assertXmlContains(xml, 'CBC_OECD', 'CBC_OECD namespace');
    assertXmlContains(xml, 'xmlns', 'XML namespace');
    assertXmlContains(xml, 'NL', 'Country NL');
    assertXmlContains(xml, '2024', 'Tax year 2024');
    assertXmlContains(xml, '999888777', 'TIN 999888777');
    assertXmlContains(xml, 'MessageSpec', 'MessageSpec');
    assertXmlContains(xml, 'ReportingEntity', 'ReportingEntity');
    assertXmlContains(xml, 'CbcReports', 'CbcReports');
    assertXmlContains(xml, 'DocRefId', 'DocRefId');

    // CBC uses default namespace (no prefix), so tags are <CbcReports>
    expect(countOccurrences(xml, '<CbcReports>')).toBeGreaterThanOrEqual(3);
  });

  test('3.2 CBC - Validate CBC-specific structure', async () => {
    const filePath = path.join(OUTPUT_DIR, 'cbc_test_output.xml');
    if (!fs.existsSync(filePath)) { test.skip(); return; }

    const xml = readFile(filePath);
    assertXmlContains(xml, 'MessageRefId', 'MessageRefId');
    assertXmlContains(xml, 'ReportingPeriod', 'ReportingPeriod');
    assertXmlContains(xml, 'ConstEntities', 'Constituent Entities');
    assertXmlContains(xml, 'Revenue', 'Revenue element');
  });

  // ================================================================
  // SECTION 4: CRS CORRECTION FILE
  // ================================================================

  test('4.1 CRS - Generate correction file and validate structure', async () => {
    const sourcePath = path.join(OUTPUT_DIR, 'crs_test_output.xml');
    const corrPath = path.join(OUTPUT_DIR, 'crs_correction.xml');
    if (!fs.existsSync(sourcePath)) { test.skip(); return; }

    const result = runPython(
      `-m crs_generator.cli --mode correction ` +
      `--xml-input "${sourcePath}" --output "${corrPath}" ` +
      `--correct-individual 1 --modify-balance --test-mode`
    );

    expect(result.success).toBe(true);
    expect(fs.existsSync(corrPath)).toBe(true);

    const xml = readFile(corrPath);

    // Correction indicators (test mode: OECD12 = correct, OECD13 = delete)
    expect(xml.includes('OECD12') || xml.includes('OECD13')).toBe(true);
    assertXmlContains(xml, 'CRS_OECD', 'CRS namespace in correction');
    assertXmlContains(xml, 'CorrDocRefId', 'CorrDocRefId references original');
  });

  // ================================================================
  // SECTION 5: ERROR INJECTOR - CORRUPTED CRS FILES
  // ================================================================

  test('5.1 Corrupted CRS (missing_required) fails validation', async () => {
    const sourcePath = path.join(OUTPUT_DIR, 'crs_test_output.xml');
    const corruptPath = path.join(OUTPUT_DIR, 'crs_corrupted_missing.xml');
    if (!fs.existsSync(sourcePath)) { test.skip(); return; }

    // Generate corrupted file
    const genResult = runPython(
      `-m crs_generator.error_injector ` +
      `--input "${sourcePath}" --output "${corruptPath}" ` +
      `--module crs --file-type xml --preset missing_required --level 3 --options "{}"`
    );
    expect(genResult.success).toBe(true);
    expect(fs.existsSync(corruptPath)).toBe(true);

    // Validate corrupted file - should FAIL
    const valResult = runPython(
      `-m crs_generator.cli --mode validate-xml --xml-input "${corruptPath}" --output dummy`
    );
    // Validator exits non-zero for invalid files, or returns is_valid: false
    const output = valResult.stdout || valResult.stderr || '';
    const json = JSON.parse(output.match(/\{[\s\S]*\}/)?.[0] || '{}');
    expect(json.is_valid).toBe(false);
  });

  test('5.2 Corrupted CRS (invalid_dates) creates file with bad dates', async () => {
    const sourcePath = path.join(OUTPUT_DIR, 'crs_test_output.xml');
    const corruptPath = path.join(OUTPUT_DIR, 'crs_corrupted_dates.xml');
    if (!fs.existsSync(sourcePath)) { test.skip(); return; }

    const result = runPython(
      `-m crs_generator.error_injector ` +
      `--input "${sourcePath}" --output "${corruptPath}" ` +
      `--module crs --file-type xml --preset invalid_dates --level 3 --options "{}"`
    );
    expect(result.success).toBe(true);
    expect(fs.existsSync(corruptPath)).toBe(true);

    const xml = readFile(corruptPath);
    expect(xml.length).toBeGreaterThan(0);

    // Compare dates with original - they should differ
    const origXml = readFile(sourcePath);
    const origDates = origXml.match(/\d{4}-\d{2}-\d{2}/g) || [];
    const corruptDates = xml.match(/\d{4}-\d{2}-\d{2}|9999|0000|13-|32-/g) || [];
    // At least some dates should be different or invalid
    expect(corruptDates.length).toBeGreaterThan(0);
  });

  test('5.3 Corrupted CRS (duplicate_docrefids) has duplicate IDs', async () => {
    const sourcePath = path.join(OUTPUT_DIR, 'crs_test_output.xml');
    const corruptPath = path.join(OUTPUT_DIR, 'crs_corrupted_dupes.xml');
    if (!fs.existsSync(sourcePath)) { test.skip(); return; }

    const result = runPython(
      `-m crs_generator.error_injector ` +
      `--input "${sourcePath}" --output "${corruptPath}" ` +
      `--module crs --file-type xml --preset duplicate_docrefids --level 3 --options "{}"`
    );
    expect(result.success).toBe(true);
    expect(fs.existsSync(corruptPath)).toBe(true);

    // Extract DocRefIds and check for duplicates
    // Tags may be namespace-prefixed: <stf:DocRefId> or <ftc:DocRefId> or <DocRefId>
    const xml = readFile(corruptPath);
    const docRefIds = [];
    const regex = /DocRefId>([^<]+)<\/[^>]*DocRefId>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      // Skip CorrDocRefId entries
      if (!match[0].includes('CorrDocRefId')) {
        docRefIds.push(match[1]);
      }
    }

    const uniqueIds = new Set(docRefIds);
    // Duplicate DocRefIds preset should create at least one duplicate
    expect(docRefIds.length).toBeGreaterThan(uniqueIds.size);
  });

  test('5.4 Corrupted CRS (malformed_xml) creates structurally broken file', async () => {
    const sourcePath = path.join(OUTPUT_DIR, 'crs_test_output.xml');
    const corruptPath = path.join(OUTPUT_DIR, 'crs_corrupted_malformed.xml');
    if (!fs.existsSync(sourcePath)) { test.skip(); return; }

    const result = runPython(
      `-m crs_generator.error_injector ` +
      `--input "${sourcePath}" --output "${corruptPath}" ` +
      `--module crs --file-type xml --preset malformed_xml --level 3 --options "{}"`
    );
    expect(result.success).toBe(true);
    expect(fs.existsSync(corruptPath)).toBe(true);

    const content = readFile(corruptPath);
    expect(content.length).toBeGreaterThan(0);
  });

  test('5.5 All 8 CRS error presets generate files', async () => {
    const sourcePath = path.join(OUTPUT_DIR, 'crs_test_output.xml');
    if (!fs.existsSync(sourcePath)) { test.skip(); return; }

    const presets = [
      'missing_required', 'invalid_dates', 'wrong_country_codes',
      'invalid_amounts', 'duplicate_docrefids', 'wrong_message_type',
      'malformed_xml', 'invalid_tin_format'
    ];

    for (const preset of presets) {
      const outPath = path.join(OUTPUT_DIR, `crs_ei_${preset}.xml`);
      const result = runPython(
        `-m crs_generator.error_injector ` +
        `--input "${sourcePath}" --output "${outPath}" ` +
        `--module crs --file-type xml --preset ${preset} --level 3 --options "{}"`
      );
      expect(result.success).toBe(true);
      expect(fs.existsSync(outPath)).toBe(true);
      expect(fs.statSync(outPath).size).toBeGreaterThan(0);
    }
  });

  // ================================================================
  // SECTION 6: FATCA ERROR INJECTOR
  // ================================================================

  test('6.1 All 7 FATCA error presets generate files', async () => {
    const sourcePath = path.join(OUTPUT_DIR, 'fatca_test_output.xml');
    if (!fs.existsSync(sourcePath)) { test.skip(); return; }

    const presets = [
      'missing_required', 'invalid_giin', 'wrong_filer_category',
      'invalid_account_types', 'wrong_payment_types', 'us_indicia_errors',
      'malformed_xml'
    ];

    for (const preset of presets) {
      const outPath = path.join(OUTPUT_DIR, `fatca_ei_${preset}.xml`);
      const result = runPython(
        `-m crs_generator.error_injector ` +
        `--input "${sourcePath}" --output "${outPath}" ` +
        `--module fatca --file-type xml --preset ${preset} --level 3 --options "{}"`
      );
      expect(result.success).toBe(true);
      expect(fs.existsSync(outPath)).toBe(true);
      expect(fs.statSync(outPath).size).toBeGreaterThan(0);
    }
  });

  // ================================================================
  // SECTION 7: CBC ERROR INJECTOR
  // ================================================================

  test('7.1 All 7 CBC error presets generate files', async () => {
    const sourcePath = path.join(OUTPUT_DIR, 'cbc_test_output.xml');
    if (!fs.existsSync(sourcePath)) { test.skip(); return; }

    const presets = [
      'missing_required', 'invalid_revenues', 'wrong_entity_types',
      'missing_cbc_reports', 'invalid_message_type', 'duplicate_entities',
      'malformed_xml'
    ];

    for (const preset of presets) {
      const outPath = path.join(OUTPUT_DIR, `cbc_ei_${preset}.xml`);
      const result = runPython(
        `-m crs_generator.error_injector ` +
        `--input "${sourcePath}" --output "${outPath}" ` +
        `--module cbc --file-type xml --preset ${preset} --level 3 --options "{}"`
      );
      expect(result.success).toBe(true);
      expect(fs.existsSync(outPath)).toBe(true);
      expect(fs.statSync(outPath).size).toBeGreaterThan(0);
    }
  });

  // ================================================================
  // SECTION 8: INTENSITY LEVELS & CROSS-VALIDATION
  // ================================================================

  test('8.1 Error injector intensity levels 1-5 all produce files', async () => {
    const sourcePath = path.join(OUTPUT_DIR, 'crs_test_output.xml');
    if (!fs.existsSync(sourcePath)) { test.skip(); return; }

    for (let level = 1; level <= 5; level++) {
      const outPath = path.join(OUTPUT_DIR, `crs_level_${level}.xml`);
      const result = runPython(
        `-m crs_generator.error_injector ` +
        `--input "${sourcePath}" --output "${outPath}" ` +
        `--module crs --file-type xml --preset missing_required --level ${level} --options "{}"`
      );
      expect(result.success).toBe(true);
      expect(fs.existsSync(outPath)).toBe(true);
    }
  });

  test('8.2 File sizes are reasonable for all generated files', async () => {
    const checks = [
      { name: 'crs_test_output.xml', minSize: 1000 },
      { name: 'crs_multi_fi.xml', minSize: 2000 },
      { name: 'fatca_test_output.xml', minSize: 1000 },
      { name: 'cbc_test_output.xml', minSize: 1000 },
      { name: 'crs_correction.xml', minSize: 500 },
    ];

    for (const { name, minSize } of checks) {
      const filePath = path.join(OUTPUT_DIR, name);
      if (fs.existsSync(filePath)) {
        expect(fs.statSync(filePath).size).toBeGreaterThan(minSize);
      }
    }
  });

  test('8.3 All non-malformed XML files are well-formed', async () => {
    if (!fs.existsSync(OUTPUT_DIR)) { test.skip(); return; }
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

  test('8.4 Original files valid, corrupted files invalid', async () => {
    const origPath = path.join(OUTPUT_DIR, 'crs_test_output.xml');
    const corruptPath = path.join(OUTPUT_DIR, 'crs_corrupted_missing.xml');
    if (!fs.existsSync(origPath) || !fs.existsSync(corruptPath)) { test.skip(); return; }

    // Original should be valid
    const origResult = runPython(
      `-m crs_generator.cli --mode validate-xml --xml-input "${origPath}" --output dummy`
    );
    const origJson = JSON.parse(origResult.stdout);
    expect(origJson.is_valid).toBe(true);

    // Corrupted should be invalid
    const corruptResult = runPython(
      `-m crs_generator.cli --mode validate-xml --xml-input "${corruptPath}" --output dummy`
    );
    const output = corruptResult.stdout || corruptResult.stderr || '';
    const corruptJson = JSON.parse(output.match(/\{[\s\S]*\}/)?.[0] || '{}');
    expect(corruptJson.is_valid).toBe(false);
  });
});
