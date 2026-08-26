// Which CRS schema version the app treats as the standard one, and what the
// other one is called.
//
// CRS 3.0 applies to reporting periods from 2026 and is first exchanged in 2027,
// so MDES production still runs on 2.0 for the rest of this year. Rather than
// shipping a release in January purely to change a default, the cutover date
// lives here and the default follows the calendar on its own.
//
// That gives each version three possible roles rather than two:
//
//   before 2027-01-01   2.0 = standard    3.0 = upcoming
//   from   2027-01-01   3.0 = standard    2.0 = legacy
//
// Neither version is ever removed - the non-standard one stays selectable.
//
// This mirrors CRS3_STANDARD_FROM / LEGACY_CRS_VERSION / STANDARD_CRS_VERSION in
// crs_generator/generator.py. Keep the two in step; the Python side is what
// actually decides when the CLI is called without --crs-version.

export const CRS3_STANDARD_FROM = new Date(2027, 0, 1)
export const CRS_V2 = '2.0'
export const CRS_V3 = '3.0'

/** Has CRS 3.0 become the standard schema yet? */
export function isCrs3Standard(now = new Date()) {
  return now >= CRS3_STANDARD_FROM
}

/** The version a new form starts on. */
export function defaultCrsVersion(now = new Date()) {
  return isCrs3Standard(now) ? CRS_V3 : CRS_V2
}

/**
 * What this version is right now: 'standard' (what MDES expects), 'legacy' (kept
 * for correcting and re-testing older data) or 'upcoming' (valid to generate,
 * not yet the production schema).
 */
export function crsVersionRole(version, now = new Date()) {
  const v = String(version || '').trim()
  if (v === defaultCrsVersion(now)) return 'standard'
  return isCrs3Standard(now) ? 'legacy' : 'upcoming'
}

/** Is this version the legacy one, i.e. superseded by the standard? */
export function isLegacyCrsVersion(version, now = new Date()) {
  return crsVersionRole(version, now) === 'legacy'
}

/**
 * The two versions in the order they should appear in a dropdown: the standard
 * one first, the other one second.
 */
export function crsVersionOptions(now = new Date()) {
  const standard = defaultCrsVersion(now)
  const other = standard === CRS_V3 ? CRS_V2 : CRS_V3
  return [
    { value: standard, role: 'standard' },
    { value: other, role: crsVersionRole(other, now) },
  ]
}

/**
 * Translation key for a version's dropdown label, e.g. '2.0' before the cutover
 * -> 'form.crsVersion20Standard', and after it -> 'form.crsVersion20Legacy'.
 * Keying on the role as well as the number means the same version reads
 * correctly on both sides of the cutover.
 */
export function crsVersionLabelKey(version, now = new Date()) {
  const slug = String(version || '').replace('.', '')
  const role = crsVersionRole(version, now)
  const suffix = role.charAt(0).toUpperCase() + role.slice(1)
  return `form.crsVersion${slug}${suffix}`
}
