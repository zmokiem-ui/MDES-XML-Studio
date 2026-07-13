// E2E FATCA Variant Test
// Covers the Phase 2 "FATCA format" toggle: the --variant flag threaded from the
// UI through main.js into fatca_cli. Spawns the Python CLI directly (same path the
// Electron IPC handler takes) and asserts each variant produces the right schema.
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { getTestOutputDir } = require('./helpers');

const OUTPUT_DIR = path.join(getTestOutputDir(), 'fatca-variant-test');
const PROJECT_ROOT = path.join(__dirname, '..', '..');

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

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

test.describe('E2E FATCA Variant Toggle', () => {
  test.beforeAll(async () => {
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  });

  test('1. fatca-oecd variant produces FatcaXML v2.0.1 (FATCA_OECD root)', async () => {
    const outputPath = path.join(OUTPUT_DIR, 'fatca_oecd.xml');

    const result = runPython(
      `-m crs_generator.fatca_cli --mode random --variant fatca-oecd ` +
      `--sending-country NL --receiving-country US --tax-year 2024 ` +
      `--sending-company-in S519K4.00000.LE.840 --num-fis 1 ` +
      `--individual-accounts 2 --organisation-accounts 1 --substantial-owners 1 ` +
      `--output "${outputPath}"`
    );

    expect(result.success).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);

    const xml = readFile(outputPath);
    // Pure IRS FATCA namespace + MDES-mandated version attribute
    expect(xml).toContain('urn:oecd:ties:fatca:v2');
    expect(xml).toContain('version="2.0.1"');
    // Must NOT be the combined FATCA-CRS schema
    expect(xml).not.toContain('FatcaCrs');
  });

  test('2. fatca-oecd output passes XSD validation as FATCA_OECD', async () => {
    const filePath = path.join(OUTPUT_DIR, 'fatca_oecd.xml');
    if (!fs.existsSync(filePath)) { test.skip(); return; }

    const result = runPython(
      `-m crs_generator.fatca_cli --mode validate-xml --xml-input "${filePath}" --output dummy`
    );
    const json = JSON.parse(result.stdout);
    expect(json.is_valid).toBe(true);
    expect(json.xsd_message_type).toBe('FATCA_OECD');
  });

  test('3. default variant (fatca-crs) still produces the FATCA-CRS combined schema', async () => {
    const outputPath = path.join(OUTPUT_DIR, 'fatca_crs.xml');

    const result = runPython(
      `-m crs_generator.fatca_cli --mode random ` +
      `--sending-country CW --receiving-country CW --tax-year 2024 ` +
      `--sending-company-in A1B2C3.00000.SP.350 --num-fis 1 ` +
      `--individual-accounts 2 --organisation-accounts 1 ` +
      `--output "${outputPath}"`
    );

    expect(result.success).toBe(true);
    const xml = readFile(outputPath);
    expect(xml).toContain('FATCA_CRS');
    expect(xml).not.toContain('version="2.0.1"');
  });

  test('4. corrections are refused for the fatca-oecd variant (no wrong-schema output)', async () => {
    const sourcePath = path.join(OUTPUT_DIR, 'fatca_oecd.xml');
    const corrPath = path.join(OUTPUT_DIR, 'fatca_oecd_correction.xml');
    if (!fs.existsSync(sourcePath)) { test.skip(); return; }

    const result = runPython(
      `-m crs_generator.fatca_cli --mode correction --variant fatca-oecd ` +
      `--xml-input "${sourcePath}" --output "${corrPath}" ` +
      `--correct-individual 1 --modify-balance --test-mode`
    );

    // Clear JSON error, and crucially no correction file written
    const json = JSON.parse(result.stdout);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/not supported yet/i);
    expect(fs.existsSync(corrPath)).toBe(false);
  });
});
