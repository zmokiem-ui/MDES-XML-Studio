# MDES XML Studio v2.1.0

Adds FATCA-CRS combined (FC) 3.0 — the FC upload equivalent of CRS 3.0 — which
MDES already accepts today.

## FC 3.0

Pick the version in the FATCA form (shown for the FATCA-CRS Combined variant) or
pass `--fc-version 3.0`. 2.2 remains the default. Supported end to end:
generation, XSD validation, business-rule validation, and corrections.

The schema carries the CRS 3.0 classification into the combined format:

| Where | FC 3.0 addition |
| --- | --- |
| `AccountHolder` | `SelfCert` mandatory, first in the sequence |
| `ControllingPerson` | `CtrlgPersonType` becomes repeatable (1..∞); `SelfCert` mandatory |
| `AccountReport` | `DDProcedure` and `AccountType` mandatory; optional `JointAccount/Number` |

Two differences from CRS 3.0 worth knowing, because assuming they match would be
wrong: FC 3.0 has **no `EquityInterestType`**, and its `AccNumberType` stops at
`OECD605` — there is no `OECD606`. MDES rules 60017 and 60019 therefore cannot
arise on an FC upload.

**FC 3.0 keeps the 2.2 namespace.** Both versions are
`urn:fatcacrs:ties:v2`; only `@version` separates them (`fixed="2.2"` vs
`fixed="3.0"`), which is also how MDES routes the upload. Version detection now
reads that attribute — previously a 3.0 file was silently validated against the
2.2 schema, so every new element was reported as unexpected.

As with CRS, `AccountType` is drawn first and the account-number and payment
types follow from it, so generated data cannot break the MDES account-type
rules. `fatca_validator` now reports 60018/60020/60021/60022/60023 and the
missing mandatory fields, so a bad FC 3.0 file is flagged before upload.

## Fixes

- **Payments were appended** to `AccountReport` in the FATCA generator instead of
  inserted after `AccountBalance`. Harmless in 2.2 where `Payment` closed the
  sequence; in 3.0 it placed them after `DDProcedure` and `AccountType`. This is
  the same defect fixed in the CRS generator in v2.0.0.
- **Controlling persons built programmatically carried no `SelfCert`**, leaving
  them schema-invalid under 3.0.
- **`FATCA105` (Direct Reporting NFFE) was rejected by the validator** although
  `AcctHolderTypeFatca_EnumType` allows `FATCA101`–`FATCA105` in both 2.2 and
  3.0. Pre-existing, affected 2.2 as well, and intermittent because it depended
  on the random draw.

## A note on rule coverage

It could not be confirmed from the MDES process model whether the record-level
rules 60018–60023 are applied to an FC upload as they are to CRS: the FCE
validation entry point runs the message-level instrument, and the
account-report rules live in a CRS-specific one. Rather than guess, generated FC
3.0 data satisfies those constraints regardless. It costs nothing and removes the
risk; if MDES does not apply them the file is still valid.

## Compatibility

- FC 2.2 remains the default and its output is unchanged apart from the payment
  ordering fix (payments now sit directly after `AccountBalance`, which is where
  the schema puts them).
- Files that carry `FATCA105` now validate instead of being rejected.

## Verification

- 220 Python unit tests (23 new for FC 3.0, each rule with a negative control
  that mutates valid output and asserts the exact finding count)
- 54 CLI smoke checks, 146 CLI regression checks
- Generated FC 2.2 and FC 3.0 report zero MDES findings across multiple seeds,
  with all four account types present and no profile violations

## Update notes

- Existing installed users receive this through the in-app auto-updater after
  the GitHub release is published.
- The release includes `latest.yml` and `.blockmap` metadata for
  electron-updater.
