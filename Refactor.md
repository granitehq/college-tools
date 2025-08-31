Proposed architecture
1) Modules (files) & namespaces

Apps Script supports multiple files under one project; with V8, use namespaces (IIFE/objects) to avoid global sprawl. 
Google for Developers
+1
ramblings.mcpher.com

Files (new project structure):

menu.js – builds menus, wires entry points.

config.js – default settings, constants, header keys, region map.

utils.js – logging/toast, header mapping, formatting helpers, retries/backoff.

scorecard.js – API client (UrlFetch, field selection, search helper).

colleges.js – row mapping, single fill, batch fill, region fill.

trackers.js – create/update Financial Aid, Visit, Timeline, Scholarships.

formatting.js – formats/dropdowns (idempotent).

scoring.js – Weights sheet + score formulas.

lookup.js – “Search College Names,” Lookup sheet utilities.

All functions sit under a single root namespace to avoid collisions:


Benefits: predictable API surface; you export only what the menu calls; internals stay private. Examples and discussion on namespaces and multi-file reliability with V8: 
ramblings.mcpher.com
+1

2) Config & secrets

Settings sheet (optional) for user-tweakable options (e.g., default state filter for searches, batch delay ms, region scheme).

Keep Weights sheet (already done).

API key: migrate from a visible sheet to PropertiesService with a one-time migration function (setApiKey() prompts + stores). PropertiesService is the standard for script-level secrets; consider Secret Manager later if you publish broadly. 
Google for Developers
Stack Overflow
dataful.tech

3) API client hardening

Centralize UrlFetch in Scorecard.fetch* with:

Retries with exponential backoff for 5xx/429.

Timeouts and per-call field sets.

CacheService for short-term caching of search results (e.g., 10 minutes) to save quota.

Respect quotas & execution limits (6-minute cap; UrlFetch daily limits). Batch operations should pace requests (sleep) and be resumable. 
Google for Developers
Google Groups
Stack Overflow

4) Performance & safety

Batch Range I/O: prefer getValues()/setValues() on blocks over per-cell calls; compute writes then commit once per row or chunk.

Header map once per run; pass indexes around; avoid autoResizeColumn except during setup.

LockService only if you later add triggers/parallel runs.

Validation/formatting remain idempotent functions (safe to re-run).

Guidance on structuring and modern JS in Apps Script V8: 
Medium

Documentation & naming

Drop “KISS” from exported names.

Add JSDoc for every exported function: purpose, inputs, outputs, side-effects.

Version banner at top of each file; Config.VERSION echoed in “Show version.”


Testing & version control

Adopt clasp to pull the project locally, commit to Git, and (optionally) use TypeScript + ESLint (apps-script-type definitions help autocompletion). Push from local → GAS; treat the online editor as read-only. 
Google for Developers
Stack Overflow

Lightweight tests:

A Tests sheet + “Run smoke tests” command (fills a known college, asserts fields not blank).

Consider QUnitGS or simple assertion helpers; full frameworks are optional.

7) Manifest & scopes

Pin scopes in appsscript.json (no broad https://www.googleapis.com/auth/script.external_request beyond what’s needed). Document why each scope exists. Keep the runtime as V8. 
Google for Developers

8) Migration plan (no breakage)

Phase 0 – Labels & docs

Rename menu labels (“Fill current row” stays; remove KISS in code).

Add JSDoc headers; keep function bodies unchanged.

Phase 1 – Namespace shim

Wrap current code into CollegeTools.* with minimal changes; keep current menu calls by forwarding to namespace functions (adapters). No logic change.

Phase 2 – File split

Move code into the file layout above. Validate that menu items still call the same exports.

Phase 3 – Config & secrets

Add Settings sheet (optional) + Script Properties migration for API key (still read ScorecardAPIKey!A1 as fallback to avoid surprises).

Phase 4 – API client

Move all fetch logic into Scorecard; add retry/backoff + small cache.

Phase 5 – I/O batching

Convert per-cell writes into batched writes in Colleges fill and batch fill.

Phase 6 – Testing & clasp

Initialize clasp, pin manifest, add README with commands. Optional TS conversion.

Each phase is standalone; you can stop after any phase and everything still works.