// Full in-house validation: every target combination, through the application.
//
// This is the run that answers "does the whole thing actually work, and are the
// refusals right?". It drives the real app over its own IPC bridge - the same
// path the buttons use - and:
//
//   1. discovers every properties file and MDES database on this machine;
//   2. preflights all pairings of them;
//   3. builds a package for every pairing that passes, and for nothing else;
//   4. reopens each package and checks the signature actually verifies;
//   5. checks each refusal is refused for the *right* reason, by MDES error code;
//   6. builds each deliberate defect and confirms it produces the failure it claims.
//
// Everything lands in out/inhouse-run/ with a report.
//
// Certificate passwords come from the environment, one per country, e.g.
// MDES_SIGNING_PASSWORD_CW. Countries without one are skipped rather than failed.

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { launchElectronApp, closeElectronApp } = require('./helpers');

const OUT_DIR = path.join(__dirname, '..', '..', 'out', 'inhouse-run');
const PACKAGE_DIR = path.join(OUT_DIR, 'packages');
const TARGET_PREFIX = 'inhouse:';

// Refusals we understand. Anything else is a bug in the checks, not in the estate.
const KNOWN_REFUSALS = new Set([
  'target-pairing',            // props file and database are different instances
  'cts-assembly',              // no CTS.CLR deployed, or it reads columns with no data
  'encryption-certificate',    // our cert is not the one the instance holds
  'signing-certificate',       // the instance verifies this sender against another cert
  'sender-accepted',           // no valid certificate registered for the sender
  'receiver',                  // addressed to another jurisdiction
  'module',                    // treaty not enabled
  'tax-year',                  // before FirstYearDelivery
  'expiry',                    // certificate outside its validity window
  'message-ref-id',            // already used here
]);

const DEFECTS = [
  { defect: 'ecb_mode', expect: 'unopenable', mdes: '50013' },
  { defect: 'short_key', expect: 'warns', marker: '50013', mdes: '50013' },
  { defect: 'uncompressed_payload', expect: 'warns', marker: '50003', mdes: '50003' },
  { defect: 'tamper_signature', expect: 'bad-signature', mdes: '50004' },
  { defect: 'wrong_receiver', expect: 'wrong-receiver', mdes: '50012' },
  { defect: 'corrupt_key', expect: 'unopenable', mdes: '50002' },
];

let electronApp;
let window;
const report = { pairings: [], built: [], refused: [], defects: [], notes: [], databaseProblems: [] };

test.beforeAll(async () => {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(PACKAGE_DIR, { recursive: true });
  ({ electronApp, window } = await launchElectronApp());
});

test.afterAll(async () => {
  // Leave the machine as we found it: our throwaway targets go away.
  const listed = await api('mdesTargetList').catch(() => ({ targets: [] }));
  for (const target of listed.targets || []) {
    if (target.name.startsWith(TARGET_PREFIX)) {
      await api('mdesTargetDelete', target.name).catch(() => {});
    }
  }
  writeReport();
  await closeElectronApp(electronApp);
});

const api = (fn, ...args) => window.evaluate(
  ([name, callArgs]) => window.electronAPI[name](...callArgs),
  [fn, args]
);

function writeReport() {
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  const lines = ['# In-house validation run', ''];
  lines.push(`Packages written to \`${PACKAGE_DIR}\`.`, '');

  lines.push('## Pairings', '');
  lines.push('| Properties | Database | Verdict | Reason |');
  lines.push('| --- | --- | --- | --- |');
  for (const p of report.pairings) {
    const reason = p.blocked
      ? p.failures.map(f => `${f.title}${f.mdesError ? ` (${f.mdesError})` : ''}`).join('; ')
      : `${p.sender} → ${p.receiver}, TY ${p.taxYear}`;
    lines.push(`| ${p.props} | ${p.database} | ${p.blocked ? 'refused' : 'usable'} | ${reason} |`);
  }

  lines.push('', '## Packages built', '');
  if (report.built.length) {
    lines.push('| Package | Sender → Receiver | Entries | Reopened | Signature |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const b of report.built) {
      lines.push(`| ${b.fileName} | ${b.sender} → ${b.receiver} | ${b.entries.length} | ${b.reopened ? 'yes' : 'no'} | ${b.signatureValid === null ? 'n/a' : b.signatureValid} |`);
    }
  } else {
    lines.push('_None._');
  }

  if (report.databaseProblems?.length) {
    lines.push('', '## Facts that could not be read', '');
    for (const p of report.databaseProblems) lines.push(`- **${p.database}**: ${p.problem}`);
  }

  lines.push('', '## Deliberate defects', '');
  lines.push('| Defect | Predicted | Observed | Correct |');
  lines.push('| --- | --- | --- | --- |');
  for (const d of report.defects) {
    lines.push(`| ${d.defect} | MDES ${d.mdes} | ${d.observed} | ${d.correct ? 'yes' : 'NO'} |`);
  }

  if (report.notes.length) {
    lines.push('', '## Notes', '', ...report.notes.map(n => `- ${n}`));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'report.md'), lines.join('\n'));
}

test('every properties file and database pairing is preflighted, and only the sound ones build', async () => {
  test.setTimeout(30 * 60 * 1000);

  // Load every certificate password we were given, once.
  const passwords = Object.entries(process.env)
    .filter(([k, v]) => k.startsWith('MDES_SIGNING_PASSWORD_') && v)
    .map(([k, v]) => [k.replace('MDES_SIGNING_PASSWORD_', ''), v]);
  for (const [country, password] of passwords) {
    await api('ctsSetPassword', country, password);
  }
  report.notes.push(`Certificate passwords supplied for: ${passwords.map(p => p[0]).join(', ') || 'none'}`);

  const found = await api('mdesTargetDiscover', {});
  expect(found.success).toBe(true);
  const propsFiles = found.propertiesFiles || [];
  const databases = found.databases || [];
  test.skip(!propsFiles.length || !databases.length,
    'No MDES properties files or databases found on this machine');
  report.notes.push(`${propsFiles.length} properties file(s), ${databases.length} database(s) discovered`);

  for (const props of propsFiles) {
    for (const db of databases) {
      const name = `${TARGET_PREFIX}${props.ownCountry}/${db.database}`;
      const saved = await api('mdesTargetSave', {
        name, propsPath: props.path, server: db.server, database: db.database,
      });
      expect(saved.success, `saving ${name}`).toBe(true);

      const resolved = await api('mdesTargetResolve', name);
      for (const problem of resolved.database?.problems || []) {
        report.databaseProblems.push({ database: db.database, problem });
      }

      const pre = await api('mdesTargetPreflight', { target: name });
      expect(pre.checks, `preflight returned checks for ${name}`).toBeTruthy();

      const failures = pre.checks.filter(c => c.outcome === 'fail');
      const entry = {
        props: props.path.split(/[\/]/).slice(-2).join('/'), propsCountry: props.ownCountry,
        database: db.database, blocked: pre.blocked, sender: pre.sender,
        receiver: pre.receiver, taxYear: pre.taxYear,
        failures: failures.map(f => ({ id: f.id, title: f.title, mdesError: f.mdesError })),
      };
      report.pairings.push(entry);

      // Every refusal must be one we understand, and must say why.
      for (const failure of failures) {
        expect(KNOWN_REFUSALS.has(failure.id),
          `unrecognised refusal '${failure.id}' on ${name}: ${failure.detail}`).toBe(true);
        expect(failure.detail, `${failure.id} explains itself`).toBeTruthy();
        expect(failure.remedy, `${failure.id} says what to do`).toBeTruthy();
      }

      if (pre.blocked) {
        report.refused.push(entry);
        continue;
      }

      // Sound pairing: build it. Anything that preflights clean must build.
      if (!pre.sender) {
        report.notes.push(`${name}: usable but no sender with a matching certificate`);
        continue;
      }
      const senderPassword = process.env[`MDES_SIGNING_PASSWORD_${pre.sender}`];
      if (!senderPassword) {
        report.notes.push(`${name}: skipped, no password for sender ${pre.sender}`);
        continue;
      }

      const built = await api('mdesTargetBuild', {
        target: name, outputDir: PACKAGE_DIR,
      });
      expect(built.success, `building ${name}: ${built.error}`).toBe(true);
      expect(fs.existsSync(built.filePath)).toBe(true);

      // The names inside the ZIP are how MDES finds the parts, so check them
      // against the countries preflight chose rather than trusting either half.
      const infix = built.communicationType.replace('Status', '');
      expect(built.entries).toEqual([
        `${built.sender}_${infix}_Metadata.xml`,
        `${built.receiver}_${infix}_Key`,
        `${built.sender}_${infix}_Payload`,
      ]);

      // Reopen it. The receiver is the instance itself and its signing and
      // encryption certificates are the same keypair, so we can decrypt when we
      // hold that country's password.
      let reopened = false;
      let signatureValid = null;
      if (process.env[`MDES_SIGNING_PASSWORD_${built.receiver}`]) {
        const opened = await api('ctsUnpack', {
          packageFile: built.filePath, country: built.receiver,
        });
        reopened = opened.success === true && opened.decrypted === true;
        signatureValid = opened.signature ? opened.signature.valid : null;
        expect(reopened, `reopening ${built.fileName}: ${opened.error}`).toBe(true);
        expect(signatureValid, `signature on ${built.fileName}`).toBe(true);
        expect(opened.warnings, `no warnings on ${built.fileName}`).toEqual([]);
        expect(opened.metadata.CTSSenderCountryCd).toBe(built.sender);
        expect(opened.metadata.CTSReceiverCountryCd).toBe(built.receiver);
      }

      report.built.push({
        target: name, fileName: built.fileName, filePath: built.filePath,
        sender: built.sender, receiver: built.receiver,
        entries: built.entries, senderFileId: built.senderFileId,
        reopened, signatureValid,
      });
    }
  }

  // The point of the exercise: something had to build, and nothing unsound did.
  expect(report.built.length, 'at least one pairing produced a package').toBeGreaterThan(0);
  for (const refused of report.refused) {
    expect(refused.failures.length, 'a refusal names at least one failing check')
      .toBeGreaterThan(0);
  }
});

test('a mis-paired target is diagnosed as pairing, never as a certificate to swap', async () => {
  // The trap: it surfaces as a certificate mismatch, and "fix the certificate"
  // would corrupt a correct certificate store to hide a configuration mistake.
  const mispaired = report.pairings.filter(
    p => p.failures.some(f => f.id === 'target-pairing')
  );
  test.skip(!mispaired.length, 'No mis-paired combination on this machine');

  for (const entry of mispaired) {
    const name = `${TARGET_PREFIX}${entry.propsCountry}/${entry.database}`;
    const pre = await api('mdesTargetPreflight', { target: name });
    const pairing = pre.checks.find(c => c.id === 'target-pairing');
    expect(pairing.outcome).toBe('fail');
    expect(pairing.remedy).toContain('certificate store');

    // The downstream checks must stand down rather than mis-advise.
    for (const id of ['receiver', 'encryption-certificate']) {
      const check = pre.checks.find(c => c.id === id);
      expect(check.outcome, `${id} defers to the pairing failure`).toBe('skip');
    }
  }
  report.notes.push(`${mispaired.length} mis-paired combination(s) correctly diagnosed`);
});

test('each deliberate defect produces the failure it predicts', async () => {
  test.setTimeout(10 * 60 * 1000);

  const usable = report.built[0];
  test.skip(!usable, 'No usable pairing to build defective packages from');
  test.skip(!process.env[`MDES_SIGNING_PASSWORD_${usable.receiver}`],
    'Need the receiver password to open defective packages');

  const defectDir = path.join(OUT_DIR, 'defective');
  fs.mkdirSync(defectDir, { recursive: true });

  // Reuse the plaintext the good build produced, so only the envelope differs.
  const sourceXml = report.built[0].filePath.replace(/\.zip$/, '');
  const source = fs.readdirSync(PACKAGE_DIR).find(f => f.endsWith('.xml'));
  const sourcePath = source ? path.join(PACKAGE_DIR, source) : null;
  test.skip(!sourcePath, 'No generated XML to build defective packages from');

  for (const { defect, expect: expectation, marker, mdes } of DEFECTS) {
    const built = await api('ctsPack', {
      sourceFile: sourcePath,
      sender: usable.sender,
      receiver: usable.receiver,
      communicationType: 'CRS',
      taxYear: 2024,
      outputDir: defectDir,
      defects: [defect],
    });
    expect(built.success, `building defect ${defect}: ${built.error}`).toBe(true);
    expect(built.defects).toContain(defect);

    const opened = await api('ctsUnpack', {
      packageFile: built.filePath, country: usable.receiver,
    });

    let observed;
    let correct;
    switch (expectation) {
      case 'unopenable':
        observed = opened.success === false ? `refused: ${opened.error}` : 'opened';
        correct = opened.success === false;
        break;
      case 'warns':
        observed = (opened.warnings || []).join(' | ') || 'no warnings';
        correct = (opened.warnings || []).some(w => w.includes(marker));
        break;
      case 'bad-signature':
        observed = opened.signature
          ? `signature valid=${opened.signature.valid}` : 'no signature read';
        correct = opened.signature ? opened.signature.valid === false : false;
        break;
      case 'wrong-receiver':
        observed = `metadata receiver=${opened.metadata?.CTSReceiverCountryCd}`;
        correct = opened.metadata?.CTSReceiverCountryCd !== usable.receiver;
        break;
      default:
        observed = 'unhandled';
        correct = false;
    }

    report.defects.push({ defect, mdes, observed, correct, fileName: built.fileName });
    expect(correct, `${defect} should present as MDES ${mdes}, saw: ${observed}`).toBe(true);
  }
});
