# Version Management

College Tools uses semantic versioning (semver) with automated version management across all source files.

## Version Format

We follow semantic versioning: `MAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes or significant architectural changes
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, small improvements

Run `npm run version:show` for the current version — don't rely on a hardcoded number in this doc, it will drift.

## Automated Version Updates

`npm run version:patch|minor|major` (via `scripts/update-version.js`) updates:

1. **package.json** - Main version source
2. **All source files** - `@version` tags in file headers
3. **config.js** - `CollegeTools.Config.VERSION` constant used throughout the app
4. **Runtime displays** - "Show version" menu uses `Config.VERSION` dynamically

## Two Spreadsheets, Two Environments

There are two Google Sheets in play, analogous to non-production and production:

- **Template** — the clasp-bound development copy. Its Apps Script project's Script ID matches `scriptId` in `.clasp.json`. This is what `npm run release:clasp` deploys to. This is where you make template structure edits (per the Phase 1 checklist in `product-plan.md`) and verify Setup/Repair before shipping.
- **Published** — the spreadsheet real users copy. Its Google Sheets file ID is **not** recorded anywhere in this repo except `docs/index.html`, `docs/features.html`, and `docs/getting-started.html` (the "Copy Template" buttons on the public website). Nothing else should ever hardcode this ID — see "Why only the website holds the ID" below.

**Copying a spreadsheet in Google Drive always creates a new file ID.** There's no way to push code or content into an existing Drive file's ID from a different file — so promoting a release means the published spreadsheet's ID changes every time. That's expected; the ID rotates, the website is the one place it needs updating.

### Why only the website holds the ID

`README.md`, `GEMINI.md`, `project-docs/offering-options.md`, and the in-sheet "Get the latest template" link (`src/instructions.js`) all point to `https://college-tools.granite-hq.com/getting-started` instead of a raw Sheets URL. That page is the only place with the actual current published Sheets ID. This means:

- Promoting a release only requires editing 3 HTML files, not 5+ scattered locations.
- There's no chicken-and-egg problem — code shipped inside a spreadsheet copy can safely reference "the website" without knowing its own future published ID in advance.

If you ever need the raw published Sheets ID for a task, get it from the "Copy Template" href in `docs/getting-started.html`, not by grepping the codebase.

## Release Workflow

GitHub is the durable release record. Prepare and commit the project version first, tag that exact commit, deploy the same code to the template's Apps Script project with clasp, then promote the template to a new published copy.

```bash
# 1. Version + tag (run from main, after development is merged in)
npm run release:prepare
git add -A
git commit -m "chore: release v2.6.1"
npm run release:tag
git push origin main --tags

# 2. Deploy code to the template's bound Apps Script project
npm run release:clasp
```

Notes:

- Replace `v2.6.1` in the commit message with the version `npm run release:prepare` produced.
- `npm run release:tag` creates `v<package.json version>`, for example `v2.6.1`.
- `npm run release:clasp` pushes to the **template's** Apps Script project and creates an Apps Script version; it does not touch the published spreadsheet and does not create a GitHub Release.

### 3. Promote the template to a new published copy

Only do this once you've verified the template (formulas, dashboard, Setup/Repair) with the new code:

1. Open the template spreadsheet in Google Drive.
2. **File → Make a copy.** Optionally rename it (e.g. "College Tools vX.Y.Z") — renaming never changes the file ID, so do this freely for your own bookkeeping.
3. On the new copy, run **Complete Setup** (or **Repair Entire Workbook**) to confirm everything builds cleanly on a fresh copy.
4. Copy the new file's ID out of its URL (`https://docs.google.com/spreadsheets/d/<ID>/edit`).
5. Run `npm run release:promote -- <new-id>` — this rewrites the "Copy Template" link in `docs/index.html`, `docs/features.html`, and `docs/getting-started.html` in one shot (`scripts/update-template-link.js`).
6. Review with `git diff`, commit, and push — Cloudflare Pages redeploys the website automatically.

Existing users who already copied an older published version are unaffected either way — each copy has its own independent Apps Script project frozen at copy time. There's no auto-update mechanism for already-distributed copies (see `archive/architecture-review.md` item A5 for the closest planned thing, a deadline email digest, which is unrelated to code updates).

You can leave old published copies in Drive indefinitely (they cost nothing and don't need to be deleted) or trash them — nothing references them once the website link is updated.

## Manual Version Updates

If you need to manually set a specific version:

```bash
npm run version:update 2.7.0
```

The script updates all files automatically and prints a summary. Re-run it with the current version if files ever drift out of sync.

## File Structure

```
scripts/
└── update-version.js    # Version update automation

src/
├── config.js            # VERSION constant (source of truth)
├── colleges.js           # showVersion() function
├── scorecard.js         # User-Agent with version
└── *.js                 # All files have @version headers
```

## Troubleshooting

**Q: Version script fails with "file not found"**
A: Ensure you're in the project root directory.

**Q: Version not showing in Google Sheets**
A: Clear Apps Script cache and refresh the sheet.

**Q: Versions out of sync between files**
A: Run `npm run version:update <current-version>` to resync all files.

**Q: I updated the published spreadsheet but the website still links to the old one**
A: The website (`docs/index.html`, `docs/features.html`, `docs/getting-started.html`) is the only source of truth for the published ID — check those 3 files were updated and pushed.
