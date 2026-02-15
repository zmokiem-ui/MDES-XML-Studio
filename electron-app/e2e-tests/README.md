# E2E Testing with Playwright

Modern, AI-powered end-to-end testing for the MDES XML Studio Electron app.

## Overview

This test suite uses **Playwright** to automate the Electron app UI, simulating real user interactions:
- Launches the actual Electron app
- Clicks buttons, fills forms, navigates tabs
- Verifies UI elements, generates files, validates outputs
- Takes screenshots on failures
- Provides detailed HTML reports

## Test Suites

### 1. Smoke Test (`smoke.e2e.js`) - ~30 seconds
Quick validation of core functionality:
- ✅ App launches and shows module selection
- ✅ CRS module navigation and basic generation
- ✅ FATCA module UI verification
- ✅ CBC module UI verification
- ✅ Faulty XML Generator (Error Injector) UI
- ✅ Theme toggle
- ✅ Language selector
- ✅ Navigation flow
- ✅ Keyboard shortcuts modal

**Run:** `npm run test:e2e:smoke`

### 2. Regression Test (`regression.e2e.js`) - ~2-3 minutes
Comprehensive testing of all features:
- ✅ App startup and module selection (3 modules)
- ✅ CRS: Generator, Correction, Faulty XML, Tools tabs
- ✅ FATCA: Generator, Correction, Faulty XML tabs
- ✅ CBC: Generator, Correction, Faulty XML tabs
- ✅ All Error Injector presets (22 total)
- ✅ Theme switching (light/dark)
- ✅ Language switching (EN/NL/ES)
- ✅ Navigation flow between all modules
- ✅ Tab navigation within each module
- ✅ Form validation
- ✅ Responsive UI (window resize)
- ✅ Keyboard navigation
- ✅ Console error detection
- ✅ Footer elements

**Run:** `npm run test:e2e:regression`

## Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run smoke test only (quick)
npm run test:e2e:smoke

# Run regression test only (comprehensive)
npm run test:e2e:regression

# Run with visible browser (watch the automation)
npm run test:e2e:headed

# Run in debug mode (step through tests)
npm run test:e2e:debug

# Open Playwright UI (interactive test runner)
npm run test:e2e:ui
```

## Test Results

After running tests, view results:
- **HTML Report**: `e2e-test-results/html/index.html`
- **JSON Report**: `e2e-test-results/results.json`
- **Screenshots**: `e2e-test-results/screenshots/` (on failures)
- **Videos**: `e2e-test-results/` (on failures)

## What Gets Tested

### Module Navigation
- ✅ Home screen → CRS/FATCA/CBC
- ✅ Back to home button
- ✅ Tab switching (Generator, Correction, Faulty XML, Tools)

### CRS Module
- ✅ Generator form fields (FIs, accounts, countries)
- ✅ Generate button visibility and state
- ✅ Correction tab UI
- ✅ Faulty XML tab with 8 presets
- ✅ Tools tab (Country Code Replacer)

### FATCA Module
- ✅ Generator form fields (GIIN, filer category, substantial owners)
- ✅ Generate button
- ✅ Correction tab UI
- ✅ Faulty XML tab with 7 presets

### CBC Module
- ✅ Generator form fields (MNE group, reporting entity, reports)
- ✅ Generate button
- ✅ Correction tab UI (OECD2/OECD3)
- ✅ Faulty XML tab with 7 presets

### Error Injector (Faulty XML)
- ✅ File upload UI
- ✅ Corruption intensity slider (1-5)
- ✅ All corruption presets visible
- ✅ Preset selection (visual feedback)
- ✅ Options checkboxes (when preset selected)

### UI Features
- ✅ Theme toggle (light/dark mode)
- ✅ Language selector (EN/NL/ES)
- ✅ Keyboard shortcuts modal
- ✅ Responsive design (1024x768 to 1920x1080)
- ✅ Keyboard navigation (Tab key)
- ✅ No console errors on startup

## Architecture

```
e2e-tests/
├── helpers.js           # Reusable test utilities
├── smoke.e2e.js         # Quick smoke tests (10 tests)
├── regression.e2e.js    # Full regression (25 tests)
└── README.md            # This file
```

### Helper Functions
- `launchElectronApp()` - Start the app
- `closeElectronApp()` - Clean shutdown
- `navigateToModule(window, 'CRS')` - Go to module
- `navigateToPage(window, 'Faulty XML')` - Switch tabs
- `clickElement()`, `fillInput()`, `waitForText()` - UI interactions

## CI/CD Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Run E2E Tests
  run: |
    cd electron-app
    npm run test:e2e
```

## Debugging

### Watch Tests Run
```bash
npm run test:e2e:headed
```
Opens the app visibly so you can watch the automation.

### Step Through Tests
```bash
npm run test:e2e:debug
```
Opens Playwright Inspector for step-by-step debugging.

### Interactive Mode
```bash
npm run test:e2e:ui
```
Opens Playwright UI for interactive test running, time-travel debugging, and test authoring.

## Screenshots on Failure

When a test fails, Playwright automatically:
1. Takes a screenshot
2. Records a video (if enabled)
3. Saves trace for debugging
4. Generates HTML report with all artifacts

## Comparison with Backend Tests

| Feature | Backend Tests | E2E Tests |
|---------|--------------|-----------|
| **Speed** | Fast (~30s) | Slower (~2-3min) |
| **Coverage** | CLI/Python | Full UI |
| **File I/O** | ✅ Direct | ❌ Via dialogs |
| **UI Testing** | ❌ None | ✅ Complete |
| **User Simulation** | ❌ None | ✅ Real clicks |
| **CI-Friendly** | ✅ Very | ✅ Yes (headless) |

**Recommendation**: Run both!
- Backend tests for quick validation
- E2E tests for UI confidence

## Troubleshooting

### Test Fails to Launch App
- Ensure `electron/main.js` path is correct
- Check that `npm run build` completed successfully
- Verify no other Electron instance is running

### Element Not Found
- Increase timeout in `helpers.js`
- Check if element selector changed
- Use `--debug` mode to inspect

### Tests Pass Locally but Fail in CI
- Add `--headed` flag to see what's happening
- Check CI environment has display server (Xvfb)
- Increase timeouts for slower CI machines

## Future Enhancements

- [ ] File generation validation (check actual XML output)
- [ ] CSV upload testing
- [ ] Batch processing E2E
- [ ] XML diff comparison E2E
- [ ] Performance benchmarks
- [ ] Visual regression testing (screenshot comparison)

## Contributing

When adding new features:
1. Add E2E test to `regression.e2e.js`
2. Update this README
3. Run full suite before committing
4. Ensure tests pass in both headed and headless modes
