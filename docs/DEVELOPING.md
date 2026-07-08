# Developing MDES XML Studio

## Project layout

```
crs_generator/            Python backend (generators, validators, CLIs)
  cli.py                  CRS CLI
  fatca_cli.py            FATCA CLI (fatca-crs + fatca-oecd variants)
  cbc_cli.py              CbC CLI (subcommands: generate/correct/validate-*)
  error_injector.py       Faulty-XML generator for negative testing
  xsd_validator.py        Real XSD validation against bundled schemas
  mdes_rules.py           MDES business-rule checks (portal-acceptance prediction)
  schemas/                Official XSD sets (crs, fatca_crs, fatca, cbc)
  template */             Base XML templates cloned during generation
electron-app/             Electron/React desktop UI
  electron/main.js        IPC handlers; spawns the Python CLIs
  electron/preload.js     contextBridge API
  src/App.jsx             React UI
  e2e-tests/              Playwright specs
tests/unit/               pytest suite (unit + XSD-validity)
pyproject.toml            Python packaging + pinned deps + CLI entry points
```

The UI never generates XML itself — it shells out to the four CLIs over IPC and
renders their JSON results.

## Prerequisites

- Python **3.11+**
- Node.js **22+**

## Python backend

```bash
pip install -e .[test]      # runtime deps + pytest
```

Run the generators directly (the UI passes the same flags):

```bash
python -m crs_generator.cli        --mode random ... --output out/crs.xml
python -m crs_generator.fatca_cli  --mode random --variant {fatca-crs|fatca-oecd} ... --output out/fatca.xml
python -m crs_generator.cbc_cli    generate ... --output out/cbc.xml
python -m crs_generator.error_injector --input in.xml --output bad.xml --module crs --preset missing_required --level 3 --options "{}"
```

Validate any file (also exposed as CLI modes/subcommands used by the UI):

```bash
python -m crs_generator.xsd_validator out/crs.xml
python -m crs_generator.cli       --mode validate-xml --xml-input out/crs.xml --output dummy
python -m crs_generator.cbc_cli   validate-xml --xml-input out/cbc.xml
```

### Test vs production DocTypeIndic

The MDES test env expects OECD10-13 / FATCA11-14; production expects OECD0-3 /
FATCA1-4 (rules 50010/50011). Test is the **default**. Pass `--production` to emit
production indicators. `--test-mode` is a deprecated no-op alias.

## Tests

```bash
pytest tests/unit                        # full unit + XSD-validity suite
pytest tests/unit/test_xsd_validity.py   # generate -> XSD-validate every module
```

The XSD-validity suite generates each message type and validates it against the
real schema, including a negative control and a placeholder/`--` deny-list check.

## Electron app

```bash
cd electron-app
npm install
npm run electron:dev     # Vite dev server + Electron with DevTools
npm run build            # production Vite build (dist/)
```

### E2E (Playwright, launches the real app)

```bash
cd electron-app
npm run test:e2e:smoke        # ~10 quick UI checks
npm run test:e2e:regression   # full UI regression
npm run test:e2e:files        # CLI generation + validation
```

In E2E the app runs unpackaged, so it spawns **system Python** — the backend deps
must be importable in the environment running the tests.

## Building the bundled backend

`build_python_backend.py` uses PyInstaller to produce standalone CLI executables
that the packaged app ships in `python-dist/` (resolved via `process.resourcesPath`
when packaged, `sys._MEIPASS` when frozen).

```bash
pip install -e .[build]
python build_python_backend.py
```

## CI

- **ci.yml** runs on every push/PR (windows-latest): pytest (3.12) + Vite build +
  Playwright smoke.
- **build-release.yml** runs on `v*` tags: pytest gate → PyInstaller backend →
  Vite build → Playwright smoke → electron-builder NSIS installer → upload. See
  [RELEASING.md](RELEASING.md).
