# MDES XML Studio

A desktop application for generating valid **CRS**, **FATCA**, and **CbC** AEOI test XML
that testers upload into MDES (the Be Informed–based AEOI case-management system). It
pairs a Python generation/validation backend (`crs_generator`) with an Electron/React UI.

## Reporting standards

| Module | Schema | Notes |
| --- | --- | --- |
| CRS | `CrsXML_v2.0` | default; new + corrections |
| CRS 3.0 | `CrsXML_v3.0` | opt-in via `--crs-version 3.0`; `urn:oecd:ties:crs:v3` |
| FATCA-CRS Combined | `FatcaCrs_v2.2` | default FATCA flow (FC upload) |
| FATCA-CRS Combined 3.0 | `FatcaCrs_v3.0` | opt-in via `--fc-version 3.0`; same namespace as 2.2, version is in `@version` |
| IRS FATCA (`FATCA_OECD`) | `FatcaXML_v2.0.1` | second FATCA flow; MDES hard-checks `@version="2.0.1"` |
| CbC | `CbcXML_v2.0` | new + corrections/deletions |

All generated output is validated against the official XSDs bundled under
`crs_generator/schemas/`, and business rules mirror the MDES validation XSLTs
(see `crs_generator/mdes_rules.py`).

### Domestic filings and foreign deliveries

CRS reaches MDES through two intakes, and the CRS form asks which one you want
before anything else.

A **domestic filing** is submitted by a local FI to its own tax authority, so
`TransmittingCountry` equals `ReceivingCountry`; the form derives the receiving
country from the transmitting one and does not ask for it.

A **foreign delivery** is a file arriving from a partner jurisdiction, uploaded
under `/crs/foreign-deliveries/crs-country-reports`. The two countries must
differ, the ReportingFI is resident in the transmitting country, and every
reported account holder is resident in the receiving one — which is what MDES
rules 60011/60012 check. Choosing Foreign defaults the account-holder country to
the receiving jurisdiction and names the file
`{TransmittingCountry}_CRS_{timestamp}Z_{random}.xml`, the convention the MDES
test tooling uses, so it lines up with the ZIP you encrypt from it.

The CLI takes the same switch:

```bash
python -m crs_generator.cli --mode random --file-type foreign \
  --sending-country IT --receiving-country CW --tax-year 2024 \
  --mytin 123456789 --num-fis 1 --individual-accounts 5 \
  --organisation-accounts 5 --output out/foreign.xml
```

Signing, encryption and ZIP packaging are out of scope — the app produces the
plaintext XML, and you encrypt it with the existing cipher tool.

CRS 3.0 keeps the v2 supporting schemas but moves to its own root namespace and
makes account classification mandatory: `SelfCert` on every account holder and
controlling person, `DDProcedure` and `AccountType` on every account report, and
`CtrlgPersonType` repeatable and required. `EquityInterestType` and
`JointAccount/Number` are new and optional. Version is auto-detected on
validation (by namespace, falling back to `@version`), so 2.0 and 3.0 files can
be mixed freely; only generation needs the explicit switch. Rule **60017** —
an `OECD606` (specified electronic money product) account number requires
`AccountType` `CRS1101` — applies to 3.0 only, matching MDES's own gating.

### CRS 3.0 from CSV

Both CRS generation paths support 3.0: random data and CSV input. A CSV may add
these optional columns; each one left out falls back to the default shown, so a
2.0-era CSV regenerates as a valid 3.0 file unchanged.

| Column | Default | Values |
| --- | --- | --- |
| `AcctNumberType` | `OECD605` | `OECD601`–`OECD606` |
| `SelfCert` | `CRS901` | `CRS901`, `CRS902`, `CRS900` |
| `DDProcedure` | `CRS1201` | `CRS1201`, `CRS1202`, `CRS1200` |
| `AccountType` | `CRS1101` | `CRS1101`–`CRS1104`, `CRS1100` |
| `EquityInterestType` | none | comma-separated `CRS401`–`CRS410` |
| `JointAccount_Number` | none | 1–200 |
| `ControllingPerson_CtrlgPersonType` | `CRS801` | `CRS801`–`CRS813`, `CRS800` |
| `ControllingPerson_SelfCert` | `CRS1001` | `CRS1001`, `CRS1002`, `CRS1000` |

The `xx00` members are the transitional "not reported" codes, valid on input for
correcting pre-3.0 data but never generated for new data.

`AccountType` is not free-standing: MDES rules 60017-60023 tie it to the
account-number type, the payment types and `EquityInterestType`. A row whose
combination breaks one of them is rejected with its MDES error code rather than
written into the output.

| AccountType | AcctNumberType | Payment_Type | EquityInterestType |
| --- | --- | --- | --- |
| `CRS1101` Depository | `OECD605`, `OECD606` | `CRS502` only | not allowed |
| `CRS1102` Custodial | `OECD602`, `OECD604`, `OECD605` | any | not allowed |
| `CRS1103` Insurance/Annuity | `OECD605` only | `CRS503`, `CRS504` | not allowed |
| `CRS1104` Debt/Equity Interest | `OECD602`, `OECD604`, `OECD605` | `CRS503`, `CRS504` | allowed |

`OECD601` and `OECD603` are absent by design: rules 60000/60001 require the
account number to follow the IBAN and ISIN formats, which generated numbers do
not. Rules 60011/60012 additionally require the account holder - or, for an
entity holder, one of its controlling persons - to be resident in the receiving
country; that applies to CRS 2.0 as well. `--mode preview` with
`--crs-version 3.0` emits a CSV template that already includes and populates
these columns. Invalid values, an out-of-range `JointAccount_Number`, an
`OECD606` row whose `AccountType` is not `CRS1101` (rule 60017), and a closed
account with a non-zero balance (rule 60003) are all reported as row-level CSV
errors rather than written into the output.

### FATCA-CRS combined 3.0

The FC upload has its own 3.0, carrying the same classification into the combined
format: `SelfCert` on the account holder and on each controlling person,
`DDProcedure` and `AccountType` on the account report, `CtrlgPersonType`
repeatable, and an optional `JointAccount/Number`. FC 3.0 has **no**
`EquityInterestType`, and its `AccNumberType` stops at `OECD605` (there is no
`OECD606`), so rules 60017 and 60019 cannot arise on an FC upload.

The catch: **FC 3.0 keeps the 2.2 namespace** (`urn:fatcacrs:ties:v2`) and is
distinguished only by `@version` (`fixed="2.2"` vs `fixed="3.0"`). Validation
detects it from that attribute; without it a 3.0 file would be checked against
the 2.2 schema and every new element reported as unexpected.

Generate with `--fc-version 3.0`, or pick the version in the FATCA form. The
same AccountType/account-number/payment constraints as CRS apply.

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
python -m crs_generator.cli   --mode random --crs-version 3.0 --sending-country NL \
                              --receiving-country DE --tax-year 2024 --mytin 12345678 \
                              --num-fis 1 --individual-accounts 5 --organisation-accounts 2 \
                              --controlling-persons 1 --output out/crs3.xml
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
