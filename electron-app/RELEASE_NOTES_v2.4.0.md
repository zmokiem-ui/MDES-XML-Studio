# MDES XML Studio v2.4.0

CRS 3.0 becomes the standard schema on 1 January 2027 - without a release in
January to make it happen. CRS 2.0 stays available as the legacy choice, and
corrections and deletions are explicit about which schema they produce.

## The cutover is on the calendar, not in a release

CRS 3.0 applies to reporting periods from 2026 and is first exchanged in 2027, so
MDES production still runs on 2.0 for the rest of this year. Shipping a release
in January purely to change a default is avoidable, so the date is a constant and
the default follows it:

| | Default | The other choice |
| --- | --- | --- |
| before 2027-01-01 | 2.0 | 3.0, offered as *upcoming* |
| from 2027-01-01 | 3.0 | 2.0, offered as *legacy* |

`CRS3_STANDARD_FROM` in `crs_generator/generator.py` holds the date, and
everything that needs a default reads `default_crs_version()`: the generator
config, the CLI, the CSV reader and writer, the correction generator, and the
Electron form. `electron-app/src/utils/crsVersion.js` mirrors the same three
constants for the UI labels.

Nothing is pinned to the default. Passing `--crs-version`, or picking the version
in the app, always wins - both versions stay selectable on either side of the
cutover, and neither is ever removed.

## The version dropdown says what a version *is*

The two options previously carried one fixed label each, which cannot describe
both sides of a cutover: after 1 January 2027 a label reading "2.0 - current MDES
production schema" would be wrong. Each version now has a label per role, so the
dropdown reads correctly before and after:

- before the cutover: `2.0 - current MDES production schema` /
  `3.0 - from 1 Jan 2027, adds mandatory account classification`
- from the cutover: `3.0 - current MDES production schema` /
  `2.0 - legacy schema, for correcting older data`

The standard version is listed first. All three languages are updated.

## Corrections and deletions on CRS 3.0

Corrections already produced valid CRS 3.0 output - a CRS702 has to stay in the
schema version of the CRS701 it corrects, so `--mode correction` reads the
version off the source file rather than offering a picker. That was invisible in
the app, which is why it looked like 3.0 was missing there. Now:

- the source-file badge reads `CRS 3.0`, or `CRS 2.0 · legacy` once 2.0 is the
  legacy schema, instead of a bare `v2.0`
- a line under it says the correction will be CRS *n* and that a CRS 3.0 source
  file is what produces a CRS 3.0 correction or deletion
- the CLI's JSON result carries `crs_version`, and the app's success dialog names
  the schema version, so there is no guessing what was just generated

The correction generator also no longer falls back to the CRS 1.0 namespace for a
version it recognises; 2.0 and 3.0 are both looked up directly.

## Two latent breakages fixed

Simulating the post-cutover date across the test suite caught two tests that
would have failed on 1 January 2027 rather than in CI now:

- `test_generated_refids_contain_no_whitespace` pinned the v2 namespace to look
  up `SendingCompanyIN`, in a test that is about identifier trimming and not
  about a schema version. It now matches by local name.
- the CLI regression matrix built its baseline CRS file from the default version
  and then asserted the file detects as 2.0. It now asks for 2.0 explicitly, and
  a new check asserts the default matches what the generator itself reports -
  which stays true on both sides of the cutover.

## Not included

The corrections page has a *From CSV file* mode whose Generate button still
requires an XML source file, so it cannot generate anything. That predates this
release and is untouched here; the CSV correction template is unchanged rather
than being given CRS 3.0 columns it has no path to use.

## For users

Nothing to do. Today the app behaves as before - 2.0 by default, 3.0 one click
away. On 1 January 2027 the default flips on its own, with 2.0 still one click
away.

## Verification

- 236 Python unit tests, passing both at today's date and with the cutover date
  moved into the past to simulate January
- 159 CLI regression checks, 54 smoke checks
- Playwright smoke and full regression, including the UI version selector and the
  corrections tab
- The CRS 3.0 correction and deletion paths XSD-validated end to end
