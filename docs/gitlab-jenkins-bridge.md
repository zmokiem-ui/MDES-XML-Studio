# GitLab to Jenkins Windows CI bridge

GitLab performs the lightweight trigger on the MDES Linux runner. Jenkins performs the Windows Python, Electron, Playwright and packaging work, and archives the result.

**Jenkins does not publish.** After a successful tag build the GitLab job downloads Jenkins' archived artifacts and uploads them to the package registry and a GitLab release. See [Publishing](#publishing) for why.

## GitLab variables

Configure these as protected, masked project or MDES group variables. Never commit their values.

- `JENKINS_JOB_URL`: full URL of the DevOps-created Jenkins job.
- `JENKINS_USER`: Jenkins service user allowed to trigger this job.
- `JENKINS_API_TOKEN`: API token for that service user. Stored **hidden**, so the value cannot be read back through the API or UI by anyone, including the owner. Reading Jenkins logs needs a separate token.
- Optional `JENKINS_TIMEOUT_SECONDS`: defaults to `5400`.
- Optional `JENKINS_POLL_SECONDS`: defaults to `10`.

## Jenkins job

Create a Pipeline job under the agreed MDES folder using **Pipeline script from SCM**:

- Repository: `https://gitlab.dcsc.com/mdes/xml-tooling.git`.
- Script path: `Jenkinsfile`.
- Git credentials: read-only credential for this repository with ID `mdes-xml-tooling-readonly`.
- Agent: Windows Server 2019, with Python 3.13.5, Node.js 22+, npm, and Chromium/Playwright support.
- Concurrency: one build at a time until the available RAM is confirmed; the server has 16 GB total with about 10.2 GB reserved for Jenkins.
- Build retention: 30 builds or 30 days.
- Run once manually after creation so Jenkins loads the parameters from the Jenkinsfile.

Configure the Pipeline definition to read the Jenkinsfile from the repository's `main` branch. The Jenkinsfile then performs an explicit checkout using the ref/commit passed by GitLab and verifies the resulting commit against `GIT_COMMIT`; it fails closed if the wrong source is checked out.

## Publishing

Publishing happens on the **GitLab** side, not in Jenkins. `scripts/trigger-jenkins.mjs` waits for the Jenkins result and, on a successful tag build, hands off to `scripts/publish-release.mjs`, which downloads the archived `.exe`, `.blockmap` and `latest.yml` from Jenkins and uploads them to the generic package registry and a GitLab release.

**Do not try to move this back into Jenkins without checking permissions first.** It was built that way originally and does not work: publishing from Jenkins needs a credential in its *system* store, and creating one is `Access Denied` for the bridge service account, which holds only `authenticated`. Credentials added through the Jenkins UI can silently land in a **personal** store, which pipelines cannot read — `withCredentials` then fails with "Could not find credentials entry with ID ...", after the build has already spent its full runtime.

`PUBLISH_RELEASE` is therefore always sent as `false` and the parameter is vestigial. It is kept only so older tags stay buildable.

Two tokens are involved, both held as masked, protected GitLab CI variables — **never in Jenkins credentials**:

| Variable | Token | Used by |
| --- | --- | --- |
| `GITLAB_UPDATE_TOKEN` | deploy token, `read_package_registry` | passed to Jenkins as a `password` build parameter, because it must be present when electron-builder packages the app |
| `GITLAB_RELEASE_TOKEN` | project access token, `api`, Maintainer | the bridge, to upload packages and create the release |

The update-feed token is the one exception to "never through job parameters": it has to reach the Windows agent to be baked into the installer, and it ships inside every installer anyway, so a masked parameter is not a meaningful widening of its exposure. Jenkins masks password parameters in the console and build UI.

Both hosts run the same electron-builder signing path; there is no signing difference between a GitHub-built and a Jenkins-built installer.

Installed clients from 2.3.0 onward prefer the GitLab feed and fall back to GitHub. See [RELEASING.md](RELEASING.md) for the feed layout, the ordering rule, and a symptom-first table of the ways this pipeline has broken.

## Trigger behavior

The GitLab job uses `scripts/trigger-jenkins.mjs` on the Linux runner, obtains a Jenkins CSRF crumb when required, triggers `buildWithParameters`, polls the queue, and waits for the Jenkins result. A failed or timed-out Jenkins build fails the GitLab job.

Merge-request pipelines intentionally do not call Jenkins while the protected-token policy is being reviewed. GitHub Actions continues to provide MR validation. Default-branch and version-tag pipelines use the trusted bridge.
