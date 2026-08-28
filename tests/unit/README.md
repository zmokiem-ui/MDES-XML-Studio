# Unit Tests - MDES XML Studio Backend

Fast, deterministic unit tests for Python backend logic.

## Running Tests

### Run all unit tests
```bash
pytest tests/unit/
```

### Run specific test file
```bash
pytest tests/unit/test_config.py
pytest tests/unit/test_cli_validation.py
pytest tests/unit/test_data_invariants.py
```

### Run with coverage
```bash
pytest tests/unit/ --cov=crs_generator --cov-report=html
```

### Run tests matching pattern
```bash
pytest tests/unit/ -k "test_config"
pytest tests/unit/ -k "validation"
```

## Test Structure

### `test_config.py`
- **DomesticConfig validation**: Default values, path normalization, directory creation
- **Path handling**: Relative/absolute paths, special characters
- **Edge cases**: Large numbers, boundary values, country codes

### `test_cli_validation.py`
- **Argument parsing**: Comma-separated lists, unicode handling
- **CorrectionConfig**: Flag validation, output path normalization
- **CLI validation logic**: Required arguments, missing files
- **Error handling**: Invalid inputs, edge cases

### `test_data_invariants.py`
- **Data generation invariants**: TIN format, account number uniqueness, non-negative balances
- **Data consistency**: Deterministic generation (if seeded), country code formatting
- **Boundaries**: Zero values, large numbers, special characters
- **Multi-language**: Unicode names, non-Latin scripts
- **Error handling**: Invalid country codes, empty inputs

### `test_cts_packaging.py`
- **Format invariants**: 48-byte `key || iv`, AES-256-CBC, compressed payload,
  entry names and order, the enveloping XML-DSig profile MDES verifies
- **Deliberate defects**: each `--defect` produces the failure MDES reports
- **Golden fixture**: decrypts a real delivery from the reference .NET tool and
  pins its hashes. Needs a password for NL; **skips** without one, so a clean
  checkout still runs everything else

Set `MDES_PASSWORDS_FILE` to an ART `TestData/Certificates/Passwords.csv` and
every country resolves at once, instead of one `MDES_SIGNING_PASSWORD_XX` per
country. `python -m crs_generator.cts_cli passwords` reports what a machine can
sign without printing any of it.

### `test_cts_certificates.py`
- **Expiry gate**: fails 90 days before any bundled certificate runs out. This
  is the test that stops a renewal being discovered by a rejected upload
- **Store behaviour**: `GB`/`US` filename prefixes, PEM sniffed regardless of
  extension, a certificate-only export reported as such rather than as a wrong
  password

### `test_mdes_target.py`
- **Properties parsing** (runs anywhere): repeated keys where the last wins,
  `${...}` interpolation, and the several spellings MDES uses for one boolean
- **Database-backed checks** (skip without `MDES_TEST_DB`): that a missing
  CTS.CLR assembly blocks, that the deployed assembly decides which certificate
  columns are read, and that a sender whose stored certificate differs from ours
  is reported as MDES 50004

## Test Categories

Tests use pytest markers for categorization:

```bash
# Run only unit tests
pytest -m unit

# Run only slow tests
pytest -m slow

# Skip network-dependent tests
pytest -m "not requires_network"
```

## Writing New Tests

### Test naming convention
- Test files: `test_*.py`
- Test classes: `Test*`
- Test functions: `test_*`

### Example test structure
```python
class TestFeatureName:
    """Test description."""
    
    @pytest.fixture
    def setup_data(self):
        """Fixture for test data."""
        return SomeData()
    
    def test_specific_behavior(self, setup_data):
        """Test that specific behavior works correctly."""
        result = function_under_test(setup_data)
        assert result == expected_value
```

### Best practices
1. **Keep tests fast**: No file I/O unless necessary, use mocks
2. **Use fixtures**: Share setup code via pytest fixtures
3. **Test one thing**: Each test should verify one specific behavior
4. **Clear assertions**: Use descriptive assertion messages
5. **Use temp directories**: For file I/O tests, use `tempfile.TemporaryDirectory()`

## Coverage Goals

Target coverage by module:
- `config.py`: 90%+
- `cli_utils.py`: 85%+
- `base_data_generator.py`: 80%+
- `cli.py`: 75%+ (validation logic)

## Integration with CI

These unit tests are designed to run on every PR:
- Fast execution (< 5 minutes)
- No external dependencies
- Deterministic results
- Clear failure messages

E2E tests (Playwright) remain for full-regression before release.

## Troubleshooting

### Import errors
```bash
# Ensure crs_generator is in Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

### Fixture not found
Check that pytest is discovering tests correctly:
```bash
pytest --collect-only tests/unit/
```

### Tests pass locally but fail in CI
- Check Python version compatibility (3.8+)
- Verify all dependencies in requirements.txt
- Check for platform-specific assumptions (paths, line endings)
