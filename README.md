# MDES XML Studio

A desktop application for generating valid **CRS**, **FATCA**, and **CbC** AEOI test XML
that testers upload into MDES (the Be Informed–based AEOI case-management system). It
pairs a Python generation/validation backend (`crs_generator`) with an Electron/React UI.

## Reporting standards

| Module | Schema | Notes |
| --- | --- | --- |
| CRS | `CrsXML_v2.0` | new + corrections |
| FATCA-CRS Combined | `FatcaCrs_v2.2` | default FATCA flow (FC upload) |
| IRS FATCA (`FATCA_OECD`) | `FatcaXML_v2.0.1` | second FATCA flow; MDES hard-checks `@version="2.0.1"` |
| CbC | `CbcXML_v2.0` | new + corrections/deletions |

All generated output is validated against the official XSDs bundled under
`crs_generator/schemas/`, and business rules mirror the MDES validation XSLTs
(see `crs_generator/mdes_rules.py`).

## Download (end users)

Grab the latest installer from [GitHub Releases](https://github.com/zmokiem-ui/MDES-XML-Studio/releases).
The app auto-updates from new releases.

## Quick start (developers)

Prerequisites: **Python 3.11+** and **Node.js 22+**.

```bash
# Python backend (editable install + test deps)
pip install -e .[test]
pytest tests/unit

# Electron app
cd electron-app
npm install
npm run electron:dev
```

The four CLIs the UI drives are also runnable directly, e.g.:

```bash
python -m crs_generator.cli   --mode random --sending-country NL --receiving-country DE \
                              --tax-year 2024 --mytin 12345678 --num-fis 1 \
                              --individual-accounts 5 --organisation-accounts 2 \
                              --controlling-persons 1 --output out/crs.xml
python -m crs_generator.fatca_cli --mode random --variant fatca-oecd ... --output out/fatca.xml
python -m crs_generator.cbc_cli   generate --country NL --year 2024 --tin 999888777 ...
```

Add `--production` (CRS/FATCA) or `--production` (CbC) to emit production DocTypeIndic
(OECD1/FATCA1) instead of the test-env default (OECD11/FATCA11).

## Documentation

- **[docs/DEVELOPING.md](docs/DEVELOPING.md)** — project layout, running, tests, building the backend, CI.
- **[docs/RELEASING.md](docs/RELEASING.md)** — versioning, the tag-driven release pipeline, and auto-updates.
- **[AGENTS.md](AGENTS.md)** — working conventions for AI/dev agents.
- **[SECURITY.md](SECURITY.md)** — security policy and ignored-file patterns.
