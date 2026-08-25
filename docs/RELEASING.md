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
9. Publishes the `.exe`, `.blockmap`, and `latest.yml`.

**The two hosts publish differently.** On GitHub, the workflow uploads to GitHub
Releases directly. On GitLab, **Jenkins does not publish** - it builds, tests and
archives, and the bridge job (`scripts/trigger-jenkins.mjs` ->
`scripts/publish-release.mjs`) downloads those artifacts afterwards and uploads
them to the package registry and a GitLab release.

That split is not a preference. Publishing from Jenkins needs credentials in its
system credential store, and adding them there is `Access Denied` for the
account the bridge uses - it holds only `authenticated`. Credentials added
through the Jenkins UI can land in a *personal* store, which pipelines cannot
read; `withCredentials` then fails with "Could not find credentials entry",
having already spent a 22-minute build. The GitLab side already holds the tokens
as masked CI variables, so publishing moved there.

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

### Where the credentials live

All of this is already configured. It is recorded so it can be rebuilt or
rotated, and so nobody re-adds the Jenkins credentials that were tried first and
do not work.

| Secret | Stored as | Used for |
| --- | --- | --- |
| Deploy token, `read_package_registry` | GitLab CI variable `GITLAB_UPDATE_TOKEN` (masked, protected) | baked into the installer as its update feed |
| | GitHub secret `GITLAB_UPDATE_TOKEN` | the same, for GitHub-built releases |
| Project access token, `api`, Maintainer | GitLab CI variable `GITLAB_RELEASE_TOKEN` (masked, protected) | the bridge publishing packages and releases |

Two things to know if you rebuild this:

- **Nothing goes in Jenkins.** The feed token reaches the Windows agent as a
  `password` build parameter set by the bridge, because it has to be present when
  electron-builder packages the app. Jenkins masks password parameters.
- `main` and `v*` are protected refs, which is what makes the protected CI
  variables visible to both branch and tag pipelines. Removing that protection
  silently strips the variables and the publish step fails with an empty token.

### The GitLab feed token

The registry is private, so the feed needs a credential. `electron/update-feed.json`
is generated at package time by `electron-app/scripts/write-update-feed.mjs` from
`GITLAB_UPDATE_TOKEN`.

**GitLab keys the auth header to the token type, and the wrong one is an
indistinguishable 401** - verified against project 31:

| Token type | Header | Set via |
| --- | --- | --- |
| Deploy token (`read_package_registry`) | `DEPLOY-TOKEN` | default |
| Personal / project access token | `PRIVATE-TOKEN` | `GITLAB_UPDATE_TOKEN_HEADER=PRIVATE-TOKEN` |

An unrecognised header value fails the build rather than shipping an installer
that cannot authenticate.

- Use a **project deploy token scoped to `read_package_registry` only**. It ships
  inside the installer and is therefore extractable; scoped this way the worst
  case is that someone already on the VPN can download an installer they could
  download anyway. Rotate it like any other credential. A personal or project
  access token also works but carries far broader scope - do not ship one.
- Jenkins receives it as the `GITLAB_UPDATE_TOKEN` build parameter from the
  bridge; GitHub Actions reads it from the secret of the same name.
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

### Who receives GitLab updates

**Users do not need a GitLab account and do not need to be project members.**
The installer carries the token and authenticates as the token, not as the
person. There is no login and nothing to provision per user.

What a user does need is **network reach to `gitlab.dcsc.com`** - the company
VPN. So the audience is "anyone running the app, on the corporate network",
which is wider than the project's member list and narrower than GitHub's
"anyone, anywhere". Confirmed: unauthenticated requests to the registry return
401, so the feed is not public.

Nobody loses updates by being outside that set: the probe fails and they update
from GitHub instead.

### Failure modes worth recognising

Every one of these cost a full build cycle to diagnose. The symptom is listed
first, because that is what you will have.

| Symptom | Cause |
| --- | --- |
| Build fails in ~18ms, no stage output | The Jenkinsfile does not parse. Usually a lone backslash in a triple-quoted string - Groovy processes escapes there, so Windows paths need `\` or a forward slash. |
| "Could not find credentials entry with ID ..." | The credential is in a personal store, or absent. Pipelines only read the system and folder stores. |
| `SELF_SIGNED_CERT_IN_CHAIN` from the bridge | Node ships its own CA bundle and ignores the system trust store, so it rejects a chain git accepts. Hence `--use-openssl-ca` and `NODE_EXTRA_CA_CERTS` in `.gitlab-ci.yml`. |
| A tag rebuild fails on a missing npm script | Jenkins loads the Jenkinsfile from the default branch but checks out the source at the requested ref. Feed steps are guarded on `scripts/write-update-feed.mjs` existing for this reason. |
| Release API returns 403 | `PUT /releases/:tag` answers 403, not 404, when the release does not exist. Create with `POST` first and fall back to `PUT` on 409. |
| Retrying a tag pipeline reruns old config | A pipeline runs the `.gitlab-ci.yml` of the ref it was triggered for. A CI fix on `main` needs a new tag, not a retry. |

The bridge runs a GitLab API preflight before triggering Jenkins so TLS and token
problems fail in seconds rather than after the build.

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
