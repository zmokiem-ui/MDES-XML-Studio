#!/usr/bin/env node
/**
 * Bake the GitLab update feed into the packaged app.
 *
 * electron-updater reads exactly one provider from `app-update.yml`, which
 * electron-builder generates from `build.publish` (GitHub). That stays the
 * fallback. This file adds the *company* feed on top: `electron/update-feed.json`
 * is read at startup and, when it is reachable, preferred over GitHub.
 *
 * The GitLab project is private, so the feed needs a credential. Only the token
 * is secret - the URL is not - so the URL has a default here and only
 * GITLAB_UPDATE_TOKEN has to be supplied by the release pipeline.
 *
 * With no token in the environment this writes a disabled stub, so local builds,
 * developer builds, and any pipeline that has not been given the secret keep
 * behaving exactly as they did before: GitHub only.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = join(here, '..', 'electron', 'update-feed.json');

// Version-independent path. electron-updater fetches <url>/latest.yml *before*
// it knows which version is newest, so the feed root cannot contain a version.
// The release pipeline republishes this same path on every release.
const DEFAULT_URL =
  'https://gitlab.dcsc.com/api/v4/projects/31/packages/generic/mdes-xml-studio/latest';

// GitLab keys the header to the token type, and getting it wrong is a silent
// 401 rather than an error you can see:
//   deploy token  (read_package_registry only) -> DEPLOY-TOKEN
//   personal / project access token            -> PRIVATE-TOKEN
// The deploy token is the narrower of the two and therefore the default.
const DEFAULT_HEADER = 'DEPLOY-TOKEN';
const ALLOWED_HEADERS = ['DEPLOY-TOKEN', 'PRIVATE-TOKEN', 'JOB-TOKEN'];

const token = (process.env.GITLAB_UPDATE_TOKEN || '').trim();
const url = (process.env.GITLAB_UPDATE_URL || DEFAULT_URL).trim();
const header = (process.env.GITLAB_UPDATE_TOKEN_HEADER || DEFAULT_HEADER).trim().toUpperCase();

if (token && !ALLOWED_HEADERS.includes(header)) {
  console.error(
    `GITLAB_UPDATE_TOKEN_HEADER must be one of ${ALLOWED_HEADERS.join(', ')} (got ${header}).`
  );
  process.exit(1);
}

const feed = token ? { url, token, header } : {};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(feed, null, 2) + '\n', 'utf8');

// Never print the token itself - this runs in CI logs.
console.log(
  feed.token
    ? `Update feed: GitLab preferred (${url}) via ${header}, GitHub fallback`
    : 'Update feed: GitHub only (GITLAB_UPDATE_TOKEN not set)'
);
