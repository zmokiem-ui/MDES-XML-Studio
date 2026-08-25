# Releasing MDES XML Studio

Releases are tag-driven on both hosts during the GitHub-to-GitLab transition:

- Pushing a `v*` tag to GitHub runs `.github/workflows/build-release.yml` and
  publishes the GitHub release used by existing installed clients.
- Pushing the same tag to GitLab runs `.gitlab-ci.yml` and publishes the same
  Windows assets to the GitLab Package Registry and a GitLab release.

Do not stop publishing the GitHub release yet. Version 1.3.4 and earlier are
configured to fetch `latest.yml` from GitHub, so a GitLab-only release would not
be detected by those installations.

## 1. Bump the version

Update both version fields so the app and the Python package agree:

- `electron-app/package.json` -> `"version"`
- `crs_generator/__init__.py` -> `__version__`

The release workflow blocks tags where either value does not match the tag.
Follow semver: patch for fixes, minor for features, major for breaking changes.

## 1b. Update the in-app "Recent Improvements" list

Settings -> Updates & Version shows a changelog read from
`electron-app/src/i18n/translations.js` -> `updates.changelog`. It is static
text, so it does not follow the version automatically and will otherwise keep
describing an older release next to the new version number.

Rewrite it for the release, in all three languages (`en`, `nl`, `es`), keeping
the lists the same length. Write for the tester using the app - what they can
now do, or what no longer breaks - not for the repo. Six short bullets.

## 2. Release description

Use this short release description template in GitHub. The GitLab release is
created automatically by its pipeline.

```md
## MDES XML Studio vX.Y.Z

Main changes:
- Improved CRS, FATCA, and CBC XML generation and validation.
- Expanded corrupt-file presets for parser, schema, and business-rule testing.
- Improved CRS correction handling and multi-controlling-person output.
- Added safer public GitHub bug reporting with screenshot support.
- Hardened auto-update metadata and packaged-app release checks.

Update notes:
- Existing installed users receive this through the in-app auto-updater after the GitHub release is published.
- The release includes `latest.yml` and `.blockmap` metadata for electron-updater.
```

## 3. Tag and push

```powershell
git commit -am "Release vX.Y.Z"
git tag vX.Y.Z
git push origin main
git push gitlab main
git push origin vX.Y.Z
git push gitlab vX.Y.Z
```

Push the tag to both hosts only after the two version fields match and the
release commit is present on both `main` branches. Avoid a broad `--tags` push;
an explicit tag makes the release being triggered unambiguous.

## 4. What the pipeline does

On the `v*` tag, both release pipelines perform the same quality gates:

1. Installs Python dependencies and runs `pytest tests/unit`.
2. Runs the CLI regression matrix.
3. Builds the PyInstaller backend with `python build_python_backend.py`.
4. Runs `npm ci`, a production dependency audit, and the Vite build.
5. Verifies the tag matches both Electron and Python package versions.
6. Runs Playwright smoke and full regression tests.
7. Builds the NSIS installer in `electron-app/dist-electron/`.
8. Runs packaged-app smoke tests against `win-unpacked`.
9. Publishes the `.exe`, `.blockmap`, and `latest.yml` to its host:
   GitHub Releases on GitHub, and the Generic Package Registry plus a release
   entry on GitLab.

The GitLab pipeline uses `CI_JOB_TOKEN`; no personal access token is stored in
the repository or required as a CI/CD variable.

Keep the electron-builder `artifactName` (`MDES-XML-Studio-Setup-${version}.exe`)
and `nsis.perMachine: false` unchanged. The auto-updater and installed clients
depend on them.

## 5. GitLab runner requirement

The GitLab jobs require a company-managed Windows runner tagged `windows` with:

- PowerShell 7
- Python 3.12 available as `python`
- Node.js 22 and npm
- Windows build support required by PyInstaller and electron-builder

Until that runner is assigned to the project, GitLab pipelines remain pending.
GitHub Actions continues to build releases independently.

## 6. Auto-updates

Packaged builds check **two** feeds, in order:

1. **GitLab** (preferred) - the generic package registry at
   `.../projects/31/packages/generic/mdes-xml-studio/latest`. Reachable on the
   company VPN only.
2. **GitHub** (fallback) - the provider in `build.publish`, written into
   `app-update.yml` by electron-builder.

At startup the app probes GitLab's `latest.yml` with a 5s timeout. On a 200 it
switches the feed; on anything else - off VPN, wrong token, registry empty - it
silently keeps the GitHub feed. That fallback is why an off-VPN tester still
receives updates, and why a GitLab misconfiguration degrades instead of
stranding anyone. `electron/main.js` -> `selectUpdateFeed`.

Both feeds serve the *same* `latest.yml`: electron-builder writes relative paths
(`path: MDES-XML-Studio-Setup-X.Y.Z.exe`), so the file resolves against whichever
feed root it was fetched from. The installer must sit next to it in both places.

### Prerequisites before the next release

These are required once, and the Jenkins one is **blocking**: `withCredentials`
fails the build outright if the credential is missing, which is deliberate - a
release that silently shipped a GitHub-only installer would be worse.

1. In GitLab, create a **project deploy token** on `mdes/xml-tooling` with only
   the `read_package_registry` scope.
2. Add it to Jenkins as a Secret Text credential with the ID
   `mdes-xml-studio-update-feed-token`.
3. Add the same value to GitHub as the repository secret `GITLAB_UPDATE_TOKEN`.

### The GitLab feed token

The registry is private, so the feed needs a credential. `electron/update-feed.json`
is generated at package time by `electron-app/scripts/write-update-feed.mjs` from
`GITLAB_UPDATE_TOKEN`, and sent as a `PRIVATE-TOKEN` header.

- Use a **project deploy token scoped to `read_package_registry` only**. It ships
  inside the installer and is therefore extractable; scoped this way the worst
  case is that someone already on the VPN can download an installer they could
  download anyway. Rotate it like any other credential.
- Jenkins reads it from the credential `mdes-xml-studio-update-feed-token`;
  GitHub Actions reads it from the secret `GITLAB_UPDATE_TOKEN`.
- **With no token the script writes a disabled stub and the build is GitHub-only.**
  A fork, a local build, or a pipeline missing the secret degrades rather than
  breaks - but it also means a silently-missing secret ships a GitHub-only
  installer, so check the "Bake update feed" step's log line when releasing.
- `electron/update-feed.json` is gitignored. Never commit it.

### Why the feed path has no version in it

`latest.yml` is fetched *before* the app knows which version is newest, so the
feed root cannot contain a version. The Jenkins publish stage uploads the three
assets twice: once to `.../mdes-xml-studio/<version>/` as an archive, and once to
`.../mdes-xml-studio/latest/`, which is the feed. It deletes the previous
`latest` package first so a duplicate cannot leave a stale `latest.yml` in place.

### Ordering: never strand a client

A client updates from the feed baked into **the build it is currently running**.
So a change to the feed only reaches people through a release published on the
feed they are already using.

- Clients on 2.2.0 and earlier poll **GitHub only**. They will pick up the
  GitLab-preferring behaviour with 2.3.0, because 2.3.0 is published to GitHub.
- Keep publishing GitHub releases until every installed client has been seen on
  2.3.0 or later. Anyone who misses that release stays on the GitHub feed
  permanently and needs a manual reinstall.
- Only then is a GitLab-only release safe.

`*.blockmap` must be uploaded next to the installer on both feeds, or every
update becomes a full re-download instead of a differential one.

## 7. Update drill

Do this before shipping to real users:

1. Install the current public version locally.
2. Publish the newer release through the tag pipeline.
3. Confirm the installed app detects the update, downloads it, installs it, and
   relaunches on the new version.
4. Confirm the published release contains the installer, `latest.yml`, and the
   matching `.blockmap`.

## Notes

- Releases are created automatically by the tag; do not create them by hand.
- If a release fails the pytest, regression, audit, build, or smoke gate, fix the
  cause and rerun the pipeline.
