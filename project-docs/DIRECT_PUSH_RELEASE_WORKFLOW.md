# Direct Push Release Workflow

This document explains how to use the direct-push update feature when releasing new College Tools code. Use it after the central registry has been provisioned and the template has phone-home registration enabled.

For registry setup, see `project-docs/DIRECT_PUSH_REGISTRY_PROVISIONING.md`.

## Release Responsibilities

The workflow has two separate targets:

1. **Template project** — the clasp-bound Apps Script project in `.clasp.json`. This remains the source for future public template copies.
2. **Known copied projects** — script IDs listed in the central registry sheet. These are existing user copies that do not update automatically when the template changes.

A normal release should update both targets:

1. Version and deploy the template.
2. Verify the template/published copy.
3. Push the same source to known registered copies with `scripts/push-updates.js`.

## One-Time Local Setup

### 1. Enable Required APIs

From the maintainer Google account:

1. Enable the Apps Script API in Apps Script user settings: `https://script.google.com/home/usersettings`.
2. Create OAuth credentials in Google Cloud Console for an app with Apps Script API access.
3. Use **Desktop app** credentials when possible.
4. Download the OAuth client file as `credentials.json` at the repo root, or set `CREDENTIALS_PATH=/path/to/credentials.json`.

### 2. Confirm Required Access

The maintainer account must be an editor on each target user spreadsheet. Without edit access, `projects.updateContent` will fail with 403.

### 3. Export Local Environment Variables

At minimum, set the registry sheet ID before running the push tool:

```bash
export REGISTRY_SHEET_ID=<registry-sheet-id>
```

Optional overrides:

| Variable | Default | Purpose |
| --- | --- | --- |
| `CREDENTIALS_PATH` | `credentials.json` | OAuth desktop/web client file. |
| `TOKEN_PATH` | `token.json` | Cached OAuth token written after first authorization. |
| `SOURCE_DIR` | `src` | Local Apps Script source directory to push. |
| `BACKUP_DIR` | `backups` | Directory for target script backups. |
| `REGISTRY_RANGE` | `Registry!A2:F` | Registry rows to read. |
| `PUSH_DELAY_MS` | `1500` | Delay between target pushes to avoid rate limits. |

## Per-Release Workflow

### 1. Prepare the Release Source

Follow the normal version and release process in `project-docs/VERSION_MANAGEMENT.md`:

```bash
npm run release:prepare
git add -A
git commit -m "chore: release v<version>"
npm run release:tag
git push origin main --tags
```

This matters because copy registration is version-gated: each copy reports once per `CollegeTools.Config.VERSION`.

### 2. Deploy to the Template Apps Script Project

```bash
npm run release:clasp
```

This pushes the current `src/` content to the template script project and creates an Apps Script version.

### 3. Verify Registration on a Throwaway Copy

Before touching real user copies:

1. Make a throwaway copy of the current template/published spreadsheet.
2. Open it once.
3. Confirm it appears in the registry sheet.
4. Confirm `lastSeenVersion` matches the version being released.

If registration does not work, stop and fix provisioning before using the push tool.

### 4. Dry-Run the Push Tool

Run a dry run against one known test script ID first:

```bash
REGISTRY_SHEET_ID=<registry-sheet-id> npm run push:updates -- --dry-run --script-id <throwaway-script-id>
```

The dry run authenticates, reads the registry, checks target content access, and writes a backup, but does not call `projects.updateContent`.

### 5. Push to the Throwaway Copy

```bash
REGISTRY_SHEET_ID=<registry-sheet-id> npm run push:updates -- --script-id <throwaway-script-id>
```

Then open the throwaway copy's Apps Script editor and confirm the latest source landed.

### 6. Push to Real Registered Copies

Once the throwaway copy passes:

```bash
REGISTRY_SHEET_ID=<registry-sheet-id> npm run push:updates
```

The tool will:

1. Read registered targets from `Registry!A2:F`.
2. Load all source files from `src/`.
3. Back up each target script project into `backups/`.
4. Replace each target project's full Apps Script file set with the local source.
5. Wait between pushes according to `PUSH_DELAY_MS`.

Remember that `projects.updateContent` replaces the entire file set. Ensure `src/` contains every file that should exist in the target Apps Script project.

### 7. Confirm Copies Report the New Version

After pushing, ask or wait for users to open their sheets. On open, each copy should phone home again because its source now contains the new version. Confirm the registry row's `lastSeenVersion` and `lastSeenTimestamp` update.

## Targeting and Safety Options

Use these flags to reduce blast radius:

```bash
# Validate access and backups only; do not write updated source.
npm run push:updates -- --dry-run

# Push only one known copy.
npm run push:updates -- --script-id <script-id>

# Push only the first N rows from the registry range.
npm run push:updates -- --limit 1
```

Use `REGISTRY_RANGE` if you need a temporary filtered range from the registry sheet, for example a manually curated test tab/range.

## Failure Handling

| Error | Meaning | Action |
| --- | --- | --- |
| 403 | Maintainer account does not have edit access to the target script/sheet. | Skip that row and ask the owner to share the copied sheet with editor access. |
| 404 | Target script or spreadsheet no longer exists, or the script ID is wrong. | Mark or remove the stale registry row after confirming. |
| 429 | API quota/rate limit. | Increase `PUSH_DELAY_MS` and rerun. Rows that already succeeded can be skipped with a filtered registry range or `--script-id`. |
| Auth prompt repeats | Token missing, revoked, or wrong account. | Delete `token.json`, confirm `credentials.json`, and authorize with the maintainer account. |

## Rollback

Every run writes backups before pushing. To roll back a target manually:

1. Find the relevant backup file in `backups/`.
2. Inspect the JSON to identify the saved `files` payload.
3. Use a small recovery script or the Apps Script API to call `projects.updateContent` with the backed-up files for that target `scriptId`.

For template rollback, use the normal Git/clasp process documented in `project-docs/VERSION_MANAGEMENT.md`.

## Operational Notes

- Do not commit `credentials.json`, `token.json`, or `backups/`.
- Keep `COLLEGE_TOOLS_REGISTRY_SECRET` synchronized between the template script project and registry Web App, but never store the real value in Git.
- If a user customizes their copied Apps Script project, a direct push will overwrite those code changes. This is an accepted risk for the current small known-user workflow.
- If the registry grows materially beyond a handful of users, revisit batching, logging, stronger authentication, and add-on/library alternatives.
