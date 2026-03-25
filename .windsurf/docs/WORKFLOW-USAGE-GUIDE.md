# Windsurf Workflow Usage Guide for CRS-xml-generator

## Quick Start

### 1. Add Your Request
```bash
# Edit myway.txt
echo "Add export to Excel feature" > windsurf/.windsurf/myway.txt
```

### 2. Let Cascade Process It
Cascade will automatically:
- Formalize your request → `current-request.md`
- Create tests
- Implement the feature
- Validate everything works
- Ask for your satisfaction

### 3. Confirm Satisfaction
```powershell
powershell windsurf/.windsurf/satisfied.ps1
```

---

## When to Use Which Template

### New Module (CRS, FATCA, CBC-like)
**Use:** `templates/features/new-module.md`  
**Example Request:** "Add new DAC7 module for digital platform reporting"  
**Creates:** Python CLI, frontend component, tests, docs

### New Validator
**Use:** `templates/features/new-validator.md`  
**Example Request:** "Add validation for TIN format - must be 9 digits for NL"  
**Creates:** Validation function, error messages, tests

### UI Component
**Use:** `templates/features/ui-component.md`  
**Example Request:** "Add export to Excel button to results page"  
**Creates:** React component, translations, tests

---

## Using Test Templates

### Electron Feature Test
**Copy from:** `templates/tests/electron-feature.spec.ts`  
**Use for:** Any Electron-specific feature  
**Includes:** Window management, IPC, multi-language

### IPC Communication Test
**Copy from:** `templates/tests/ipc-communication.spec.ts`  
**Use for:** Testing main ↔ renderer communication  
**Includes:** Request/response, error handling, file operations

---

## Using Helpers

### Electron Helpers
```typescript
import { launchElectronApp, switchLanguage, navigateToModule } from '../helpers/electron-helpers'

test('my test', async () => {
  const { app, window } = await launchElectronApp(electron)
  await switchLanguage(window, 'nl')
  await navigateToModule(window, 'crs')
  // ... your test logic
})
```

---

## Running Tests

### Run All Workflow Tests
```powershell
powershell windsurf/.windsurf/tools/test-runner.ps1
```

### Run Specific Test
```powershell
powershell windsurf/.windsurf/tools/test-runner.ps1 -TestFile "my-feature.spec.ts"
```

### Run in Headed Mode (see browser)
```powershell
powershell windsurf/.windsurf/tools/test-runner.ps1 -Headed
```

---

## Best Practices

### ✅ DO
- Use templates for common patterns
- Write tests before implementation
- Test all 3 languages (EN/NL/ES)
- Add data-testid attributes
- Keep requests focused and clear

### ❌ DON'T
- Skip the satisfaction gate
- Modify current-request.md manually (let Cascade do it)
- Write tests after implementation
- Hardcode text (use translations)
- Make requests too broad

---

## Troubleshooting

### "Tests are failing"
1. Check console errors in Electron DevTools
2. Verify IPC handlers are registered
3. Check data-testid attributes exist
4. Run in headed mode to see what's happening

### "Workflow seems stuck"
1. Check current-request.md for status
2. Run proceed.ps1 to continue
3. Check if tests are running in background

### "Can't find template"
All templates are in `windsurf/.windsurf/templates/`
- `features/` - Feature type templates
- `tests/` - Test templates
- `requests/` - Request templates

---

## Example: Complete Workflow

```bash
# 1. Add request
echo "Add TIN validation for NL - must be 9 digits" > windsurf/.windsurf/myway.txt

# 2. Cascade formalizes (Phase 1)
# Creates current-request.md with:
# - FR-1: Validation function
# - FR-2: Error messages
# - FR-3: UI integration
# - AC-1: Tests pass

# 3. Review and proceed
powershell windsurf/.windsurf/proceed.ps1
# Answer: y

# 4. Cascade creates tests (Phase 2)
# Creates: tin-validation.spec.ts

# 5. Cascade implements (Phase 3)
# Updates: validators.py, App.jsx, translations.js

# 6. Tests run automatically (Phase 4)
# All tests pass ✅

# 7. Satisfaction gate (Phase 6)
powershell windsurf/.windsurf/satisfied.ps1
# Answer: y

# Done! Feature is complete and tested.
```

---

## Integration with Existing Tests

The workflow integrates seamlessly with your existing 73 E2E tests:
- Workflow tests are additive (don't replace existing tests)
- Use same Playwright configuration
- Run alongside existing tests in CI/CD
- Follow same patterns and conventions

---

## Next Steps

1. Try the workflow with a small feature
2. Measure time savings
3. Adjust templates to your needs
4. Share with team
5. Iterate and improve
