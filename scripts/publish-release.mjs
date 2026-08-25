import path from 'node:path';
import { createWriteStream, openAsBlob } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

async function readJson(response, context) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${context} failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

// --- Publishing -----------------------------------------------------------
// Jenkins builds and archives; this side publishes. Splitting it that way is
// not architectural preference - adding credentials to the Jenkins system store
// requires a permission this account does not have, whereas the tokens are
// already here as masked CI variables.

const RELEASE_ASSET = /(\.exe|\.exe\.blockmap|latest\.yml)$/;

async function fetchArtifactList(buildUrl, jenkinsHeaders) {
  const url = `${buildUrl}/api/json?tree=artifacts%5BrelativePath,fileName%5D`;
  const build = await readJson(await fetch(url, { headers: jenkinsHeaders }), 'Jenkins artifact list');
  const assets = (build.artifacts || []).filter((a) => RELEASE_ASSET.test(a.fileName));
  const kinds = new Set(assets.map((a) =>
    a.fileName.endsWith('latest.yml') ? 'yml' : a.fileName.endsWith('.blockmap') ? 'map' : 'exe'));
  // electron-updater needs all three together: latest.yml to find the version,
  // the installer to download, and the blockmap or every update is a full
  // re-download instead of a differential one.
  if (kinds.size !== 3) {
    throw new Error(
      `Expected installer, blockmap and latest.yml among Jenkins artifacts; got ${
        assets.map((a) => a.fileName).join(', ') || 'none'}`);
  }
  return assets;
}

async function downloadArtifact(buildUrl, artifact, dir, jenkinsHeaders) {
  const response = await fetch(`${buildUrl}/artifact/${artifact.relativePath}`, { headers: jenkinsHeaders });
  if (!response.ok) {
    throw new Error(`Downloading ${artifact.fileName} failed with HTTP ${response.status}`);
  }
  const target = path.join(dir, artifact.fileName);
  // Streamed to disk: the installer is ~220 MB and is uploaded twice, so it
  // cannot be held in memory or consumed from a single-use stream.
  await pipeline(Readable.fromWeb(response.body), createWriteStream(target));
  return target;
}

async function uploadPackageFile(base, token, packageVersion, filePath, fileName) {
  const url = `${base}/packages/generic/mdes-xml-studio/${packageVersion}/${encodeURIComponent(fileName)}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'PRIVATE-TOKEN': token, 'Content-Type': 'application/octet-stream' },
    body: await openAsBlob(filePath),
    duplex: 'half',
  });
  if (!response.ok) {
    throw new Error(`Uploading ${fileName} to ${packageVersion} failed with HTTP ${response.status}`);
  }
  return url;
}

async function upsertRelease(base, token, tag, links) {
  const body = JSON.stringify({
    name: `MDES XML Studio ${tag}`,
    tag_name: tag,
    description: `Automated Windows release for ${tag}. Installed clients on 2.3.0 or later ` +
      `update from this registry when they can reach it, and from the GitHub release otherwise.`,
    assets: { links },
  });
  const common = { headers: { 'PRIVATE-TOKEN': token, 'Content-Type': 'application/json' }, body };

  // Create first, update on conflict. Verified against this GitLab: POST is 201
  // when new and 409 when the release exists, while PUT is 200 when it exists
  // and 403 - not 404 - when it does not. Trying PUT first therefore fails
  // permanently on a first release, and looks like a permissions problem.
  const create = await fetch(`${base}/releases`, { method: 'POST', ...common });
  if (create.ok) return;
  if (create.status !== 409) {
    throw new Error(`Creating release ${tag} failed with HTTP ${create.status}`);
  }
  const update = await fetch(`${base}/releases/${encodeURIComponent(tag)}`, { method: 'PUT', ...common });
  if (!update.ok) {
    throw new Error(`Updating existing release ${tag} failed with HTTP ${update.status}`);
  }
}

export async function publishRelease(buildUrl, tag, jenkinsHeaders) {
  const token = process.env.GITLAB_RELEASE_TOKEN;
  if (!token) throw new Error('GITLAB_RELEASE_TOKEN is not set; cannot publish the release.');
  const base = `${process.env.CI_API_V4_URL}/projects/${process.env.CI_PROJECT_ID}`;
  const version = tag.replace(/^v/, '');

  const assets = await fetchArtifactList(buildUrl, jenkinsHeaders);
  const dir = await mkdtemp(path.join(tmpdir(), 'mdes-release-'));
  try {
    const links = [];
    for (const artifact of assets) {
      const file = await downloadArtifact(buildUrl, artifact, dir, jenkinsHeaders);
      // Twice on purpose: the version folder is the archive, and the "latest"
      // folder is the feed the app reads. electron-updater fetches
      // <feed>/latest.yml before it knows which version is newest, so the feed
      // root cannot contain a version. Re-uploading the same name replaces what
      // the registry serves, so no delete step is needed - and deleting would
      // need a permission the job token may not have.
      const url = await uploadPackageFile(base, token, version, file, artifact.fileName);
      await uploadPackageFile(base, token, 'latest', file, artifact.fileName);
      links.push({ name: artifact.fileName, url, link_type: 'package' });
      console.log(`Published ${artifact.fileName}`);
    }
    await upsertRelease(base, token, tag, links);
    console.log(`GitLab release ${tag} published; update feed republished at .../mdes-xml-studio/latest`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
