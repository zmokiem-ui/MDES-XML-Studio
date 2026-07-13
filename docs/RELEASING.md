# Releasing MDES XML Studio

Releases are tag-driven: pushing a `v*` tag runs `.github/workflows/build-release.yml`,
which tests, builds, packages, and publishes the Windows installer.

## 1. Bump the version

Update both version fields so the app and the Python package agree:

- `electron-app/package.json` -> `"version"`
- `crs_generator/__init__.py` -> `__version__`

The release workflow blocks tags where either value does not match the tag.
Follow semver: patch for fixes, minor for features, major for breaking changes.

## 2. Release description

Use this short release description template in GitHub:

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

```bash
git commit -am "Release vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

## 4. What the pipeline does

On the `v*` tag, `build-release.yml` on `windows-latest`:

1. Installs Python dependencies and runs `pytest tests/unit`.
2. Runs the CLI regression matrix.
3. Builds the PyInstaller backend with `python build_python_backend.py`.
4. Runs `npm ci`, a production dependency audit, and the Vite build.
5. Verifies the tag matches both Electron and Python package versions.
6. Runs Playwright smoke and full regression tests.
7. Builds the NSIS installer in `electron-app/dist-electron/`.
8. Runs packaged-app smoke tests against `win-unpacked`.
9. Publishes the GitHub release with the `.exe`, `.blockmap`, and `latest.yml`.

Keep the electron-builder `artifactName` (`MDES-XML-Studio-Setup-${version}.exe`)
and `nsis.perMachine: false` unchanged. The auto-updater and installed clients
depend on them.

## 5. Auto-updates

The app uses `electron-updater`. On startup, packaged builds fetch `latest.yml`
from the latest GitHub release, compare versions, download the installer, and
offer a one-click install/restart.

- `latest.yml` records the installer name, version, and SHA.
- `*.blockmap` enables differential downloads. It must be uploaded next to the
  installer, or every update becomes a full re-download.
- The build must be published as a GitHub release with a higher semver than the
  currently installed app.

## 6. Update drill

Do this before shipping to real users:

1. Install the current public version locally.
2. Publish the newer release through the tag pipeline.
3. Confirm the installed app detects the update, downloads it, installs it, and
   relaunches on the new version.
4. Confirm the published release contains the installer, `latest.yml`, and the
   matching `.blockmap`.

## Notes

- The release is created automatically by the tag; do not create it by hand.
- If a release fails the pytest, regression, audit, build, or smoke gate, fix the
  cause and rerun the pipeline.
