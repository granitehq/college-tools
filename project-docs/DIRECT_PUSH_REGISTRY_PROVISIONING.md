# Direct Push Registry Provisioning

This document explains how to provision the **central app registry** used by the direct-push update workflow. The registry is a standalone Apps Script Web App backed by a Google Sheet. Template copies phone home to this Web App so the maintainer can later push new Apps Script source into those copied/container-bound script projects.

## What This Registry Stores

Each row represents one known copied spreadsheet/script project.

| Column | Required | Description |
| --- | --- | --- |
| `scriptId` | Yes | The copied spreadsheet's container-bound Apps Script project ID. This is the primary key used by the local push tool. |
| `spreadsheetId` | Yes | The copied Google Sheet file ID. Useful for access checks and user support. |
| `spreadsheetUrl` | Recommended | The copied Google Sheet URL. Useful for opening the target quickly when debugging. |
| `ownerEmail` | Best effort | The effective user email reported by the copy when registration runs. Google may return a blank value depending on account/domain/privacy behavior. |
| `lastSeenVersion` | Yes | The `CollegeTools.Config.VERSION` value reported by the copy. Registration runs once per version per copy. |
| `lastSeenTimestamp` | Yes | ISO timestamp from the registering copy. Useful for seeing whether a copy has opened after a release. |

The registry Web App upserts by `scriptId`, so repeat registrations from the same copied script update the existing row instead of appending duplicates.

## Provisioning Checklist

### 1. Create the Backing Registry Spreadsheet

1. Create a new Google Sheet owned by the maintainer account.
2. Rename the first tab to exactly `Registry`.
3. Add this header row in row 1, columns A:F:

   ```text
   scriptId | spreadsheetId | spreadsheetUrl | ownerEmail | lastSeenVersion | lastSeenTimestamp
   ```

4. Copy the spreadsheet ID from the URL:

   ```text
   https://docs.google.com/spreadsheets/d/<REGISTRY_SHEET_ID>/edit
   ```

### 2. Create the Standalone Apps Script Registry Project

1. Create a new standalone Apps Script project from the maintainer account.
2. Copy the contents of `scripts/registry-webapp.js` into the standalone project.
3. Open **Project Settings → Script properties**.
4. Add these script properties:

   | Property | Value |
   | --- | --- |
   | `COLLEGE_TOOLS_REGISTRY_SECRET` | A random shared secret. Keep it out of Git. This must match the secret configured on the template/copies. |
   | `COLLEGE_TOOLS_REGISTRY_SHEET_ID` | The backing registry spreadsheet ID from step 1. |

### 3. Deploy the Registry Web App

1. In the standalone Apps Script project, select **Deploy → New deployment**.
2. Choose **Web app**.
3. Set **Execute as** to **Me**.
4. Set **Who has access** to **Anyone**.
5. Deploy and authorize the script.
6. Copy the deployed Web App URL. It should look like:

   ```text
   https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
   ```

The Web App is intentionally public so copied spreadsheets can post without a separate OAuth flow. The shared secret is the lightweight anti-spoofing control for the current small-user workflow.

### 4. Configure the Template to Phone Home

1. Set `CollegeTools.Config.REGISTRATION_CONFIG.ENDPOINT_URL` in `src/config.js` to the deployed registry Web App URL before a release build.
2. In the template Apps Script project, set the script property:

   | Property | Value |
   | --- | --- |
   | `COLLEGE_TOOLS_REGISTRY_SECRET` | The same shared secret configured on the standalone registry Web App. |

3. Deploy/push the template code so `src/registration.js` and the updated `onOpen()` are present in the template.
4. Make a throwaway copy of the template, open it, and verify that a row appears in the registry sheet.

## Verification

After provisioning, test with a throwaway copy before relying on real user copies:

1. Make a copy of the published/template spreadsheet using the same path real users will use.
2. Open the copy and wait for `onOpen()` to finish.
3. Confirm the registry sheet has a row with:
   - a non-empty `scriptId`
   - the copied `spreadsheetId`
   - the current `lastSeenVersion`
   - a fresh `lastSeenTimestamp`
4. Reopen the same copy without changing the app version and confirm no duplicate row is created.
5. Bump the app version in a test branch and reopen the copy; confirm the same row updates to the new version.

## Troubleshooting

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| No row appears | `ENDPOINT_URL` is blank or points to the wrong deployment. | Check `CollegeTools.Config.REGISTRATION_CONFIG.ENDPOINT_URL` and repush the template. |
| Registry returns `rejected` | Shared secrets do not match. | Update `COLLEGE_TOOLS_REGISTRY_SECRET` on the standalone registry project and the template project. |
| Registry returns an error | Registry sheet ID or tab name is wrong. | Check `COLLEGE_TOOLS_REGISTRY_SHEET_ID` and ensure the tab is named `Registry`. |
| `ownerEmail` is blank | Google did not expose the effective user email. | This is expected in some account/privacy contexts; use `spreadsheetUrl` and manual sharing records for support. |
| Push tool later gets 403 | Maintainer account lacks edit access to the copied spreadsheet/script. | Ask the owner to share the copied sheet with the maintainer account as an editor. |

## Security Notes

- Do not commit the shared secret, OAuth credentials, or token files.
- `.gitignore` excludes `credentials.json`, `token.json`, and `backups/` for the local push workflow.
- The shared secret is intentionally a minimal control for a small known-user deployment. Revisit the design if distribution becomes public or untrusted.
