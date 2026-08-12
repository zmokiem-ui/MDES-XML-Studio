# GitLab to Jenkins Windows CI bridge

GitLab performs the lightweight trigger on the MDES Linux runner. Jenkins performs the Windows Python, Electron, Playwright, packaging, and optional GitLab release work.

## GitLab variables

Configure these as protected, masked project or MDES group variables. Never commit their values.

- `JENKINS_JOB_URL`: full URL of the DevOps-created Jenkins job.
- `JENKINS_USER`: Jenkins service user allowed to trigger this job.
- `JENKINS_API_TOKEN`: API token for that service user.
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

## Release publishing credential

For tag pipelines, the bridge requests `PUBLISH_RELEASE=true`. DevOps must create a Jenkins **Secret Text** credential with ID `mdes-xml-studio-gitlab-release-token`. The token needs only the GitLab API permission required to upload the generic package assets and create/update a release for this project. Keep it in Jenkins credentials; it is never passed through GitLab job parameters or printed.

The release job builds and tests before publishing. It does not sign artifacts or publish to GitHub. Existing installed clients remain on the GitHub updater path until a separate updater migration is verified.

## Trigger behavior

The GitLab job uses `scripts/trigger-jenkins.mjs` on the Linux runner, obtains a Jenkins CSRF crumb when required, triggers `buildWithParameters`, polls the queue, and waits for the Jenkins result. A failed or timed-out Jenkins build fails the GitLab job.

Merge-request pipelines intentionally do not call Jenkins while the protected-token policy is being reviewed. GitHub Actions continues to provide MR validation. Default-branch and version-tag pipelines use the trusted bridge.
