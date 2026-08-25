# MDES XML Studio v2.2.0

Adds **CRS foreign deliveries** — the second CRS intake in MDES, alongside the
domestic filing the app has produced until now.

## Why

MDES accepts CRS through two routes. A *domestic filing* is submitted by a local
FI to its own tax authority. A *foreign delivery* arrives from a partner
jurisdiction and is uploaded under `/crs/foreign-deliveries/crs-country-reports`.

The app only ever framed the domestic case — the base template is
`CRS.Generic.2021.Domestic.xml`, and the form showed two free-text country boxes
with nothing tying them to a filing type. Producing a usable foreign delivery
meant knowing, unaided, that the two countries must differ and that the reported
account holders have to be resident in the *receiving* jurisdiction. Get that
wrong and the file is schema-valid, uploads, and is then rejected by MDES rules
60011/60012 — or worse, is accepted as a domestic filing and the test proves
nothing.

The generation logic is modelled on `Script: Generate CRS XML report` in the ART
test-automation trunk (`TestSuite/Templates/CRS_Levering_Upload.resource`), which
is how these files are built for the regression suite today.

## What changed

Pick **Domestic filing** or **Foreign delivery** at the top of the CRS form,
before anything else.

| | Domestic filing | Foreign delivery |
| --- | --- | --- |
| Receiving country | derived from the transmitting country; field hidden | required, and must differ |
| ReportingFI residence | the single country | the transmitting country |
| Account holder residence | random reportable spread | defaults to the receiving country |
| Default file name | `crs_{country}_{year}.xml` | `{Country}_CRS_{timestamp}Z_{random}.xml` |

The foreign file name is the convention the MDES test tooling uses, so the
plaintext XML lines up with the ZIP you encrypt from it.

A foreign delivery naming the same country twice is refused before anything is
written — the form flags it, and the generator raises rather than producing a
file MDES would quietly treat as domestic.

The CLI takes the same switch:

```
--file-type domestic|foreign
```

It also applies to `--mode validate-xml`: validating a file *as* a foreign
delivery reports `FILETYPE-01` when its two countries match. This is the app's
own check, not an MDES portal code, and it is labelled `[XML Studio ...]` rather
than `[MDES ...]` so the distinction stays visible.

## Not included

Signing, encryption and ZIP packaging. The app produces the plaintext XML; you
encrypt it with the existing cipher tool as before. No certificates or passwords
are bundled.

## Compatibility

- Domestic generation is unchanged. `file_type` defaults to `domestic`, and the
  CLI without `--file-type` behaves exactly as in 2.1.0.
- `mdes_rules.check_mdes_rules` / `check_file` gained an optional `file_type`
  argument. Callers that omit it get the previous behaviour.
- `Finding` gained a `source` field defaulting to `"MDES"`, so existing findings
  still render as `[MDES <code>]`.

## Verification

- 232 Python unit tests (12 new), including the residence rules holding on real
  generated foreign output and the same-country guard firing in both places
- 155 CLI regression checks (9 new for foreign deliveries)
- Playwright smoke, full regression, and packaged-app smoke
- Generated foreign output compared field-by-field against the ART trunk
  reference: MessageSpec country pair, ReportingFI residence and reported-party
  residences all match

## Update notes

- Existing installed users receive this through the in-app auto-updater after
  the GitHub release is published.
- The release includes `latest.yml` and `.blockmap` metadata for
  electron-updater.
