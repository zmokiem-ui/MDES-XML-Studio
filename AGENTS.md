# AGENTS.md

## Project Overview
This repository contains the CRS test data generator application.

Main areas:
- Python generator logic
- Electron app integration
- Build/release scripts
- Automated tests

## Working Style
- Continue the active task instead of restarting analysis.
- Keep responses compact and action-oriented.
- Prefer small, targeted changes over broad refactors.
- Do not modify unrelated files.
- Preserve existing behavior unless the current task explicitly requires a change.
- Do not commit, push, or create branches unless explicitly asked.
- Ask before making breaking, risky, or architecture-level changes.

## Code Change Rules
- Keep edits minimal and focused on the requested task.
- Reuse existing patterns and structure where possible.
- Avoid introducing unnecessary dependencies.
- Avoid large-scale renames or file moves unless required.
- When fixing a bug, patch the cause directly and add a focused test if appropriate.

## Testing Rules
- Run the smallest relevant test(s) first.
- Prefer targeted validation before broad full-suite runs.
- If tests are expensive, explain what should be run and why.
- Do not claim something is working unless it was verified or the uncertainty is clearly stated.

## Communication Rules
- State the next concrete step before large changes.
- Summarize progress briefly.
- Avoid repeating long plans unless the task changed.

## Pause Behavior
When pausing after a chunk of work, end with:
- what was completed
- the next concrete step
- whether you are blocked or can continue






## Testing Policy
- When code is changed, run the smallest relevant validation first.
- For user-facing or logic changes, run relevant smoke tests before claiming the work is complete.
- For broader or risky changes, run relevant regression tests before claiming the work is complete.
- If a test fails because of the change, investigate and fix the issue before marking the task done.
- When new functionality is added or behavior changes, add or update focused tests that cover the new behavior.
- Do not claim success unless the relevant tests were run or the reason they were not run is clearly stated.
- Never hardcode secrets or tokens in code, prompts, or tracked files.

## Releases and deployment

**Read `docs/RELEASING.md` before changing anything that affects a release.** It
is the authority; this section only exists so you know the shape and the traps
before you start.

There are **two independent pipelines**, and both must be green:

| Host | Trigger | What it does |
| --- | --- | --- |
| GitHub Actions | `v*` tag | builds and publishes to GitHub Releases |
| GitLab + Jenkins | `main` and `v*` tag | Jenkins builds/tests/archives on Windows; the GitLab job then publishes to the package registry and a GitLab release |

Installed clients on 2.2.0 and earlier update from GitHub. From 2.3.0 they prefer
the GitLab feed and fall back to GitHub. Both hosts therefore have to keep
publishing until every client has been seen on 2.3.0 or later.

### Hard rules

- **Never add a `Co-Authored-By:` trailer** or any generated-by footer to a
  commit, PR body, tag or changelog.
- **Three version fields must match the tag** or the pipeline's own gate fails:
  `electron-app/package.json`, `electron-app/package-lock.json` (use
  `npm version`, do not hand-edit), and `crs_generator/__init__.py`.
- **Update the in-app changelog** when releasing — `updates.changelog` in
  `electron-app/src/i18n/translations.js`, all three languages, same length. It is
  static text and will otherwise describe an older release.
- **Do not move publishing into Jenkins.** It was built that way and cannot work;
  `docs/gitlab-jenkins-bridge.md` explains why. Credentials live as masked GitLab
  CI variables.
- **Never commit `electron-app/electron/update-feed.json`.** It is generated at
  package time and holds a token. It is gitignored; keep it that way.

### Before you push a pipeline change

A broken Jenkinsfile fails in about 18 milliseconds with no stage output, and a
broken `.gitlab-ci.yml` costs a full build cycle to notice. Two cheap habits:

- Validate on a `main` push before tagging. A run under ~60s means it did not
  parse; a normal `main` run is around 400s.
- Remember a pipeline runs the config belonging to **the ref it was triggered
  for**. Retrying an old tag reruns that tag's config, so a CI fix on `main`
  needs a new tag, not a retry.

