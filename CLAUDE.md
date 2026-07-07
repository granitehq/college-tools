# CLAUDE.md

Shared guidance for AI agents in this repo. `AGENTS.md` is the canonical source;
keep this file aligned with it when durable project rules change.

## Project Snapshot

`college-tools` is a Google Apps Script V8 project for a Google Sheets college
research and application tracker. Source lives in `src/`, tests in `test/`,
helper scripts in `scripts/`, static website files in `website/`, and project docs
in `project-docs/`.

Apps Script modules use the global namespace/IIFE pattern:

```js
var CollegeTools = CollegeTools || {};
CollegeTools.ModuleName = (function() {
  return {};
})();
```

Global Sheets menu adapters live in `src/menu.js` and delegate into namespaced
modules.

## Critical Sheet Rules

- `Colleges`: headers on row 2, data starts on row 3.
- Tracker/helper sheets: headers on row 1, data starts on row 2.
- `CollegeTools.Utils.colIndex()` reads row 1 only. Do not use it for
  `Colleges`.
- Prefer `CollegeTools.Schema` helpers for new sheet-aware code.

## Critical API Rule

College Scorecard row-fill code uses flattened keys:

```js
r['school.city']
r['latest.admissions.admission_rate.overall']
```

Do not switch `src/colleges.js` to nested object access unless refactoring the
entire data path.

## Current Modules To Know

- `config`, `schema`, `formulas`, `menu`, `utils`
- `scorecard`, `colleges`, `trackers`, `formatting`
- `scoring`, `lookup`, `setup`, `financial`, `admissions`, `dashboard`
- `instructions`, `registration`

`src/registration.js`, `scripts/registry-webapp.js`, and
`scripts/push-updates.js` support optional direct-push updates. The registry is
low-trust telemetry, not a strong security boundary.

## Preservation Rules

`fillCollegeRowCore()` performs a batched row refresh. It preserves user-owned
rating cells, formula-owned cells, and user notes while refreshing API-owned
fields. Be careful with ownership lists, default row arrays, and note-stamp
logic.

Setup, repair, formatting, dashboard, and tracker paths can touch broad ranges.
Make narrow edits and add focused regression tests for preservation-sensitive
changes.

## Commands

- `npm test` - run the Node regression harness.
- `npm run check` - lint with zero warnings, then run tests.
- `npm run push` - run checks, then `npx clasp push`.
- `npm run build` - stamp website git hashes only; no compilation.
- `npm run dev` - serve `website/` locally.
- `npm run release:prepare` - checks then patch-version update.
- `npm run release:clasp` - checks, clasp push, Apps Script version.
- `npm run release:promote -- <sheet-id>` - update website template link.
- `npm run push:updates` - direct-push update utility.

Node requirement is `>=24.0.0`.

## Testing Limits

The test harness mocks Apps Script globals. It catches wiring, schema, formula,
registration, push-script, and regression issues, but it does not prove live
spreadsheet UI, rendered formulas, OAuth, or live API behavior. Meaningful
setup/repair/formula/deploy changes still need a copied-sheet smoke test.

## Branch And Release Flow

Default flow:

1. Start from latest `development`.
2. Create a feature branch off `development`.
3. Commit on the feature branch.
4. Merge the feature branch back to `development`.
5. Merge `development` to `main`.
6. Version and deploy from `main`.

Do not commit directly to `main` without an explicit user override for that
specific change. Reconcile any approved hotfix back to `development`.

## Current Docs

- Canonical backlog: `project-docs/backlog.md`.
- Release/versioning: `project-docs/version-management.md`.
- Direct-push runbooks:
  - `project-docs/direct-push-registry-provisioning.md`
  - `project-docs/direct-push-release-workflow.md`
- Archived planning/review docs: `project-docs/archive/`.

## Working Rules

- Trust current source over older prose.
- Verify row conventions before lookups/formulas.
- Preserve flattened Scorecard keys.
- Preserve user data unless the requested migration is explicitly destructive.
- Keep setup/formatting/tracker/dashboard edits surgical.
- Add or update focused tests for behavior changes.
- For docs-only changes, run `git diff --check`; for code changes, run the
  relevant tests or `npm run check`.
