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

The app currently uses `electron-updater` with GitHub as its provider. On
startup, packaged builds fetch `latest.yml` from the latest GitHub release,
compare versions, download the installer, and offer a one-click install/restart.

- `latest.yml` records the installer name, version, and SHA.
- `*.blockmap` enables differential downloads. It must be uploaded next to the
  installer, or every update becomes a full re-download.
- During the transition, the build must be published as a GitHub release with a
  higher semver than the currently installed app.

A future bridge release can switch the updater to a GitLab-hosted generic feed.
That bridge version must first be published on GitHub so existing clients can
receive it. Only after adoption is confirmed should releases become GitLab-only.

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
