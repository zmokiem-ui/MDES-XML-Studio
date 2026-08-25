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

const token = (process.env.GITLAB_UPDATE_TOKEN || '').trim();
const url = (process.env.GITLAB_UPDATE_URL || DEFAULT_URL).trim();

const feed = token ? { url, token } : {};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(feed, null, 2) + '\n', 'utf8');

// Never print the token itself - this runs in CI logs.
console.log(
  feed.token
    ? `Update feed: GitLab preferred (${url}), GitHub fallback`
    : 'Update feed: GitHub only (GITLAB_UPDATE_TOKEN not set)'
);
