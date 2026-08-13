const required = ['JENKINS_JOB_URL', 'JENKINS_USER', 'JENKINS_API_TOKEN'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required Jenkins bridge variables: ${missing.join(', ')}`);
  process.exit(2);
}

const jobUrl = process.env.JENKINS_JOB_URL.replace(/\/$/, '');
const username = process.env.JENKINS_USER;
const apiToken = process.env.JENKINS_API_TOKEN;
const auth = `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`;
const timeoutSeconds = Number.parseInt(process.env.JENKINS_TIMEOUT_SECONDS || '5400', 10);
const pollSeconds = Number.parseInt(process.env.JENKINS_POLL_SECONDS || '10', 10);

function headers(extra = {}) {
  return { Authorization: auth, ...extra };
}

async function readJson(response, context) {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${context} failed with HTTP ${response.status}: ${body.slice(0, 500)}`);
  }
  return body ? JSON.parse(body) : {};
}

async function getCrumb() {
  const response = await fetch(`${jobUrl.split('/job/')[0]}/crumbIssuer/api/json`, {
    headers: headers(),
  });
  if (response.status === 404) return {};
  const crumb = await readJson(response, 'Jenkins crumb request');
  return crumb.crumbRequestField && crumb.crumb ? { [crumb.crumbRequestField]: crumb.crumb } : {};
}

function bridgeParameters() {
  const isTag = Boolean(process.env.CI_COMMIT_TAG);
  return {
    GIT_REF: process.env.CI_MERGE_REQUEST_REF_PATH ||
      (isTag ? `refs/tags/${process.env.CI_COMMIT_TAG}` : `refs/heads/${process.env.CI_COMMIT_REF_NAME}`),
    SOURCE_COMMIT: process.env.CI_COMMIT_SHA || '',
    GIT_REPOSITORY: process.env.CI_PROJECT_URL || '',
    GITLAB_PROJECT_PATH: process.env.CI_PROJECT_PATH || '',
    GITLAB_PROJECT_ID: process.env.CI_PROJECT_ID || '',
    GITLAB_API_V4_URL: process.env.CI_API_V4_URL || '',
    GITLAB_PIPELINE_ID: process.env.CI_PIPELINE_ID || '',
    GITLAB_PIPELINE_URL: process.env.CI_PIPELINE_URL || '',
    GITLAB_PIPELINE_SOURCE: process.env.CI_PIPELINE_SOURCE || '',
    QUALIFY_TAG: isTag ? 'true' : 'false',
    PUBLISH_RELEASE: isTag ? 'true' : 'false',
  };
}

const crumbHeaders = await getCrumb();
const parameters = new URLSearchParams(bridgeParameters());
const trigger = await fetch(`${jobUrl}/buildWithParameters`, {
  method: 'POST',
  headers: headers({ ...crumbHeaders, 'Content-Type': 'application/x-www-form-urlencoded' }),
  body: parameters,
});

if (![200, 201, 202].includes(trigger.status)) {
  const body = await trigger.text();
  throw new Error(`Jenkins trigger failed with HTTP ${trigger.status}: ${body.slice(0, 500)}`);
}

const queueUrl = trigger.headers.get('location');
if (!queueUrl) throw new Error('Jenkins accepted the trigger but returned no queue location.');

console.log(`Jenkins job queued: ${queueUrl}`);
const deadline = Date.now() + timeoutSeconds * 1000;
let buildUrl;

while (Date.now() < deadline) {
  const queueResponse = await fetch(`${queueUrl.replace(/\/$/, '')}/api/json`, { headers: headers() });
  const queue = await readJson(queueResponse, 'Jenkins queue lookup');
  if (queue.cancelled) throw new Error('Jenkins cancelled the queued build.');
  if (queue.executable?.url) {
    buildUrl = queue.executable.url.replace(/\/$/, '');
    console.log(`Jenkins build started: ${buildUrl}`);
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, pollSeconds * 1000));
}

if (!buildUrl) throw new Error(`Jenkins build did not start within ${timeoutSeconds} seconds.`);

while (Date.now() < deadline) {
  const buildResponse = await fetch(`${buildUrl}/api/json`, { headers: headers() });
  const build = await readJson(buildResponse, 'Jenkins build lookup');
  if (!build.building) {
    console.log(`Jenkins result: ${build.result || 'UNKNOWN'} (${buildUrl})`);
    process.exit(build.result === 'SUCCESS' ? 0 : 1);
  }
  await new Promise((resolve) => setTimeout(resolve, pollSeconds * 1000));
}

throw new Error(`Jenkins build did not finish within ${timeoutSeconds} seconds.`);
