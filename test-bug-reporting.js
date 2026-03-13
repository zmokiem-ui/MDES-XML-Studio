/**
 * Manual test script to verify bug reporting implementation
 * This checks the code paths without requiring UI interaction
 */

const fs = require('fs');
const path = require('path');

console.log('=== Bug Reporting Implementation Test ===\n');

// Test 1: Check if Octokit is available
console.log('Test 1: Checking @octokit/rest dependency...');
try {
  const { Octokit } = require('@octokit/rest');
  console.log('✓ @octokit/rest is installed and importable\n');
} catch (error) {
  console.log('✗ @octokit/rest not found:', error.message);
  console.log('  Run: cd electron-app && npm install @octokit/rest\n');
}

// Test 2: Check if GH_TOKEN is configured
console.log('Test 2: Checking GH_TOKEN environment variable...');
const token = process.env.GH_TOKEN;
if (token) {
  console.log(`✓ GH_TOKEN is set (${token.substring(0, 7)}...)\n`);
} else {
  console.log('✗ GH_TOKEN not set');
  console.log('  Set it with: $env:GH_TOKEN="your_token_here"\n');
}

// Test 3: Verify main.js has the IPC handlers
console.log('Test 3: Checking IPC handlers in main.js...');
const mainJsPath = path.join(__dirname, 'electron-app', 'electron', 'main.js');
const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

const hasCreateIssueHandler = mainJsContent.includes("ipcMain.handle('create-github-issue'");
const hasScreenshotHandler = mainJsContent.includes("ipcMain.handle('capture-screenshot'");

if (hasCreateIssueHandler) {
  console.log('✓ create-github-issue IPC handler found');
} else {
  console.log('✗ create-github-issue IPC handler NOT found');
}

if (hasScreenshotHandler) {
  console.log('✓ capture-screenshot IPC handler found');
} else {
  console.log('✗ capture-screenshot IPC handler NOT found');
}
console.log('');

// Test 4: Verify preload.js exposes the APIs
console.log('Test 4: Checking preload.js API exposure...');
const preloadPath = path.join(__dirname, 'electron-app', 'electron', 'preload.js');
const preloadContent = fs.readFileSync(preloadPath, 'utf8');

const exposesCreateIssue = preloadContent.includes('createGitHubIssue');
const exposesScreenshot = preloadContent.includes('captureScreenshot');

if (exposesCreateIssue) {
  console.log('✓ createGitHubIssue exposed to renderer');
} else {
  console.log('✗ createGitHubIssue NOT exposed');
}

if (exposesScreenshot) {
  console.log('✓ captureScreenshot exposed to renderer');
} else {
  console.log('✗ captureScreenshot NOT exposed');
}
console.log('');

// Test 5: Verify App.jsx has the bug reporting UI
console.log('Test 5: Checking App.jsx for bug reporting UI...');
const appJsxPath = path.join(__dirname, 'electron-app', 'src', 'App.jsx');
const appJsxContent = fs.readFileSync(appJsxPath, 'utf8');

const hasBugReportSection = appJsxContent.includes('data-testid="bug-report-section"');
const hasBugReportButton = appJsxContent.includes('data-testid="report-bug-button"');
const hasBugReportForm = appJsxContent.includes('data-testid="bug-report-form"');
const hasSubmitHandler = appJsxContent.includes('handleSubmitBugReport');

if (hasBugReportSection) {
  console.log('✓ Bug report section found in Settings');
} else {
  console.log('✗ Bug report section NOT found');
}

if (hasBugReportButton) {
  console.log('✓ Report bug button found');
} else {
  console.log('✗ Report bug button NOT found');
}

if (hasBugReportForm) {
  console.log('✓ Bug report form modal found');
} else {
  console.log('✗ Bug report form modal NOT found');
}

if (hasSubmitHandler) {
  console.log('✓ Submit handler (handleSubmitBugReport) found');
} else {
  console.log('✗ Submit handler NOT found');
}
console.log('');

// Test 6: Check form fields
console.log('Test 6: Checking form fields...');
const hasTitle = appJsxContent.includes('data-testid="bug-title-input"');
const hasDescription = appJsxContent.includes('data-testid="bug-description-input"');
const hasSteps = appJsxContent.includes('data-testid="bug-steps-input"');
const hasExpected = appJsxContent.includes('data-testid="bug-expected-input"');
const hasActual = appJsxContent.includes('data-testid="bug-actual-input"');
const hasEmail = appJsxContent.includes('data-testid="bug-email-input"');
const hasScreenshotBtn = appJsxContent.includes('data-testid="bug-screenshot-button"');

const fields = [
  { name: 'Title input', found: hasTitle },
  { name: 'Description input', found: hasDescription },
  { name: 'Steps input', found: hasSteps },
  { name: 'Expected input', found: hasExpected },
  { name: 'Actual input', found: hasActual },
  { name: 'Email input', found: hasEmail },
  { name: 'Screenshot button', found: hasScreenshotBtn }
];

fields.forEach(field => {
  if (field.found) {
    console.log(`✓ ${field.name}`);
  } else {
    console.log(`✗ ${field.name} NOT found`);
  }
});
console.log('');

// Test 7: Check validation logic
console.log('Test 7: Checking validation logic...');
const hasValidation = appJsxContent.includes('validateBugReport');
const hasTitleValidation = appJsxContent.includes('bugReport.titleRequired');
const hasDescValidation = appJsxContent.includes('bugReport.descriptionRequired');
const hasEmailValidation = appJsxContent.includes('bugReport.invalidEmail');

if (hasValidation) {
  console.log('✓ Validation function exists');
}
if (hasTitleValidation) {
  console.log('✓ Title validation');
}
if (hasDescValidation) {
  console.log('✓ Description validation');
}
if (hasEmailValidation) {
  console.log('✓ Email format validation');
}
console.log('');

// Summary
console.log('=== Summary ===');
const allChecks = [
  hasCreateIssueHandler,
  hasScreenshotHandler,
  exposesCreateIssue,
  exposesScreenshot,
  hasBugReportSection,
  hasBugReportButton,
  hasBugReportForm,
  hasSubmitHandler,
  hasTitle,
  hasDescription,
  hasValidation
];

const passed = allChecks.filter(Boolean).length;
const total = allChecks.length;

console.log(`\nPassed: ${passed}/${total} checks`);

if (passed === total) {
  console.log('\n✓ All implementation checks passed!');
  console.log('\nNext steps:');
  console.log('1. Set GH_TOKEN environment variable');
  console.log('2. Run the app: cd electron-app && npm run electron:dev');
  console.log('3. Navigate to Settings');
  console.log('4. Click "Report a Bug"');
  console.log('5. Fill the form and test submission');
} else {
  console.log(`\n⚠ ${total - passed} checks failed - review implementation`);
}
