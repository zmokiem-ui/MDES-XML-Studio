# Feature Template: New Validator

Use this template when adding a new validation rule or validator component.

---

## Request Format for myway.txt

```
Add validation for [FIELD_NAME] - must [VALIDATION_RULE]
```

**Example:**
```
Add validation for TIN format - must be 9 digits for NL country code
```

---

## What Gets Created

### 1. Python Validation Logic
- Add validation function to `crs_generator/validators.py`
- Update CSV parser validation in `crs_generator/csv_parser.py`
- Add to XML validator in `crs_generator/xml_validator.py`

### 2. Frontend Validation
- Add client-side validation in relevant component
- Show clear error messages
- Prevent submission if validation fails

### 3. Tests
- Unit tests for validation function
- E2E tests for UI validation
- Test both valid and invalid cases

---

## Functional Requirements Template

```markdown
### FR-1: Validation Logic
- Implement validation function for [FIELD_NAME]
- Return clear error message on failure
- Support all relevant contexts (CSV, XML, UI)

### FR-2: Error Messages
- Show field name and expected format
- Provide example of valid value
- Multi-language support for error messages

### FR-3: UI Integration
- Validate on blur (when user leaves field)
- Show error inline near field
- Prevent form submission if invalid
- Clear error when user corrects value

### FR-4: Backend Integration
- Validate in Python CLI before generation
- Include in CSV validation results
- Include in XML validation results
```

---

## Test Requirements

### E2E Tests Must Cover:
- [ ] Valid input passes validation
- [ ] Invalid input shows error message
- [ ] Error message is clear and helpful
- [ ] Error clears when corrected
- [ ] Form submission blocked when invalid
- [ ] All 3 languages show correct error

### Python Tests Must Cover:
- [ ] Validation function returns True for valid input
- [ ] Validation function returns False for invalid input
- [ ] Error message is descriptive
- [ ] Edge cases handled (empty, null, special chars)

---

## Acceptance Criteria

- [ ] All tests pass
- [ ] Error messages are user-friendly
- [ ] Validation works in all contexts (CSV, XML, UI)
- [ ] Multi-language support complete
- [ ] No false positives or negatives
