<div align="center">

# 🎓 College Tools

**A Google Sheets workbook that turns the college search into a research database, a shared task plan, and an affordability model — powered by the U.S. Department of Education's College Scorecard API.**

[![Version](https://img.shields.io/badge/version-3.0.6-blue.svg)](https://github.com/granitehq/college-tools/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Google%20Apps%20Script%20V8-4285F4.svg)](https://developers.google.com/apps-script)
[![Node](https://img.shields.io/badge/node-%3E%3D24.19-339933.svg)](https://nodejs.org)
[![Data](https://img.shields.io/badge/data-College%20Scorecard-006400.svg)](https://collegescorecard.ed.gov/data/)

[Get the Template](https://college-tools.granite-hq.com/getting-started) · [Features](https://college-tools.granite-hq.com/features) · [Report an Issue](https://github.com/granitehq/college-tools/issues)

</div>

> **Built for families, not for spreadsheets experts.** Copy one template, paste an API key, and type college names. Everything else — official data, deadlines, cost math, and a week-by-week task plan — generates itself.

* * *

## 📚 Overview

Choosing a college means juggling official statistics, dozens of deadlines, financial aid paperwork, campus visits, and a moving list of who-owes-what between a student and their family. That work usually ends up scattered across browser tabs, sticky notes, and half-finished spreadsheets.

College Tools puts all of it into one Google Sheet:

| The problem | What College Tools does |
| --- | --- |
| Official college data lives in a dozen places | Pulls admissions, cost, outcomes, and test-score data straight from the College Scorecard API |
| "Which school is actually the best fit?" | Weighted scoring across eight family-defined criteria, plus an Admission Fit calculation |
| "Can we afford it?" | Net price, applicable tuition, four-year burden, and travel cost modeling per school |
| "What's due next, and whose job is it?" | An adaptive task plan built from 109 templates across 15 workstreams, assigned by owner and due date |
| Deadlines scattered across portals | Tracker sheets for timeline, status, aid, scholarships, visits, and recruiting |

* * *

## ⭐ Features

### 🏛️ College Research

- **One-keystroke data fill** — type a college name, run *Fill current row*, and 20 official data fields populate from the Scorecard API
- **Smart name matching** — fuzzy search with fallback strategies, optional `, ST` state filtering, and a dedicated Lookup sheet
- **Resilient API client** — retry with exponential backoff on `5xx`/`429`, response caching, and execution-budget guards for large batches
- **Preservation-first refresh** — re-filling a row refreshes API-owned fields while protecting your ratings, formulas, and notes

### ✅ Adaptive Task Management

The headline capability. Task management reads the colleges and deadlines already in your workbook and generates one deadline-aware roadmap.

- **109 task templates across 15 workstreams** — strategy, student foundation, college list, financial aid, scholarships, testing, recommendations, Common App, essays, athletic recruiting, visits/interviews, portfolio/audition, submission, decisions, and project control
- **Optional modules** — Testing, CSS Profile, Athletic Recruiting, Visits, Interviews, and Portfolio/Audition tasks appear only when a family enables them
- **Real scheduling** — tasks anchor to each college's actual deadlines, resolve dependencies, adapt when you start late, and roll up into planned weeks
- **Ownership and effort** — Student / Parent / Shared / Counselor roles with custom owners, a parent effort multiplier, and optional weekly hour thresholds
- **Preview before you commit** — *Preview Task Plan Changes* reports adds, updates, reassignments, reschedules, and archives without touching the workbook
- **Evidence-based completion** — reliable tracker evidence auto-completes tasks; ambiguous evidence asks for manual confirmation and never silently overwrites your correction
- **Regeneration is safe** — completed tasks, notes, locked dates, locked owners, and hand-written custom tasks survive every regeneration
- **This Week** — a generated read-only view of current actions, with owner and college cuts and a rolling 90-day horizon

### 💰 Financial Intelligence

- **Personal Profile** with named ranges (`SAT_Score`, `ACT_Score`, `GPA`, `Family_Income`, `EFC`, `State_Residency`) that drive formulas workbook-wide
- **Applicable tuition** resolved automatically from in-state vs. out-of-state residency
- **Financial safety analysis** with four-year burden calculations and net-price comparison
- **Aid requirement tracking** — FAFSA, CSS Profile, IDOC, and verification status as three-state fields
- **Merit aid likelihood** estimated from academic fit against each school's profile

### 🧭 Trackers & Planning

- **Application Timeline** — ED/ED2/EA/REA/RD types, merit and honors deadlines, test score and transcript dates, recommendation deadlines
- **Application Status Tracker** — documents sent, submission dates, decisions, and enrollment choice
- **Financial Aid Tracker** and **Scholarship Tracker** — deadlines, award status, and amounts that feed the dashboard
- **Travel Planner** — haversine distance from home, drive/fly mode inference, per-trip and annual travel cost, refreshed on profile edits
- **Campus Visit Tracker** with its own visit scoring
- **Recruiting Tracker** — one row per coach or contact, created only for athletic recruiting families

### 📊 Dashboard

A generated command center with 📈 Key Statistics, 💰 Cost Analysis, 🏆 Top Performers, 🎓 Scholarship Summary, application list balance, decision outcomes, accepted offer comparison, and a What's Due Next feed with overdue and due-soon warnings.

### 🛠️ Maintenance & Repair

Every generated structure is re-runnable. *Complete Setup*, *Repair Entire Workbook*, *Repair Validations & Dropdowns*, *Repair College Sync Across Tabs*, and *Repair Task Management* rebuild formulas, dropdowns, and cross-tab links while preserving user-entered data. *Optimize Performance* trims unused rows; *Register for Updates* opts a copy into direct-push updates.

* * *

## 🚀 Quick Start

### Prerequisites

| Requirement | Notes |
| --- | --- |
| Google Account | Any account with Google Sheets access |
| College Scorecard API key | Free from [api.data.gov](https://api.data.gov/signup/) |
| Node.js `>=24.19` + npm | Contributors only — end users need nothing installed |

### For Students & Families

**1. Copy the template**

Grab the current template from [college-tools.granite-hq.com/getting-started](https://college-tools.granite-hq.com/getting-started) and copy it to your Google Drive. It arrives pre-configured — every sheet, formula, and dropdown is already in place.

**2. Run Quick Start**

`College Tools → 🚀 Quick Start (API Key Check)` — checks your setup and points you at the next step. Takes under five seconds.

**3. Add your API key**

Get a free key at [api.data.gov/signup](https://api.data.gov/signup/), paste it into cell **A1** of the `ScorecardAPIKey` sheet, then run Quick Start again to confirm.

**4. Fill in your Personal Profile**

Test scores, GPA, family income, EFC, and home state. These drive admission fit, affordability, and travel estimates everywhere else.

**5. Add colleges**

Type names into column A of `Colleges`, then `College Tools → 🎓 For Students & Parents → Fill current row` (or *Fill selected rows* for a batch).

**6. Generate your task plan**

`College Tools → 🎓 For Students & Parents → ✅ Task Management`:

```
Setup Task Management        → creates Task Settings, Tasks, This Week, and the template catalog
Preview Task Plan Changes    → read-only report of what would change
Generate / Regenerate Plan   → writes the canonical Tasks sheet
Refresh This Week            → rebuilds current actions and owner/college views
Sync Completion From Trackers→ closes tasks that tracker evidence confirms
```

> **Tip:** The first plan is deliberately unconstrained. Look at the real effort totals before you set any weekly hour thresholds.

* * *

## 🧰 Tech Stack

| Category | Technology |
| --- | --- |
| Runtime | Google Apps Script (V8) |
| Language | JavaScript ES5-compatible, namespaced IIFE modules |
| Host | Google Sheets |
| Data source | [U.S. Dept. of Education College Scorecard API](https://collegescorecard.ed.gov/data/) |
| Deployment | [`clasp`](https://github.com/google/clasp) → Apps Script project → template promotion |
| Linting | ESLint 10 + `@stylistic` + `eslint-plugin-jsdoc`, zero-warning gate |
| Testing | Node regression harness with mocked Apps Script globals (27 suites) |
| Website | Static HTML/CSS on Cloudflare Pages (`website/`) |
| Update channel | Optional registry Web App + direct-push script (`scripts/`) |

* * *

## 📁 Project Structure

```
college-tools/
├── src/                      # Apps Script source (22 modules, one shared namespace)
│   ├── config.js             # Sheet names, tab order, API fields, headers, task settings
│   ├── schema.js             # Canonical sheet metadata, header rows, ownership groups
│   ├── menu.js               # onOpen() and global menu adapters
│   ├── utils.js              # Shared helpers, sanitization, row-1 lookup
│   ├── formulas.js           # Pure formula builders and range helpers
│   ├── execution-budget.js   # Keeps long batches under Apps Script time limits
│   │
│   ├── scorecard.js          # API client: retry/backoff, cache, key lookup
│   ├── colleges.js           # Row fill, preservation logic, debug/version helpers
│   ├── lookup.js             # College search dialog and Lookup sheet
│   │
│   ├── task-catalog.js       # 109 validated task templates, modules, scopes
│   ├── task-planner.js       # Pure planning engine: scheduling, dependencies, views
│   ├── task-management.js    # Sheet integration: setup, preview, generate, repair
│   │
│   ├── trackers.js           # Tracker creation and college sync/repair
│   ├── travel.js             # Distance, mode, and travel-cost estimation
│   ├── financial.js          # Personal Profile, named ranges, aid formulas
│   ├── admissions.js         # Admission Fit formulas and formatting
│   ├── scoring.js            # Weights sheet and Weighted Score formulas
│   ├── dashboard.js          # Dashboard sections, due-next and decision tables
│   ├── formatting.js         # Number formats, dropdowns, formatting repair
│   ├── setup.js              # Complete setup, quick start, repair, optimize
│   ├── instructions.js       # Generated in-sheet user guide
│   └── registration.js       # Optional copy registration for direct-push updates
│
├── test/                     # Node regression harness (mocked Apps Script globals)
├── scripts/                  # Version, build, promote, push-updates, registry Web App
├── website/                  # Static public site
└── project-docs/             # Backlog, runbooks, release and verification docs
```

**Module pattern** — every file contributes to one shared global namespace:

```js
var CollegeTools = CollegeTools || {};
CollegeTools.ModuleName = (function() {
  'use strict';
  return { /* public API */ };
})();
```

* * *

## 🧑‍💻 Development

### Setup

```bash
git clone https://github.com/granitehq/college-tools.git
cd college-tools
npm install

npm install -g @google/clasp
npx clasp login
```

### Commands

| Command | What it does |
| --- | --- |
| `npm test` | Run the full Node regression harness |
| `npm run check` | Zero-warning lint, then tests — the local quality gate |
| `npm run lint` / `lint:fix` / `lint:check` | Check, auto-fix, or zero-tolerance lint |
| `npm run push` | `npm run check`, then `npx clasp push` |
| `npm run pull` | `npx clasp pull` |
| `npm run build` | Stamp git hashes into the website footer (no compilation) |
| `npm run dev` | Build and serve `website/` locally on `:8080` |
| `npm run version:show` / `patch` / `minor` / `major` | Read or bump the version across `package.json`, `@version` headers, and `Config.VERSION` |
| `npm run release:prepare` | Checks, then patch bump |
| `npm run release:tag` | Tag `v<package.json version>` |
| `npm run release:clasp` | Checks, clasp push, Apps Script version |
| `npm run release:promote -- <sheet-id>` | Update the published template link across the website |
| `npm run push:updates` | Direct-push update utility for registered copies |

### Focused Test Suites

```bash
npm run test:regression   # Broad behavior regressions
npm run test:tasks        # Task management and planning engine
npm run test:template     # Master template integrity
npm run test:repair       # Workbook repair paths
npm run test:schema       # Config/schema contracts
npm run test:menu         # Menu wiring
npm run test:validation   # Validation and dropdown coverage
npm run test:syntax       # Source syntax checks
```

> **⚠️ What tests can't prove.** The harness mocks Apps Script globals, so it catches wiring, schema, formula-text, registration, and regression issues — but not live spreadsheet UI, rendered formulas, OAuth, or real API behavior. Meaningful setup, repair, formula, or deploy changes still need a smoke test in a copied Google Sheet.

### Sheet Conventions

Two header conventions coexist, and mixing them is the main structural footgun in this codebase:

| Sheet | Header row | Data starts |
| --- | --- | --- |
| `Colleges` | Row 2 | Row 3 |
| All tracker and helper sheets | Row 1 | Row 2 |

`CollegeTools.Utils.colIndex()` reads **row 1 only** — never use it against `Colleges`. Prefer `CollegeTools.Schema` helpers for new sheet-aware code.

Scorecard responses are handled as **flattened keys** (`r['school.city']`, `r['latest.admissions.admission_rate.overall']`). Don't switch the row-fill path to nested access without refactoring the entire data path.

* * *

## 🌿 Branch & Release Flow

All new work starts from `development`, never `main`.

```bash
git checkout development
git pull origin development
git checkout -b feature/your-change
```

```
feature/your-change → development → main → version → deploy
```

1. Branch from latest `development`
2. Commit the work on the feature branch
3. Merge the feature branch back into `development`
4. Merge verified `development` into `main`
5. Version and deploy from `main`

Direct commits to `main` are reserved for rare, explicitly approved hotfixes — and those must be reconciled back into `development`.

### Releasing

```bash
git checkout main && git pull origin main
git merge development

npm run release:prepare              # checks + patch bump
git add -A
git commit -m "chore: release v3.0.7"
npm run release:tag
git push origin main --tags
npm run release:clasp                # clasp push + Apps Script version
```

Then make a Drive copy of the verified template and run:

```bash
npm run release:promote -- <new-sheet-id>
```

GitHub is the durable release record. `release:clasp` deploys to the template's Apps Script project — it does not touch the published spreadsheet or create a GitHub Release. See [`project-docs/version-management.md`](project-docs/version-management.md) for the full promotion steps.

* * *

## 🔒 Security & Privacy

- **Your key stays yours** — the API key lives in your own sheet, never in version control
- **No data collection** — all processing happens inside your Google Sheets copy
- **You own the data** — no external database, no accounts, no telemetry beyond optional update registration
- **Optional registration only** — the direct-push registry is low-trust update telemetry, not a security boundary, and is disabled by default in local builds
- **Open source** — MIT licensed, fully auditable

Details in [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md).

* * *

## 🤝 Contributing

1. Fork the repository
2. `git checkout development && git pull origin development`
3. `git checkout -b feature/amazing-feature`
4. Make the change, add focused tests, run `npm run check`
5. `git commit -m 'feat: add amazing feature'`
6. `git push origin feature/amazing-feature`
7. Open a Pull Request **targeting `development`**

Preservation-sensitive areas — row fill, setup, repair, formatting, trackers, dashboard — deserve narrow edits and focused regression tests. Agent-facing conventions live in [`AGENTS.md`](AGENTS.md).

* * *

## 📖 Documentation

| Document | Purpose |
| --- | --- |
| [`project-docs/plans/backlog.md`](project-docs/plans/backlog.md) | Canonical roadmap and backlog |
| [`project-docs/version-management.md`](project-docs/version-management.md) | Release and versioning mechanics |
| [`project-docs/direct-push-release-workflow.md`](project-docs/direct-push-release-workflow.md) | Direct-push release runbook |
| [`project-docs/direct-push-registry-provisioning.md`](project-docs/direct-push-registry-provisioning.md) | Registry provisioning runbook |
| [`AGENTS.md`](AGENTS.md) | Canonical guidance for coding agents |
| [`test/README.md`](test/README.md) | Test suite overview |

* * *

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/granitehq/college-tools/issues)
- **Security reports:** see [SECURITY.md](SECURITY.md)
- **In-sheet help:** `College Tools → 📖 Instructions & Help` generates a full guide inside your workbook

* * *

## 📄 License

MIT — see [LICENSE](LICENSE).

## 🙏 Acknowledgments

- **U.S. Department of Education** for the College Scorecard API
- **Google Apps Script** platform and community

<div align="center">

* * *

**Made with ❤️ to help students and families navigate college selection**

*College Tools is not affiliated with the U.S. Department of Education or Google.*

</div>
