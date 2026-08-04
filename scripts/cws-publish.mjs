#!/usr/bin/env node
/**
 * Upload (and optionally publish) a Chrome Web Store package via API v2.
 *
 * Required env:
 *   CWS_SERVICE_ACCOUNT_JSON  — service account key JSON
 *   CWS_PUBLISHER_ID          — publisher UUID
 *   CWS_EXTENSION_ID          — 32-character extension ID
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { JWT } from 'google-auth-library';

const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';
const API = 'https://chromewebstore.googleapis.com';

function parseArgs(argv) {
  const args = {
    statusOnly: false,
    uploadOnly: false,
    skipZip: false,
    zipPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case '--status':
        args.statusOnly = true;
        break;
      case '--upload-only':
        args.uploadOnly = true;
        break;
      case '--skip-zip':
        args.skipZip = true;
        break;
      case '--zip':
        args.zipPath = argv[index + 1];
        if (!args.zipPath) throw new Error('--zip requires a path');
        index += 1;
        break;
      case '--help':
      case '-h':
        console.log(
          'Usage: npm run cws:publish -- [--status | --upload-only] [--zip PATH] [--skip-zip]',
        );
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return args;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function itemPath(publisherId, extensionId) {
  return `publishers/${publisherId}/items/${extensionId}`;
}

async function getAccessToken(serviceAccountJson) {
  const keys = JSON.parse(serviceAccountJson);
  const client = new JWT({
    email: keys.client_email,
    key: keys.private_key,
    scopes: [SCOPE],
  });
  const token = await client.authorize();
  if (!token.access_token) throw new Error('Failed to obtain access token');
  return token.access_token;
}

async function fetchJson(url, options, operation) {
  const response = await fetch(url, options);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${operation} ${response.status}: ${body.slice(0, 800)}`);
  }
  return body ? JSON.parse(body) : {};
}

function fetchStatus(token, publisherId, extensionId) {
  return fetchJson(
    `${API}/v2/${itemPath(publisherId, extensionId)}:fetchStatus`,
    { headers: { Authorization: `Bearer ${token}` } },
    'fetchStatus',
  );
}

function uploadZip(token, publisherId, extensionId, zipPath) {
  const bytes = readFileSync(zipPath);
  return fetchJson(
    `${API}/upload/v2/${itemPath(publisherId, extensionId)}:upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/zip',
        'Content-Length': String(bytes.byteLength),
      },
      body: bytes,
    },
    'upload',
  );
}

function publishItem(token, publisherId, extensionId) {
  return fetchJson(
    `${API}/v2/${itemPath(publisherId, extensionId)}:publish`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH' }),
    },
    'publish',
  );
}

function latestChromeZip() {
  const outputDirectory = join(process.cwd(), '.output');
  const zips = readdirSync(outputDirectory)
    .filter(
      (file) =>
        file.endsWith('-chrome.zip') ||
        file.endsWith('.chrome.zip') ||
        (file.endsWith('.zip') && file.includes('chrome')),
    )
    .map((file) => join(outputDirectory, file))
    .filter((path) => statSync(path).isFile())
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);

  if (!zips[0]) {
    throw new Error(`No Chrome zip found in ${outputDirectory}. Run npm run zip first.`);
  }
  return zips[0];
}

function runZip() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'zip'], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm run zip failed (${code})`));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const serviceAccountJson = requireEnv('CWS_SERVICE_ACCOUNT_JSON');
  const publisherId = requireEnv('CWS_PUBLISHER_ID');
  const extensionId = requireEnv('CWS_EXTENSION_ID');
  const token = await getAccessToken(serviceAccountJson);

  if (args.statusOnly) {
    console.log(JSON.stringify(await fetchStatus(token, publisherId, extensionId), null, 2));
    return;
  }

  if (!args.zipPath && !args.skipZip) await runZip();

  const zipPath = args.zipPath ?? latestChromeZip();
  console.log(`Uploading ${zipPath}…`);
  console.log(
    'Upload OK:',
    JSON.stringify(await uploadZip(token, publisherId, extensionId, zipPath), null, 2),
  );

  if (args.uploadOnly) {
    console.log('Skipping publish (--upload-only).');
    return;
  }

  console.log('Submitting for publish/review…');
  console.log(
    'Publish submitted:',
    JSON.stringify(await publishItem(token, publisherId, extensionId), null, 2),
  );
  console.log(
    'Current status:',
    JSON.stringify(await fetchStatus(token, publisherId, extensionId), null, 2),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
