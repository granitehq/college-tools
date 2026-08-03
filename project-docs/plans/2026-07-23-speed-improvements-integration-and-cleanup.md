# Speed Improvements: Test, Merge, and Branch Cleanup Runbook

**Written:** 2026-07-23, end of a coding session. Read the "Resume in a few days" box
first — it tells you exactly where things were left and what to do next.

---

## Resume in a few days — start here

You are mid-way through landing the `speed-improvements` branch. State as of 2026-07-23:

- Work happens in the worktree at `.claude/worktrees/speed-improvements` (branch
  `speed-improvements`). **Do not work in the main checkout for this** — switch
  into that worktree directory first:
  ```bash
  cd .claude/worktrees/speed-improvements
  git status   # should show 5 modified files, nothing else
  ```
- Those 5 files have **uncommitted** fixes from code review (sanitization bypass,
  prototype-unsafe object literals, and a 200→100 row-cap reduction across
  `trimAllSheets` and `applyColumnFormatsAndValidations_`). Nothing is committed yet.
- `npm run check` was green (61/61 tests + lint) as of the last edit.
- Next steps, in order: **[Step 1: Test](#step-1-test-the-changes)** →
  **[Step 2: Commit](#step-2-commit-on-speed-improvements)** →
  **[Step 3: Merge to development](#step-3-merge-speed-improvements--development)** →
  **[Step 4: Merge to main + release](#step-4-merge-development--main-and-release)**.
- Separately, there's a backlog of **other branches/worktrees** in this repo that
  are either already merged (safe to delete) or sitting unmerged with no active
  work (need your decision). See [Branch and Worktree Cleanup](#branch-and-worktree-cleanup).

---

## What changed in `speed-improvements`

Uncommitted, in the worktree:

1. `src/colleges.js` — `fillSelectedRows` now sanitizes college names
   (`CollegeTools.Utils.sanitizeCollegeName`) before the batched Scorecard fetch,
   matching what the serial fallback path already did.
2. `src/scorecard.js` — `fetchCollegeDataBatch`'s `seen` and `resultByName`
   dedup/lookup maps now use `Object.create(null)` instead of `{}`, so a college
   name that collides with an inherited `Object.prototype` property
   (`constructor`, `toString`, etc.) can't be silently dropped or corrupt lookups.
3. `src/formatting.js` — `applyColumnFormatsAndValidations_`'s row cap for
   format/validation writes dropped from 200 to 100 rows (realistic college
   counts are well under 100; this also fixes a latent gap where "Repair Entire
   Workbook" never trims rows first, so it could under-cover very large sheets).
4. `src/utils.js` — `trimAllSheets` now trims **every** sheet (Colleges,
   Financial Aid, Campus Visit, Application Timeline, Scholarship Tracker,
   Status Tracker) to a uniform 100-row cap instead of the old 200/100/150 mix.
5. `test/perf-batching-tests.js` — updated the dropout-height assertion from
   row 200 to row 100 to match.

Already committed on this branch (from earlier in the branch's history, before
this session — commit `9b3ad9e` "perf: accelerate Apps Script workflows" and
`7bec40b` "fix: repair batch fill and workbook sync"): the underlying batching
work (concurrent Scorecard fetches, batched tracker writes, header/format
caching). **These commits are already merged into `main`** via `development` —
see the branch-state table below. Only the 5-file diff above is new/unmerged.

---

## Step 1: Test the changes

Run from inside `.claude/worktrees/speed-improvements`.

### Automated (do this first, every time)

```bash
npm run check    # lint (zero warnings) + full Node test suite
```

Expect `61 passed, 0 failed` and a clean lint pass. If either fails, fix before
continuing — do not merge on a red `check`.

If you want to isolate the areas touched this session:

```bash
node test/perf-batching-tests.js
node test/scorecard-batch-tests.js
```

### Why automated isn't enough here

Per `CLAUDE.md`, the Node harness mocks Apps Script globals — it proves wiring
and regression safety, but **not** live Sheets UI, real `UrlFetchApp.fetchAll`
behavior, or actual row-count math against a live sheet. The row-cap change
(100 rows) and the batch-fetch sanitization change both need a live smoke test
before you trust them in production.

### Manual smoke test (do this before merging to `main`)

1. Open the **template** spreadsheet (the clasp-bound dev copy — script ID in
   `.clasp.json`; see `project-docs/version-management.md` if you need to find it).
2. From this worktree, push the branch's code to the template for testing:
   ```bash
   npx clasp push
   ```
   (Skip `npm run push`, which also runs `npm run check` against committed
   state and would push from the wrong directory context — just run `clasp
   push` directly from the worktree once `check` is already green.)
3. In the sheet: **College Tools menu → Repair Entire Workbook**, then confirm:
   - It completes without error on a sheet with a normal (<100) college count.
   - Dropdowns/validations still render on rows near the bottom of your test
     data (not just row 2).
   - No existing college rows, ratings, or notes were cleared or blanked.
4. Select 5–10 college rows with real/mixed-quality names (including at least
   one name with stray punctuation or extra whitespace) and run **Fill
   Selected Rows**. Confirm:
   - All selected rows get filled or get a clear "no match" note — nothing
     silently skipped without feedback.
   - Data returned looks sane for a sanitized query (i.e., fill still works
     for real college names).
5. Run **College Tools → Sheet Performance Optimization** (trim) on a copy
   that has extra blank rows below row 100, and confirm it trims to 100 without
   touching any row that has real data in it.
6. Only after all of the above look right, proceed to committing/merging.

---

## Step 2: Commit on `speed-improvements`

From `.claude/worktrees/speed-improvements`:

```bash
git add src/colleges.js src/formatting.js src/scorecard.js src/utils.js test/perf-batching-tests.js
git status   # confirm only these 5 files are staged
git commit -m "fix: sanitize batch fill names, harden batch dedup, cap rows at 100"
```

(Use specific file paths, not `git add -A` — avoids accidentally picking up
anything else that lands in that worktree later.)

---

## Step 3: Merge `speed-improvements` → `development`

Per `CLAUDE.md`'s branch flow: feature branches merge to `development`, then
`development` merges to `main`. Do this from the **main checkout**, not a
worktree (a worktree can't check out a branch that's already checked out
elsewhere — `development` is currently checked out in the
`development-integration` worktree, so use *that* worktree instead):

```bash
cd .claude/worktrees/development-integration
git fetch origin
git status                       # should be clean
git merge --no-ff speed-improvements
npm run check
git push origin development
```

If `npm run check` fails after the merge, fix forward on `development` (don't
just push a red build) — see [Rollback](#rollback-if-something-breaks) if you
need to back out instead.

---

## Step 4: Merge `development` → `main` and release

From the **main checkout** (`/home/scott/code/college-tools`, already on `main`):

```bash
cd /home/scott/code/college-tools
git fetch origin
git status                       # should be clean
git merge --no-ff development
npm run check
```

Then follow `project-docs/version-management.md`'s release workflow:

```bash
# 1. Version + tag
npm run release:prepare          # runs check, then bumps patch version
git add -A
git commit -m "chore: release v<version from previous command>"
npm run release:tag
git push origin main --tags

# 2. Deploy to the template's bound Apps Script project
npm run release:clasp
```

Then verify on the **template** spreadsheet (Setup/Repair run cleanly) before
promoting to a new published copy — see "Promote the template to a new
published copy" in `project-docs/version-management.md` for that last step.
**Do not promote to a new published copy same-day as the merge** — let the
template soak at least one real usage session first, given this touches
row-count assumptions across every sheet.

---

## Branch and Worktree Cleanup

Snapshot taken 2026-07-23. Re-run these commands before acting — branches move:

```bash
git branch --merged main      # safe-to-delete candidates
git branch --no-merged main   # needs a decision
git worktree list
```

### Already merged into both `development` and `main` — safe to delete

These branches' commits are fully contained in `main`. Their local worktrees
(if any) are just stale checkouts of already-landed work.

| Branch | Worktree | Notes |
|---|---|---|
| `feat/appscript-refactor-registry` | `.claude/worktrees/appscript-refactor-registry` | clean |
| `fix/hidden-college-id` | `.claude/worktrees/hidden-college-id` | clean |
| `worktree-stable-college-identity` | `.claude/worktrees/stable-college-identity` | has an uncommitted `package-lock.json` diff (4 lines) — check it's just a stray `npm install` before deleting; if so, `git checkout -- package-lock.json` there first |
| `feat/appscript-refactor-foundation` | `~/.config/superpowers/worktrees/college-tools/feat-appscript-refactor-foundation` (outside this repo tree) | has a **staged rename** and an **untracked file** (`test/setup-registry-tests.js`) not present anywhere else — diff it against `main`'s copy of that test file before discarding, it may contain unmerged test coverage |
| `codex/implement-direct-push-update-workflow` | none | |
| `fix/empty-template-remove-region` | none | |
| `perf/repair-sync-bulk-writes` | none | |
| `refactor/rename-docs-website` | none | |

Once you've confirmed a branch's worktree has nothing worth keeping:

```bash
git worktree remove .claude/worktrees/<name>     # or the external path, for the foundation one
git branch -d <branch-name>                      # -d refuses if unmerged; that's the safety check
git push origin --delete <branch-name>           # only if it exists on origin
```

`speed-improvements` itself joins this "safe to delete" list only **after**
Steps 2–4 above are done (committed, merged to `development`, merged to `main`).

`development-integration` worktree tracks the `development` branch itself —
keep it, don't delete it.

### Not merged anywhere — need your decision, not auto-cleanup

These have real, unique commits not present in `development` or `main`, and no
active worktree, meaning nobody was iterating on them recently:

| Branch | Tip commit | What it contains |
|---|---|---|
| `fix/college-fill-debug-region` | `57836be` "Fix college fill debug and region repair" | `src/colleges.js` (11 lines) + new regression test |
| `worktree-agent-a6d70b10ef20c9533` | `e31b8bd` "feat: add College ID schema metadata for Colleges and trackers" | `src/config.js`, `src/schema.js` + 2 test files |

Before deciding, check whether these were superseded by later work (the
College ID system already landed via `fix/hidden-college-id` and the
`worktree-stable-college-identity` plan — `worktree-agent-a6d70b10ef20c9533`
may be an earlier, now-redundant attempt at the same thing):

```bash
git diff main...fix/college-fill-debug-region
git diff main...worktree-agent-a6d70b10ef20c9533
```

If either still adds something real: rebase it onto current `development`,
retest, and merge it through the normal flow. If superseded/abandoned:
`git branch -D <name>` (capital `-D`, since `-d` will refuse — that refusal is
itself the confirmation these are unmerged, so don't skip the diff check
above just because `-d` complains).

---

## Rollback if something breaks

Pick the narrowest option that fixes the problem.

### A. Still on `speed-improvements`, before merging anywhere

```bash
cd .claude/worktrees/speed-improvements
git status
git restore --staged --worktree src/colleges.js src/formatting.js src/scorecard.js src/utils.js test/perf-batching-tests.js
```

This throws away the uncommitted fixes and returns you to the branch's
pre-session state (`7bec40b`). Nothing else is affected.

### B. Already committed on `speed-improvements`, not yet merged

```bash
cd .claude/worktrees/speed-improvements
git log --oneline -3            # confirm the commit to undo is on top
git reset --hard HEAD~1          # only if nothing after it depends on it
```

### C. Merged into `development`, not yet into `main`

```bash
cd .claude/worktrees/development-integration
git log --oneline -5             # find the merge commit hash
git revert -m 1 <merge-commit-sha>
npm run check
git push origin development
```

Use `revert`, not `reset --hard` + force-push — `development` is a shared
branch other worktrees track.

### D. Merged into `main`, not yet deployed via clasp

Same pattern as C, on the main checkout:

```bash
cd /home/scott/code/college-tools
git log --oneline -5
git revert -m 1 <merge-commit-sha>
npm run check
git push origin main
```

### E. Already deployed to the template via `clasp push` / `release:clasp`

Apps Script keeps versioned deployments — you don't need to touch git for an
emergency rollback of the *template*:

1. Open the template's Apps Script project (Extensions → Apps Script from the
   template spreadsheet).
2. **Deploy → Manage deployments** (or **Project versions**, depending on
   Apps Script UI at the time) → select the last known-good version → deploy
   that version.
3. Then fix forward in git per option C/D above so the next `clasp push`
   doesn't reintroduce the bug.

### F. Already promoted to a new published copy

Per `project-docs/version-management.md`, published copies are frozen at copy
time with no auto-update — a bad promoted copy does **not** retroactively
break users who already copied an earlier version. To roll back the "current"
offering:

1. Re-promote the **previous known-good** published copy's file ID:
   ```bash
   npm run release:promote -- <previous-good-sheet-id>
   ```
   (Get that ID from `git log -p -- website/getting-started.html` if you
   didn't save it separately.)
2. Commit and push — this repoints the website's "Copy Template" link back.
3. Fix the underlying bug in git, re-verify, and re-promote forward when ready.

---

## Quick reference: where things live

| Thing | Location |
|---|---|
| This branch's worktree | `.claude/worktrees/speed-improvements` |
| `development` branch's worktree | `.claude/worktrees/development-integration` |
| Main checkout | `/home/scott/code/college-tools` (repo root) |
| Test/lint | `npm run check` (from any worktree) |
| Release docs | `project-docs/version-management.md` |
| Direct-push (unrelated escape hatch, not used above) | `project-docs/direct-push-release-workflow.md` |
