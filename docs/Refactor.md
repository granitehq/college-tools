

2) Config & secrets

Settings sheet (optional) for user-tweakable options (e.g., default state filter for searches, batch delay ms, region scheme).

Keep Weights sheet (already done).

API key: migrate from a visible sheet to PropertiesService with a one-time migration function (setApiKey() prompts + stores). PropertiesService is the standard for script-level secrets; consider Secret Manager later if you publish broadly. 


4) Performance & safety

Batch Range I/O: prefer getValues()/setValues() on blocks over per-cell calls; compute writes then commit once per row or chunk.

Header map once per run; pass indexes around; avoid autoResizeColumn except during setup.

LockService only if you later add triggers/parallel runs.

Validation/formatting remain idempotent functions (safe to re-run).




Lightweight tests:

A Tests sheet + “Run smoke tests” command (fills a known college, asserts fields not blank).

Consider QUnitGS or simple assertion helpers; full frameworks are optional.

7) Manifest & scopes

Pin scopes in appsscript.json (no broad https://www.googleapis.com/auth/script.external_request beyond what’s needed). Document why each scope exists. Keep the runtime as V8. 


8) Migration plan (no breakage)


Phase 3 – Config & secrets

Add Settings sheet (optional) + Script Properties migration for API key (still read ScorecardAPIKey!A1 as fallback to avoid surprises).

Phase 5 – I/O batching

Convert per-cell writes into batched writes in Colleges fill and batch fill.

Phase 6 – Testing & clasp

Initialize clasp, pin manifest, add README with commands. Optional TS conversion.

