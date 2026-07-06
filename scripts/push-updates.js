#!/usr/bin/env node
/**
 * Push the local Apps Script source to registered College Tools copies.
 *
 * Required local files/environment:
 * - Google OAuth desktop credentials at credentials.json, or set CREDENTIALS_PATH.
 * - Registry sheet ID via REGISTRY_SHEET_ID.
 * - Optional token path via TOKEN_PATH (defaults to token.json).
 * - Optional manifest path via MANIFEST_PATH (defaults to root appsscript.json).
 *
 * Examples:
 *   REGISTRY_SHEET_ID=... node scripts/push-updates.js --dry-run
 *   REGISTRY_SHEET_ID=... node scripts/push-updates.js --script-id abc123
 */

const {google} = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SCOPES = [
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];
const TOKEN_PATH = process.env.TOKEN_PATH || 'token.json';
const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH || 'credentials.json';
const REGISTRY_SHEET_ID = process.env.REGISTRY_SHEET_ID;
const SOURCE_DIR = process.env.SOURCE_DIR || 'src';
const MANIFEST_PATH = process.env.MANIFEST_PATH || 'appsscript.json';
const BACKUP_DIR = process.env.BACKUP_DIR || 'backups';
const REGISTRY_RANGE = process.env.REGISTRY_RANGE || 'Registry!A2:F';
const PUSH_DELAY_MS = Number(process.env.PUSH_DELAY_MS || 1500);

async function getAuthClient() {
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const desktopCreds = creds.installed || creds.web;
  const {client_secret: clientSecret, client_id: clientId, redirect_uris: redirectUris} = desktopCreds;
  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({access_type: 'offline', scope: SCOPES});
  console.log('Authorize this app by visiting:', authUrl);
  const code = await readLine('Enter the code from that page: ');
  const {tokens} = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  return oAuth2Client;
}

function readLine(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({input: process.stdin, output: process.stdout});
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function loadRegistry(auth) {
  if (!REGISTRY_SHEET_ID) {
    throw new Error('Set REGISTRY_SHEET_ID before running this tool.');
  }

  const sheets = google.sheets({version: 'v4', auth});
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: REGISTRY_SHEET_ID,
    range: REGISTRY_RANGE,
  });

  return (res.data.values || [])
    .filter((row) => row[0])
    .map((row) => ({
      scriptId: row[0],
      spreadsheetId: row[1] || '',
      spreadsheetUrl: row[2] || '',
      ownerEmail: row[3] || '',
      lastSeenVersion: row[4] || '',
      lastSeenTimestamp: row[5] || '',
    }));
}

function resolvePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function loadLocalSource(sourceDir, manifestPath) {
  const resolvedSourceDir = resolvePath(sourceDir);
  const resolvedManifestPath = resolvePath(manifestPath || MANIFEST_PATH);
  if (!fs.existsSync(resolvedManifestPath)) {
    throw new Error('Manifest file not found: ' + resolvedManifestPath);
  }

  const fileNames = fs.readdirSync(resolvedSourceDir)
    .filter((fileName) => fs.statSync(path.join(resolvedSourceDir, fileName)).isFile())
    .filter((fileName) => fileName !== 'appsscript.json')
    .filter((fileName) => ['.js', '.gs', '.html', '.json'].includes(path.extname(fileName)))
    .sort();

  const files = [{
    name: 'appsscript',
    type: 'JSON',
    source: fs.readFileSync(resolvedManifestPath, 'utf8'),
  }];

  fileNames.forEach((fileName) => {
    const ext = path.extname(fileName);
    const nameNoExt = path.basename(fileName, ext);
    const content = fs.readFileSync(path.join(resolvedSourceDir, fileName), 'utf8');

    if (ext === '.html') {
      files.push({name: nameNoExt, type: 'HTML', source: content});
    } else {
      files.push({name: nameNoExt, type: 'SERVER_JS', source: content});
    }
  });

  return files;
}

async function pushToScript(scriptClient, scriptId, files) {
  return scriptClient.projects.updateContent({
    scriptId,
    requestBody: {files},
  });
}

function readRequiredValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.indexOf('--') === 0) {
    throw new Error('Missing value for ' + flag);
  }
  return value;
}

function parseArgs(argv) {
  const options = {dryRun: false, scriptId: '', limit: 0};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') {
      options.dryRun = true;
    } else if (argv[i] === '--script-id') {
      options.scriptId = readRequiredValue(argv, i, '--script-id');
      i++;
    } else if (argv[i] === '--limit') {
      const rawLimit = readRequiredValue(argv, i, '--limit');
      const limit = Number(rawLimit);
      if (!Number.isInteger(limit) || limit < 1) {
        throw new Error('Invalid --limit value ' + rawLimit);
      }
      options.limit = limit;
      i++;
    } else {
      throw new Error('Unknown argument ' + argv[i]);
    }
  }
  return options;
}

function filterRegistry(registry, options) {
  let filtered = registry;
  if (options.scriptId) {
    filtered = filtered.filter((entry) => entry.scriptId === options.scriptId);
    if (filtered.length === 0) {
      throw new Error('No registry rows matched --script-id ' + options.scriptId);
    }
  }
  if (options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }
  if (filtered.length === 0) {
    throw new Error('No registry rows selected.');
  }
  return filtered;
}

function backupPath(scriptId, backupDir) {
  return path.join(backupDir || BACKUP_DIR, `${scriptId}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function pushRegistryTargets(scriptClient, registry, files, options) {
  let successCount = 0;
  let failureCount = 0;
  const backupDir = options.backupDir || BACKUP_DIR;
  const delayMs = Number(options.delayMs || 0);

  fs.mkdirSync(backupDir, {recursive: true});

  for (const entry of registry) {
    try {
      const existing = await scriptClient.projects.getContent({scriptId: entry.scriptId});
      const backupFile = backupPath(entry.scriptId, backupDir);
      fs.writeFileSync(backupFile, JSON.stringify(existing.data, null, 2));

      if (!options.dryRun) {
        await pushToScript(scriptClient, entry.scriptId, files);
      }
      successCount++;
      console.log(`✓ ${options.dryRun ? 'Validated access for' : 'Pushed to'} ${entry.scriptId} (${entry.ownerEmail}); backup: ${backupFile}`);
    } catch (err) {
      failureCount++;
      const message = err && err.message ? err.message : String(err);
      console.error(`✗ Failed for ${entry.scriptId} (${entry.ownerEmail}): ${message}`);
    }

    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return {successCount, failureCount};
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const auth = await getAuthClient();
  const scriptClient = google.script({version: 'v1', auth});
  const registry = filterRegistry(await loadRegistry(auth), options);
  const files = loadLocalSource(SOURCE_DIR, MANIFEST_PATH);

  console.log(`${options.dryRun ? 'Would push' : 'Pushing'} ${files.length} files to ${registry.length} known copies...`);

  const result = await pushRegistryTargets(scriptClient, registry, files, {
    dryRun: options.dryRun,
    backupDir: BACKUP_DIR,
    delayMs: PUSH_DELAY_MS,
  });

  if (result.failureCount > 0) {
    process.exitCode = 1;
  }
  return result;
}

module.exports = {
  filterRegistry,
  loadLocalSource,
  parseArgs,
  pushRegistryTargets,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
