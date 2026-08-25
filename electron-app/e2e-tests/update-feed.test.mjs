/**
 * Tests for the update-feed generator.
 *
 * The failure that matters here is silent: a build that ships a feed file it
 * should not (leaking the token into a public GitHub artifact), or one that
 * ships a half-written feed the app then treats as usable. Both are checked.
 *
 * Run with: node --test e2e-tests/update-feed.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts', 'write-update-feed.mjs');
const output = join(root, 'electron', 'update-feed.json');

function run(env) {
  const stdout = execFileSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GITLAB_UPDATE_TOKEN: '', GITLAB_UPDATE_URL: '', ...env },
  });
  return { stdout, feed: JSON.parse(readFileSync(output, 'utf8')) };
}

test('no token produces a disabled feed, so the build stays GitHub-only', () => {
  const { feed } = run({});
  assert.deepEqual(feed, {}, 'a build without the secret must not claim a GitLab feed');
});

test('a token produces a complete feed', () => {
  const { feed } = run({ GITLAB_UPDATE_TOKEN: 'glpat-example' });
  assert.equal(feed.token, 'glpat-example');
  assert.match(feed.url, /^https:\/\/gitlab\.dcsc\.com\/api\/v4\/projects\/31\//);
});

test('the feed root carries no version', () => {
  // electron-updater fetches <url>/latest.yml before it knows the newest
  // version, so a versioned feed root can never resolve.
  const { feed } = run({ GITLAB_UPDATE_TOKEN: 'glpat-example' });
  assert.ok(feed.url.endsWith('/latest'), `feed root must be version-independent: ${feed.url}`);
  assert.ok(!/\d+\.\d+\.\d+/.test(feed.url), `feed root must not pin a version: ${feed.url}`);
});

test('the token is never printed', () => {
  const { stdout } = run({ GITLAB_UPDATE_TOKEN: 'glpat-secret-value' });
  assert.ok(!stdout.includes('glpat-secret-value'), 'the token must not reach CI logs');
});

test('the URL can be overridden without touching the code', () => {
  const { feed } = run({
    GITLAB_UPDATE_TOKEN: 'glpat-example',
    GITLAB_UPDATE_URL: 'https://gitlab.example.com/api/v4/projects/9/packages/generic/app/latest',
  });
  assert.equal(feed.url, 'https://gitlab.example.com/api/v4/projects/9/packages/generic/app/latest');
});

test('the generated feed is gitignored', () => {
  const ignore = readFileSync(join(root, '..', '.gitignore'), 'utf8');
  assert.ok(
    ignore.includes('electron-app/electron/update-feed.json'),
    'the generated feed holds a token and must never be committable'
  );
});

test.after(() => {
  // Leave the tree as a token-free build would: disabled feed.
  run({});
  if (existsSync(output)) {
    assert.deepEqual(JSON.parse(readFileSync(output, 'utf8')), {});
  } else {
    rmSync(output, { force: true });
  }
});
