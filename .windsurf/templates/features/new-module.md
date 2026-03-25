# Feature Template: New Module

Use this template when adding a new reporting module (like CRS, FATCA, CBC).

---

## Request Format for myway.txt

```
Add new [MODULE_NAME] module for [STANDARD_NAME] reporting
```

**Example:**
```
Add new DAC7 module for Digital Platform Operators reporting
```

---

## What Gets Created

### 1. Python CLI Module
- `crs_generator/[module]_cli.py` - CLI entry point
- `crs_generator/[module]_generator.py` - XML generation logic
- `crs_generator/[module]_validator.py` - XSD validation
- `crs_generator/[module]_correction.py` - Correction file generation

### 2. Frontend Components
- `electron-app/src/components/[Module].jsx` - Main UI component
- IPC handlers in `electron-app/electron/main.js`
- IPC APIs in `electron-app/electron/preload.js`

### 3. Tests
- `electron-app/e2e-tests/[module]-regression.e2e.js` - E2E tests
- `tests/[module]_smoke_test.ps1` - Python smoke tests

### 4. Documentation
- Update `README.md` with new module
- Add to `DEVELOPER.md` workflow guide

---

## Functional Requirements Template

```markdown
### FR-1: XML Generation
- Generate valid [STANDARD] XML from random data
- Generate from CSV input
- Support all required fields per XSD schema

### FR-2: Validation
- Validate against [STANDARD] XSD schema
- Show clear error messages for validation failures
- Support both file and content validation

### FR-3: Correction Mode
- Generate correction files from source XML
- Support field modifications
- Support deletions
- Mark as test data (OECD11/12/13)

### FR-4: UI Integration
- Add module card to home screen
- Implement all 3 pages: Generator, Correction, File Manager
- Multi-language support (EN/NL/ES)
- Match existing UI patterns

### FR-5: IPC Communication
- Add IPC handlers for generation, validation, correction
- Proper error handling and progress reporting
- File path selection dialogs
```

---

## Test Requirements

### E2E Tests Must Cover:
- [ ] Module card appears on home screen
- [ ] Random generation works
- [ ] CSV generation works
- [ ] XML validation works
- [ ] Correction generation works
- [ ] File manager operations work
- [ ] All 3 languages display correctly
- [ ] Error handling works
- [ ] Progress reporting works

### Python Tests Must Cover:
- [ ] CLI generates valid XML
- [ ] XSD validation passes
- [ ] Correction files are valid
- [ ] All command-line arguments work

---

## Acceptance Criteria

- [ ] All E2E tests pass (existing + new)
- [ ] Python smoke test passes
- [ ] Module appears in home screen
- [ ] All 3 languages supported
- [ ] Documentation updated
- [ ] No regressions in existing modules
