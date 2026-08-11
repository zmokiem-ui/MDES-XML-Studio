# MDES XML Studio v2.0.1

Fixes generated CRS files being rejected by MDES on record-level business
rules. **Anyone who generated files with v2.0.0 should regenerate them.**

## What was wrong

v2.0.0 was verified against the CRS 3.0 XSD and the MDES trunk reference files,
and passed both. That was not enough: MDES also enforces record-level business
rules that a schema cannot express, and v2.0.0 generated data that broke six of
them. The files were structurally perfect and still rejected on upload.

The CRS 3.0 rules live in the MDES knowledge model
(`Bibliotheek PFGU/2000 Domeinkennis/2100 Kernbegrippen/Crs Recordlevel Error.bixml`,
conditions in `.../CRS3 account report semantic rules.bixml`), not in the
validation XSLT where v2.0.0 looked — which is why only rule 60017 was found.

## Rules now enforced

`AccountType` is no longer drawn independently. It is chosen first, and the
account-number type, payment types and `EquityInterestType` all follow from it:

| Rule | Constraint |
| --- | --- |
| 60017 | `OECD606` account number requires `AccountType` `CRS1101` |
| 60018 | `OECD601` account number requires `AccountType` `CRS1101` |
| 60019 | `EquityInterestType` present requires `AccountType` `CRS1104` |
| 60020 | `AccountType` `CRS1103` requires `AcctNumberType` `OECD605` |
| 60021 | `AccountType` `CRS1101` requires every `Payment/Type` to be `CRS502` |
| 60022 | `AccountType` `CRS1104` requires every `Payment/Type` to be `CRS503`/`CRS504` |
| 60023 | `AccountType` `CRS1103` requires every `Payment/Type` to be `CRS503`/`CRS504` |

Also fixed, and **these affect CRS 2.0 as well as 3.0**:

- **60011 / 60012** — an account is only reportable if the holder, or for an
  entity holder one of its controlling persons, is resident in the receiving
  country. Residences were drawn from the reportable-jurisdiction list and
  almost never matched. The receiving country is now added as an additional
  `ResCountryCode`; the randomly drawn one is kept alongside it, so residence
  variety in the test data is unchanged.
- **60000 / 60001** — `OECD601` and `OECD603` oblige the account number to
  follow the IBAN and ISIN structured formats, which generated numbers do not.
  Neither type is emitted any more, and the CSV default moved from `OECD601` to
  `OECD605` ("unspecified").

## The tool now catches these itself

- `mdes_rules.py` implements 60011, 60012 and 60018–60023, so validating a file
  in the app reports them before upload.
- The CSV parser rejects rule-violating rows at source, with the MDES error code
  in the message, rather than writing them into the output.
- The smoke suite now asserts zero MDES findings on every CRS artefact it
  generates. v2.0.0 checked XSD validity only, which is precisely why this
  shipped.

## Compatibility

- CRS 2.0 output gains an extra `ResCountryCode` (the receiving country) on
  account holders and controlling persons. This is required by rule 60011/60012
  and is schema-valid — `ResCountryCode` is unbounded in both party types.
- CSV input: rows whose `AccountType` conflicts with their account-number type,
  payment type or `EquityInterestType` are now rejected. The 3.0-only rules are
  applied only when generating 3.0.
- The CSV `AcctNumberType` default changed from `OECD601` to `OECD605`.

## Verification

- 196 Python unit tests (28 new, covering every rule plus a negative control
  that mutates valid output and asserts the exact finding count)
- 44 CLI smoke checks, 135 CLI regression checks
- Generated CRS 2.0 and 3.0 output, from both the random and CSV paths, now
  reports zero MDES findings

## Update notes

- Existing installed users receive this through the in-app auto-updater after
  the GitHub release is published.
- The release includes `latest.yml` and `.blockmap` metadata for
  electron-updater.
