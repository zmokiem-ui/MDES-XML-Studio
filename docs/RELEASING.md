# Releasing MDES XML Studio

Releases are **tag-driven**: pushing a `v*` tag runs `.github/workflows/build-release.yml`,
which tests, builds, packages, and publishes the Windows installer.

## 1. Bump the version

Update both version fields so the app and the Python package agree:

- `electron-app/package.json` → `"version"`
- `crs_generator/__init__.py` → `__version__`

Follow semver: patch for fixes, minor for features, major for breaking changes.

## 2. Tag and push

```bash
git commit -am "Release vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

## 3. What the pipeline does

On the `v*` tag, `build-release.yml` (windows-latest):

1. Installs Python deps and runs `pytest tests/unit` (release gate).
2. Builds the PyInstaller backend (`python build_python_backend.py`).
3. `npm ci` + `npm run build` (Vite).
4. Runs the Playwright smoke test (release gate).
5. `electron-builder --win --x64` → NSIS installer in `electron-app/dist-electron/`.
6. Publishes the GitHub release with the `.exe`, `.blockmap`, and `latest.yml`.

Keep the electron-builder `artifactName` (`MDES-XML-Studio-Setup-${version}.exe`)
and `nsis.perMachine: false` unchanged — the auto-updater and installed clients
depend on them.

## 4. Auto-updates

The app uses **electron-updater**. On startup it fetches `latest.yml` from the
latest GitHub release, compares versions, and offers a one-click update.

- `latest.yml` records the installer name, version, and SHA.
- `*.blockmap` enables **differential** downloads (only changed blocks). It must be
  uploaded next to the installer, or every update becomes a full re-download.

### Update drill (do before shipping to real users)

1. Install the current released version locally.
2. Push a **pre-release** tag so the pipeline builds a newer version.
3. Confirm the installed app detects, downloads (differentially — check it uses the
   `.blockmap`), installs, and relaunches.
4. Diff the newly generated `latest.yml` against the previously released one to
   confirm the format is unchanged.

## Notes

- The release is created automatically by the tag; you do not create it by hand.
- If a release fails the pytest or smoke gate, fix the cause — do not bypass the gate.
