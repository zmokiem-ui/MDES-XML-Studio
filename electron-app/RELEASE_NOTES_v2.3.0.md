# MDES XML Studio v2.3.0

The **bridge release**. It changes where the app looks for updates, and for that
reason it is published to GitHub like every release before it.

## Why this one has to come from GitHub

An installed app updates from the feed baked into the build it is *currently
running*. Everyone on 2.2.0 and earlier polls GitHub, so GitHub is the only
channel that can tell them about anything else. From 2.3.0 onward they check the
company GitLab first.

**Keep publishing GitHub releases until every installed client has been seen on
2.3.0 or later.** Anyone who misses this release stays on the GitHub feed
permanently and needs a manual reinstall.

## What changed

Packaged builds now check two feeds, in order:

1. **GitLab** - the generic package registry on `gitlab.dcsc.com`, project
   `mdes/xml-tooling`. Reachable on the company VPN only.
2. **GitHub** - the provider electron-builder writes into `app-update.yml`.

At startup the app probes GitLab's `latest.yml` with a 5-second timeout and
switches to it only on a real `200`. Anything else - off VPN, wrong token, empty
registry, timeout - silently keeps the GitHub feed.

That fallback is the point. `gitlab.dcsc.com` is not reachable from outside the
network, so preferring GitLab *without* a fallback would have stopped updates for
every tester working remotely, with no error anyone would see. As built, a GitLab
problem degrades to the previous behaviour instead of stranding people.

## For users: nothing to do

No GitLab account, no project membership, no login. The installer carries a
read-only token and authenticates as that token, not as the person. The only
requirement is network reach to `gitlab.dcsc.com`.

So the audience for GitLab updates is "anyone running the app, on the corporate
network" - wider than the GitLab project's member list, narrower than GitHub's
"anyone, anywhere". Nobody outside it loses updates; they come from GitHub.

Settings -> Updates now reports which feed is actually in use.

## Implementation notes

- The feed token is a GitLab **deploy token scoped to `read_package_registry`
  only**, injected at package time by `scripts/write-update-feed.mjs` and sent as
  a `DEPLOY-TOKEN` header. It ships inside the installer and is extractable;
  scoped this way the worst case is that someone already on the VPN can download
  an installer they could download anyway.
- GitLab keys the header to the token type - a deploy token on `PRIVATE-TOKEN`
  returns 401, verified against project 31. The header is therefore decided at
  build time, and an unrecognised value fails the build rather than shipping an
  installer that cannot authenticate.
- With no token in the environment the generator writes a disabled stub, so local
  builds and any pipeline without the secret stay GitHub-only rather than
  breaking.
- The feed root carries no version: `latest.yml` is fetched before the app knows
  which version is newest. The Jenkins publish stage republishes the installer,
  blockmap and `latest.yml` to a stable `.../mdes-xml-studio/latest/` path in
  addition to the per-version archive, deleting the previous `latest` package
  first so a duplicate cannot serve a stale `latest.yml`.
- `latest.yml` records relative paths, so one file serves both feeds unchanged.

## Compatibility

- No change to XML generation, validation, corrections, or the CRS foreign
  deliveries added in 2.2.0.
- A build without `GITLAB_UPDATE_TOKEN` behaves exactly like 2.2.0.

## Verification

- 9 update-feed unit tests, gated in both the GitHub and Jenkins pipelines
- 232 Python unit tests, 155 CLI regression checks
- Playwright smoke, full regression, and packaged-app smoke
- The deploy token checked against the live registry before release:
  `DEPLOY-TOKEN` returns 200, `PRIVATE-TOKEN` returns 401, no header returns 401

## Update notes

- Existing installed users receive this through the in-app auto-updater after the
  GitHub release is published.
- The release includes `latest.yml` and `.blockmap` metadata for electron-updater.
