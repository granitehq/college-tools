# GEMINI.md

Shared guidance for AI agents in this repo. `AGENTS.md` is the canonical source;
keep this file aligned with it when durable project rules change.

## Project Overview

`college-tools` is a Google Apps Script V8 project for a Google Sheets based
college research and application tracker. It uses the U.S. Department of
Education College Scorecard API to populate a `Colleges` sheet and maintain
tracker sheets, scoring, financial analysis, dashboard views, instructions,
copy registration, and optional direct-push update workflows.

Key directories:

- `src/` - Apps Script source.
- `test/` - Node regression harness with mocked Apps Script globals.
- `scripts/` - local release, website, registry, and push-update helpers.
- `docs/` - static website.
- `project-docs/` - runbooks and backlog; filenames are lowercase kebab-case.

Source modules use the `CollegeTools` namespace/IIFE pattern. Google Sheets menu
entry points live as globals in `src/menu.js`.

## Core Architecture Rules

- Runtime: Google Apps Script V8.
- Node requirement for local tooling: `>=24.0.0`.
- `Colleges` headers are on row 2 and data starts on row 3.
- Tracker/helper sheets use row-1 headers and row-2 data.
- `CollegeTools.Utils.colIndex()` reads row 1 only; do not use it for
  `Colleges`.
- Prefer `CollegeTools.Schema` helpers for new sheet-aware code.
- Scorecard responses in `src/colleges.js` are flattened keys such as
  `r['school.city']`; do not assume nested objects.

## Current Module Map

- `config`, `schema`, `formulas`, `menu`, `utils`
- `scorecard`, `colleges`, `trackers`, `formatting`
- `scoring`, `lookup`, `setup`, `financial`, `admissions`, `dashboard`
- `instructions`, `registration`

`src/registration.js`, `scripts/registry-webapp.js`, and
`scripts/push-updates.js` implement optional direct-push registration/update
support. The registry is low-trust telemetry, not strong authentication.

## Development Commands

- `npm install` - install dependencies.
- `npm test` - run the full Node harness.
- `npm run check` - lint with zero warnings and run tests.
- `npm run lint`, `npm run lint:fix`, `npm run lint:check` - lint tasks.
- `npm run push` - run checks and push Apps Script via clasp.
- `npm run pull` - pull Apps Script via clasp.
- `npm run build` - stamp static website git hashes only.
- `npm run dev` - serve `docs/` locally.
- `npm run release:prepare` - checks then patch-version update.
- `npm run release:tag` - create `v<package.json version>` tag.
- `npm run release:clasp` - checks, clasp push, Apps Script version.
- `npm run release:promote -- <sheet-id>` - update website template links.
- `npm run push:updates` - direct-push update utility.

## Testing Limits

The local harness is useful for wiring, schema, formula text, registration,
push scripts, and regression coverage. It does not prove live spreadsheet UI,
rendered formulas, OAuth, or live Scorecard API behavior. Setup/repair/formula
and deployment changes need manual smoke testing in a copied Google Sheet.

## Branch And Release Flow

Default flow unless the user explicitly overrides it:

1. Start from latest `development`.
2. Create a feature branch off `development`.
3. Commit on the feature branch.
4. Merge the feature branch into `development`.
5. Merge `development` into `main`.
6. Version and deploy from `main`.

Do not commit directly to `main` without an explicit override for that specific
change. Approved direct hotfixes must be reconciled back into `development`.

## Current Docs

- Canonical backlog: `project-docs/backlog.md`.
- Version/release process: `project-docs/version-management.md`.
- Direct-push runbooks:
  - `project-docs/direct-push-registry-provisioning.md`
  - `project-docs/direct-push-release-workflow.md`
- Archived planning/review docs: `project-docs/archive/`.

## Working Rules

- Trust current source over stale prose.
- Preserve row-header conventions and flattened Scorecard field access.
- Preserve user-owned cells, formula cells, notes, tracker details, and named
  ranges unless a requested migration is explicitly destructive.
- Keep setup, formatting, tracker repair, and dashboard edits small and
  preservation-focused.
- Add or update focused tests for behavior changes.
- For docs-only changes, run `git diff --check`; for code changes, run relevant
  tests or `npm run check`.
