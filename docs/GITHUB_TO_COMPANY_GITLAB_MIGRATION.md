# GitHub to Blyce GitLab Migration Runbook

This runbook is the reusable procedure for moving another Zameer project from
GitHub to the company-managed GitLab without breaking builds, releases, or
installed application updates.

It is deliberately conservative. A Git push migrates Git history, branches,
and tags; it does **not** migrate GitHub Actions, releases, release assets,
issues, secrets, branch rules, or application integrations automatically.

## Known environment

| Setting | Value |
| --- | --- |
| Company GitLab | `https://gitlab.dcsc.com` |
| GitLab username | `Zameer` |
| Common group | `MDES` (confirm for every project) |
| GitHub username | `zmokiem-ui` |
| GitLab Git transport | SSH |
| GitLab API transport | HTTPS |
| SSH key | `C:\Users\Zmokiem\.ssh\id_blyce` |
| GLab executable | `C:\Users\Zmokiem\AppData\Local\Programs\glab\glab.exe` |

Never put a personal access token, runner token, deployment credential, or
private SSH key in this file, a commit, a prompt, or a terminal transcript.

## Migration outcome

A migration is complete only when:

1. The source working tree is understood and protected.
2. Required branches and tags have identical object IDs on both hosts.
3. GitLab is the local branch's default upstream.
4. Project-specific CI, release, updater, badge, issue, and API dependencies
   have been classified and handled.
5. A harmless real change has passed the intended build and delivery path.
6. GitHub remains available until every dependency on it is deliberately
   removed or replaced.

## Phase 1: Fill in the project worksheet

Copy and complete this block before doing anything:

```text
Local repository: C:\path\to\project
GitHub repository: https://github.com/zmokiem-ui/REPOSITORY.git
GitLab group: MDES (or another approved group)
GitLab project name: PROJECT NAME
GitLab project slug: project-slug
GitLab project URL: https://gitlab.dcsc.com/GROUP/project-slug
Default branch: main
Application has installed users: yes/no
Application has an auto-updater: yes/no/unknown
GitHub Actions present: yes/no
GitHub Releases/assets present: yes/no
Git LFS present: yes/no
Submodules present: yes/no
Uncommitted work present: yes/no
Destination verified empty: yes/no
```

Stop if the destination is not empty or its ownership is unclear. Do not force
push over an existing company project without explicitly reconciling its refs.

## Phase 2: Verify authentication and company trust

Use PowerShell:

```powershell
$Glab = "$env:LOCALAPPDATA\Programs\glab\glab.exe"

gh auth status
ssh -T git@gitlab.dcsc.com
& $Glab auth status --hostname gitlab.dcsc.com
Invoke-WebRequest -UseBasicParsing https://gitlab.dcsc.com/-/readiness
```

Expected GitLab SSH response:

```text
Welcome to GitLab, @Zameer!
```

Important rules:

- Always pass `--hostname gitlab.dcsc.com` to `glab api`. Without it, a command
  can accidentally target public `gitlab.com`.
- Do not disable TLS verification. If a new workstation does not trust the
  company certificate, obtain and install the Blyce/DCSC CA through IT.
- The SSH public key may be pasted in full into GitLab, including its email
  comment. Never paste the private key.
- Self-managed GitLab OAuth login can fail when no CLI OAuth `client_id` is
  configured. Use a short-lived personal access token through GLab's masked
  prompt and store it in the Windows keyring.
- For migration/API work, use the minimum necessary token scope. `api` is
  sufficient for the operations in this runbook; use Git over SSH.
- Revoke the temporary token after the migration is stable.

Stop if GitHub or GitLab authentication fails. Do not work around certificate
or authentication errors with insecure flags.

## Phase 3: Audit the real GitHub repository

Run from the actual working checkout:

```powershell
git status --short --branch
git remote -v
git branch -vv
git fetch --all --tags --prune
git fsck --full
git submodule status
git lfs ls-files
git count-objects -vH
git for-each-ref --format='%(refname) %(objectname)' refs/heads refs/tags

gh repo view zmokiem-ui/REPOSITORY
gh run list --repo zmokiem-ui/REPOSITORY --limit 20
gh release list --repo zmokiem-ui/REPOSITORY --limit 100
gh pr list --repo zmokiem-ui/REPOSITORY --state all --limit 100
gh issue list --repo zmokiem-ui/REPOSITORY --state open --limit 100
```

`git lfs` might not be installed. If `.gitattributes` contains LFS filters or
GitHub reports LFS use, stop and install Git LFS before migrating.

Find large historical objects before assuming the destination will accept the
repository:

```powershell
git rev-list --objects --all |
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' |
  Where-Object { $_ -like 'blob *' } |
  Sort-Object { [int64]($_.Split(' ')[2]) } -Descending |
  Select-Object -First 20
```

Classify every uncommitted change and every local-only branch. Preserve user
work; never reset or discard it merely to make the migration look clean.

## Phase 4: Find dependencies on GitHub

Search the whole project, excluding generated dependency directories:

```powershell
rg -n --hidden `
  --glob '!**/node_modules/**' `
  --glob '!**/.git/**' `
  'github\.com|api\.github|releases/latest|electron-updater|GH_TOKEN|GITHUB_TOKEN|actions/' .
```

Inspect at least:

- `.github/workflows/`
- updater configuration and `electron-builder` publishing configuration
- issue and bug-report links
- README badges and download links
- webhooks, package registries, deployment scripts and API clients
- repository secrets and environment variables

Classify each dependency as:

- migrate now;
- temporarily keep on GitHub;
- replace in a bridge release;
- intentionally retire.

For installed applications, never switch the update provider before proving
how existing versions discover updates. Existing clients cannot learn about a
new GitLab feed unless they first receive a bridge version through their old
update source.

## Phase 5: Prepare the GitLab destination

Create or select the GitLab project in the correct group. Confirm its project
ID and repository state before pushing:

```powershell
$Glab = "$env:LOCALAPPDATA\Programs\glab\glab.exe"
& $Glab api --hostname gitlab.dcsc.com 'projects/GROUP%2Fproject-slug'
```

Record the returned numeric project ID as `$ProjectId`:

```powershell
$ProjectId = 123
& $Glab api --hostname gitlab.dcsc.com "projects/$ProjectId/repository/branches"
```

If the destination is supposed to be empty, the branches response must be an
empty list. Also check the GitLab web page for existing releases, packages,
issues, or project-specific instructions.

Self-managed GitLab can inherit Auto DevOps and create unwanted pipelines for
every historical branch or tag during the first push. If the project does not
yet contain a reviewed `.gitlab-ci.yml`, disable Auto DevOps before migrating:

```powershell
& $Glab api --hostname gitlab.dcsc.com --method PUT `
  "projects/$ProjectId" -f auto_devops_enabled=false --silent
```

Do not copy registration tokens or other credentials returned by project APIs.

## Phase 6: Add the GitLab remote and transfer Git refs

Keep GitHub as `origin` during the transition and add GitLab explicitly:

```powershell
git remote add gitlab git@gitlab.dcsc.com:GROUP/project-slug.git
git remote -v
git ls-remote gitlab
```

For an empty destination, push all reviewed local branches and tags without
force:

```powershell
git push gitlab --all
git push gitlab --tags
```

Then compare remote-tracking branches on GitHub with local branches. A GitHub
branch that was never checked out locally is not included by `--all`:

```powershell
git branch -r
git branch
```

Create and push any required missing branch deliberately. Do not blindly use
`--mirror` against a non-empty destination; it can overwrite or delete refs.

Git pushes do not migrate GitHub Releases or their binary assets. Treat those
as a separate archive/release task.

## Phase 7: Prove branch and tag parity

Capture and compare both hosts:

```powershell
$GitHubHeads = git ls-remote --heads origin | Sort-Object
$GitLabHeads = git ls-remote --heads gitlab | Sort-Object
Compare-Object $GitHubHeads $GitLabHeads

$GitHubTags = git ls-remote --tags origin | Sort-Object
$GitLabTags = git ls-remote --tags gitlab | Sort-Object
Compare-Object $GitHubTags $GitLabTags
```

No output means the advertised branch or tag refs are identical. For annotated
tags, compare both the tag object and its peeled `^{}` commit ref.

Also verify the default branch explicitly:

```powershell
git rev-parse main
git rev-parse origin/main
git rev-parse gitlab/main
```

Protect `main` in GitLab. Disable force pushes and require Maintainer-level
permission for direct pushes/merges. Once GitLab CI is working, require a
successful pipeline before merge.

## Phase 8: Rebuild CI deliberately

GitHub Actions YAML cannot simply be renamed and expected to work in GitLab.
Translate the behavior into `.gitlab-ci.yml`:

- use the same language/runtime versions;
- run the same unit, integration and smoke tests;
- preserve dependency auditing;
- verify release tags against application versions;
- build the same artifacts;
- retain packaged-application smoke tests;
- publish through `CI_JOB_TOKEN`, not a personal token.

Validate configuration against the company GitLab:

```powershell
& $Glab ci lint .gitlab-ci.yml `
  -R 'https://gitlab.dcsc.com/GROUP/project-slug' --include-jobs
```

GitLab can store code without a runner. A runner is required only to execute
the pipeline. Check what is actually available:

```powershell
& $Glab api --hostname gitlab.dcsc.com "projects/$ProjectId/runners?per_page=100"
& $Glab api --hostname gitlab.dcsc.com "groups/GROUP_ID/runners?per_page=100"
```

For Windows Electron/PyInstaller projects, request a company-managed Windows
runner tagged `windows`, normally on a dedicated VM. Do not make a personal
workstation a persistent company runner unless that is explicitly approved.

## Phase 9: Preserve application updates during transition

If existing installations check GitHub Releases, use a dual-publish period:

1. GitLab becomes the primary code remote.
2. Release commits are pushed to both `main` branches.
3. The same explicit semantic-version tag is pushed to both hosts.
4. GitHub Actions builds and publishes the update existing clients can see.
5. GitLab builds/publishes too when a suitable runner is available; otherwise,
   mirror the verified current artifacts manually.
6. Publish a later bridge release through GitHub that changes the updater to a
   stable GitLab release/package URL.
7. Test old version -> bridge version -> first GitLab-only version.
8. Retire GitHub publishing only after adoption is confirmed.

Example transition release:

```powershell
git switch main
git pull

# Update every application/package version field and lockfile.
git add PATHS-WITH-VERSION-CHANGES
git commit -m "Release vX.Y.Z"

git push gitlab main
git push origin main

git tag -a vX.Y.Z -m "Application vX.Y.Z"
git push origin vX.Y.Z
git push gitlab vX.Y.Z
```

Use an explicit tag rather than `--tags` for normal releases. Treat published
tags as immutable. If a pipeline fails before publishing, fix the cause and
prefer a new version unless it is verified that no release or consumer exists.

Do not bypass a dependency audit to make a release green. Apply the smallest
compatible dependency correction, then rerun installation, audit, build,
application smoke, installer build, and packaged-app smoke checks.

## Phase 10: Prove delivery with a harmless release

For an updater test, a version-only bump is the safest functional change:

1. Keep application behavior unchanged.
2. Increment the patch version consistently everywhere.
3. Run local version checks and the relevant tests.
4. Publish through the transition pipeline.
5. Confirm the release is public/non-draft and contains the installer,
   `latest.yml`, and matching `.blockmap`.
6. Inspect `latest.yml` for the correct version, installer name, size and hash.
7. Start an installed previous version and let its updater—not a browser
   download—discover, download, install and relaunch the new version.
8. Confirm release download counters or server logs are consistent with the
   test.

Do not call the migration successful merely because the Git push worked. The
real application update is the end-to-end proof for an installed desktop app.

## Phase 11: Make GitLab the development default

After parity and a successful test:

```powershell
git branch --set-upstream-to=gitlab/main main
git status --short --branch
```

Normal development then uses GitLab:

```powershell
git switch main
git pull
git switch -c feature/short-description

# Edit and test.
git add REVIEWED-PATHS
git commit -m "Describe the change"
git push -u gitlab feature/short-description
```

Open a GitLab merge request into `main`. Keep GitHub as `origin` until the
updater bridge and any required archival work are complete.

## Phase 12: Final verification checklist

- [ ] Working tree is clean or all user changes are accounted for.
- [ ] Git integrity check passes.
- [ ] Required branches match by object ID.
- [ ] Required tags match, including annotated tag objects.
- [ ] GitLab `main` is the default and protected branch.
- [ ] Auto DevOps is intentionally enabled or disabled.
- [ ] GitLab CI lint passes.
- [ ] Runner availability is known; pending jobs are not misreported as tests.
- [ ] GitHub workflows remain only when intentionally required.
- [ ] Releases and binary assets have an explicit migration/archive decision.
- [ ] Updater, issue links, badges and API endpoints are handled.
- [ ] A harmless real update or deployment has been proven end to end.
- [ ] Local `main` tracks `gitlab/main`.
- [ ] No secrets were added to files, logs or CI configuration.
- [ ] Temporary migration credentials are revoked or have a short expiry.
- [ ] Temporary downloaded release artifacts are removed.

## Stop conditions

Stop and investigate instead of guessing when:

- the destination is unexpectedly non-empty;
- any branch/tag comparison differs without an explanation;
- Git LFS or submodules are present but not configured on GitLab;
- repository objects exceed company limits;
- TLS verification or SSH identity fails;
- a release/update endpoint is still unclear;
- a force push, deletion, tag rewrite, or secret transfer appears necessary;
- a pipeline is pending and no matching runner is assigned;
- an installed-client update has not been tested.

## IT request for a Windows runner

```text
Could you confirm whether gitlab.dcsc.com has an online Windows GitLab Runner
that can be assigned to the GROUP group or GROUP/project-slug project? It must
have the tag windows and support PowerShell 7, Python 3.12, Node.js 22,
PyInstaller and electron-builder. If none exists, could a dedicated Windows VM
runner be provisioned and restricted to protected branches and tags?
```

## Lessons from the first migration

- Authenticate and verify TLS/SSH before touching repository state.
- Always qualify company GLab API calls with the self-managed hostname.
- Disable inherited Auto DevOps before the initial bulk push when CI is not
  ready, or historical refs can create useless pipelines.
- `git push --all` plus `git push --tags` migrates Git refs, not GitHub product
  data such as Actions, issues, releases, assets, secrets, or rules.
- Preserve GitHub during an updater transition; existing clients determine the
  safe order of migration.
- A GitLab runner is optional for storing/developing code but required for
  automated GitLab testing and builds.
- Validate the real packaged artifact and installed-client update, not only
  source code and YAML.
- Treat audit failures as release blockers and fix the narrow dependency cause.
- Compare hashes when mirroring release binaries between hosts.
- Rotate any credential that appears in diagnostic output.
