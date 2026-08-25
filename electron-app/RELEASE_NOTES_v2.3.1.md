# MDES XML Studio v2.3.1

A release-pipeline fix. Nothing in the application changed - no difference to how
any XML is generated, validated, or corrected.

## What was wrong

v2.3.0 published correctly to GitHub, and its Jenkins build qualified cleanly,
but the step that uploads the result to the company GitLab failed with
`SELF_SIGNED_CERT_IN_CHAIN`.

Node ships its own CA bundle and ignores the system trust store, so it rejected a
certificate chain that git in the very same container accepts without complaint.
That is why the repository clone succeeded and only the API calls failed. The
Jenkins half was unaffected because it is plain HTTP.

v2.3.0's GitLab assets were published by hand from the artifacts its Jenkins
build had already produced, so the feed has been correct throughout. This release
is what proves the pipeline can do it unattended.

## What changed

- CI runs Node with `--use-openssl-ca` so it reads the system trust store, and
  exports `NODE_EXTRA_CA_CERTS` from `CI_SERVER_TLS_CA_FILE` when the runner
  mounts one. Neither weakens certificate verification, which disabling the check
  would have done.
- A preflight call to the GitLab API now runs *before* Jenkins is triggered, so a
  TLS or token misconfiguration fails in seconds rather than after a 22-minute
  build. That delay is what made the original failure expensive to find.

## Why a version bump for a CI-only change

A GitLab pipeline runs the `.gitlab-ci.yml` belonging to the ref it was triggered
for, so retrying v2.3.0's pipeline would have re-run v2.3.0's broken
configuration. A new tag is the only way to exercise the fix - and it doubles as
a live test of the update path introduced in 2.3.0.

## For users

Nothing to do. Clients on 2.3.0 check the GitLab feed first and fall back to
GitHub, exactly as before; this release travels over whichever one answers.

## Verification

- 232 Python unit tests, 9 update-feed tests, 155 CLI regression checks
- Playwright smoke, full regression, packaged-app smoke
- The publish path exercised against real Jenkins artifacts before release:
  three assets to both the version archive and the `latest` feed, release created
  with all three asset links, and the feed read back through the read-only deploy
  token as the app reads it - 200 for `latest.yml`, 206 on a ranged installer
  request, so differential updates work
