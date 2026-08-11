# MDES XML Studio v2.0.2

Updates the in-app "Recent Improvements" list, which still described v1.3.x work
while the app reported version 2.0.

## What changed

Settings -> Updates & Version now lists what the 2.0 release actually did:

- Added CRS 3.0: generation, validation and corrections, from random data or CSV
- CRS version is picked per run and auto-detected when validating an existing file
- Generated files now satisfy the MDES record-level rules the XSD cannot express
- Fixed CSV-generated CRS files being rejected by the schema
- CSV input follows the test/production setting and validates closed-account balances
- Organisation accounts without a controlling person are now supported

Updated in all three languages (English, Dutch, Spanish).

## Why it was stale

The list is static text (`updates.changelog` in
`electron-app/src/i18n/translations.js`), so it does not follow the version
number automatically, and nothing in the release process required updating it.
`docs/RELEASING.md` now carries that as step 1b, between the version bump and
the release description, so a future release cannot ship a new version number
next to an older changelog.

## Compatibility

No functional change. Generation, validation and correction behave exactly as in
v2.0.1 - this release is display text and one documentation step.

## Update notes

- Existing installed users receive this through the in-app auto-updater after
  the GitHub release is published.
- The release includes `latest.yml` and `.blockmap` metadata for
  electron-updater.
