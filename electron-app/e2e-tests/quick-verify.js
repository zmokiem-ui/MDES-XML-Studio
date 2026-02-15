// Quick verification that E2E setup works
const { _electron: electron } = require('playwright');
const path = require('path');

async function quickVerify() {
  console.log('🚀 Launching Electron app...');
  
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '../electron/main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      E2E_TEST: 'true'
    }
  });

  console.log('✅ App launched successfully');

  const window = await electronApp.firstWindow();
  console.log('✅ Window opened');

  await window.waitForLoadState('domcontentloaded');
  console.log('✅ DOM loaded');

  await window.waitForTimeout(2000);

  const title = await window.title();
  console.log(`✅ App title: "${title}"`);

  // Check for module cards
  const crsCard = await window.locator('text=CRS').count();
  const fatcaCard = await window.locator('text=FATCA').count();
  const cbcCard = await window.locator('text=CBC').count();

  console.log(`✅ Module cards found: CRS=${crsCard}, FATCA=${fatcaCard}, CBC=${cbcCard}`);

  // Take screenshot
  const screenshotPath = path.join(__dirname, '../e2e-test-results/screenshots/verify.png');
  await window.screenshot({ path: screenshotPath });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);

  await electronApp.close();
  console.log('✅ App closed cleanly');

  console.log('\n✨ E2E setup verified successfully!');
  console.log('\nRun tests with:');
  console.log('  npm run test:e2e:smoke      # Quick smoke test');
  console.log('  npm run test:e2e:regression # Full regression');
  console.log('  npm run test:e2e:headed     # Watch tests run');
}

quickVerify().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
