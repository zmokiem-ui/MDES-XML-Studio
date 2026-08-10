# MDES XML Studio v2.0.0

CRS 3.0 support, plus fixes for four bugs that made every CSV-generated CRS file
schema-invalid.

## CRS 3.0

CRS 3.0 (`urn:oecd:ties:crs:v3`) is now a first-class option alongside 2.0,
which remains the default. Pick the version in the Message Header (random data)
or in the CSV upload card (CSV input), or pass `--crs-version 3.0` on the CLI.

The schema keeps the 2.0 supporting XSDs but makes account classification
mandatory:

| Where | CRS 3.0 addition |
| --- | --- |
| `AccountHolder` | `SelfCert` mandatory; `EquityInterestType` optional, repeatable |
| `ControllingPerson` | `CtrlgPersonType` mandatory and repeatable; `SelfCert` mandatory |
| `AccountReport` | `DDProcedure` and `AccountType` mandatory; `JointAccount/Number` optional |

Supported end to end: generation from random data and from CSV, XSD validation,
business-rule validation, corrections and deletions, and error injection.

- **Version is auto-detected on validation** by root namespace, falling back to
  `@version`. Previously a 3.0 file would have been checked against the 2.0
  schema and every new element reported as unexpected. 2.0 and 3.0 files can be
  mixed freely; only generation needs the explicit switch.
- **MDES rule 60017** is implemented and version-gated exactly as MDES gates it:
  an `OECD606` (specified electronic money product) account number requires
  `AccountType` `CRS1101`.
- **CSV input** accepts eight optional CRS 3.0 columns, each with a valid
  default, so an existing CSV regenerates as a valid 3.0 file with no edits. See
  the README for the column table.
- The transitional `xx00` "not reported" codes are accepted on input for
  correcting pre-3.0 data but are never generated for new data.

## Fixes

Four bugs made **every** CSV-generated CRS file fail XSD validation. None of
them affected the random-data path.

- `AccountReport` was attached directly to `CrsBody` instead of being nested in
  `ReportingGroup`.
- `AddressFix` emitted `City` before `PostCode`; the schema sequence is
  `PostCode` then `City`.
- `AcctHolderType` was only written when a controlling person was present, but
  it is mandatory for every `Organisation` holder. An organisation with no
  controlling person is now reported as `CRS103` instead of being rejected —
  matching MDES rules 60005/60006.
- Extra `Payment` nodes were appended to the end of `AccountReport`. Harmless in
  2.0 where `Payment` closed the sequence, but in 3.0 it pushed them past
  `DDProcedure`/`AccountType`.

Also fixed:

- The CSV path hardcoded production `OECD1` DocTypeIndic while the app defaults
  to the test environment, so CSV output always tripped MDES rule 50010 on a
  test upload. It now follows the same test/production setting as every other
  path.
- A CSV declaring a closed account with a non-zero balance produced output that
  violates MDES rule 60003. It is now a row-level CSV error.
- `--controlling-persons 0` was silently treated as 1 in preview/CSV mode.
- Six Playwright E2E suites inherited `ELECTRON_RUN_AS_NODE` from the parent
  environment, which made the launched Electron binary run as plain Node. Those
  suites could not run from any Electron-hosted terminal (VS Code, Cursor).

## Compatibility

- CRS 2.0 remains the default everywhere. Random-data 2.0 output is unchanged.
- **CSV output changes**, by design: reports are now nested in `ReportingGroup`,
  `AddressFix` order is corrected, `AcctHolderType` is always present, and
  DocTypeIndic follows the test/production setting (test `OECD11` by default
  rather than always production `OECD1`). Use the production toggle if you were
  relying on `OECD1`.
- CSVs that declare a closed account with a non-zero balance are now rejected
  instead of producing invalid output.

## Verification

- 168 Python unit tests (64 new for CRS 3.0 and the CSV path)
- 40 CLI smoke checks, 135 CLI regression checks
- 76 Playwright E2E checks, including a CRS 3.0 generation flow driven through
  the UI version selector
- CRS 3.0 output validated against the eight MDES trunk reference files: the
  four valid ones pass, and each of the four deliberate-error files is rejected
  for exactly its intended defect

## Update notes

- Existing installed users receive this through the in-app auto-updater after
  the GitHub release is published.
- The release includes `latest.yml` and `.blockmap` metadata for
  electron-updater.
