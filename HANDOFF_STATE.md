# Publication package checkpoint — 2026-09-23

Continue this existing checkout. Do not extract the original v0.1 ZIP, create a replacement project or reinterpret a planned task as a completed result. The user now explicitly requests the complete final source ZIP for GitHub, retaining the existing project. That permission supersedes earlier instructions not to package. The source package is not a claim that all hosted-demo acceptance gates passed. No GitHub write or public deployment has been made.

## Current verification status

This checkpoint supersedes earlier counts and packaging instructions. The publication pass rechecked the actual persisted code and reports, then repeated the tests below. Machine-readable results are in `docs/validation/PUBLICATION_CHECKS.json`.

| Check repeated for this package | Actual result |
| --- | --- |
| Python | **81 passed in 16.65 s**; two upstream Starlette/httpx/AnyIO deprecation warnings |
| Ruff | Lint and format passed; 74 files |
| Frontend Node tests | **36 passed in 667.320601 ms** |
| TypeScript / ESLint / Prettier | Passed; ESLint zero warnings |
| Next 15.5.25 production build | Passed; main route **56 kB**, first load **159 kB** |
| Production Next → FastAPI HTTP | **13 groups passed**, empty private cache, zero provider requests |
| Production launcher lifecycle | **3 groups passed**: real catalog/SIGTERM cleanup and occupied API/web ports |
| Independent published analysis | **1,499 hashes; 493 exposures; 10,353 rates; 10,353 percentiles; 76,960 similarity-reference cells; 9,620 pairs; 641 Fit explanations**, all passed |
| Independent private source audit | **104 source hashes; 61 Parquet hashes; 187,924 events; zero player-minute mismatches**, passed |
| Public-file scan | **1,670 project files**, zero findings; archive has **1,671 files** including its checksum manifest |
| Extracted ZIP | All source bytes match the workspace; every ZIP CRC passes; extracted scan has zero findings; independent analysis audit passes; **81 Python tests pass in 13.59 s** using the existing locked environment |

The completed earlier clean-Git-clone rehearsal remains present and valid for the same application source: 12 recorded stages, fresh dependencies/README `--install`, all tests/build, 13 HTTP groups and production lifecycle. It was **not rerun as a fresh installation in this packaging pass**. Its actual results were 81 Python tests (14.37 s), 36 Node tests and a passed build; do not confuse those durations with the current run. Earlier failed/interrupted rehearsals are not counted. The previous production-dependency audit reported zero known frontend vulnerabilities; this is not a universal security guarantee.

The raw audit also reconciled total exposure **112,522.16475000011** and independently counted Yamal 18 shots/1 goal/4 assists, Fabián 17/2/2, Rodri 5/1/0 and Kurtič 0/0/0. No football observations or published calculations were changed for this package.

The final source ZIP uses the Git-publication inventory, verifies every included file against the existing workspace, includes a per-file SHA256 manifest, and excludes private inputs/dependencies/builds. Final assembly rechecks every byte after these documentation-result updates. The extractions contain no original provider cache, venv, Node dependencies or builds. `PACKAGE_CONTENTS.sha256` lists all 1,670 source files; it does not hash itself. The extracted test run uses existing installed dependencies and is not labelled as a fresh install. Original workspace files and private cache remain intact. The package folder name is `football-recruitment-platform`; this is an archive wrapper, not a reconstructed codebase.

No external GitHub Actions run, Docker execution, public URL, Windows lifecycle or mobile browser run is claimed.

## What is implemented end to end

Real pinned event inputs → local cache → canonical Polars/Parquet → participation intervals → player features/per90 → fixed cohorts/percentiles → FastAPI → Next.js real search/profiles/similarity. The repository also includes validated derived analysis so normal demonstration requires no provider download/key/private cache.

Existing workflows: advanced search; source-aware player profiles and metric definitions; explained similarity; eleven curated role/archetype briefs; weighted Fit with hard constraints; comparison up to three players; device-local watchlists/notes/status; formula-safe CSV export; coarse event zones; observed national-team depth and departure plans; CSV/XLSX My Club preview/mapping/quality/rates/depth; canonical-round-trip-only external benchmarks; five persona entry points, EN/ES/FR and three themes. No learned role discovery, current club/market intelligence, authentication or Ask Football assistant is claimed.

Native production HTTP tests exercise the real Python implementations, including interactive endpoints. The browser preview in this environment has saved real analysis but cannot start Python outside its permitted checkout boundary. Browser custom Fit/upload validation is therefore still a separate gate, not satisfied by HTTP tests.

## Changes in this showcase continuation

- Added a real Spain My Club demo: 25 catalog players go through the existing CSV exporter, ordinary upload preview, explicit mapping and analysis. Personal notes are omitted. It is disabled with the same translated explanation as uploads when the API is unavailable. The HTTP runner checks every resulting rate/reference/evidence value through the UI's TypeScript guard.
- Added actual frontend ESLint with TypeScript, React hook rules and Next rules, strict zero warnings and a root script. Fixed unused test binding and clarified keyboard tab focus. Exact dev packages/lockfile are persisted. PostCSS is overridden to 8.5.28; Next is locked at 15.5.25.
- The brand now navigates through the existing workspace history rather than reloading and losing in-memory My Club work. Modifier clicks retain normal link behaviour. StatsBomb images have explicit intrinsic dimensions and CSS `height: auto`; browser QA caught and corrected the stretched-logo regression introduced by the image-component change. The final screenshot and rendered image dimensions were checked after the fix (source 200×49 px, footer 98×26 px, including padding).
- Configured standalone output, security headers, a server-only backend URL, same-origin POST checks and friendly unavailable-service errors. FastAPI `/ready` validates the dataset; `/health` only checks process availability. Missing dataset returns a controlled 503 without disclosing a local path.
- Added `scripts/serve.py` for production Next + loopback-only FastAPI, with occupied-port detection, readiness, failure propagation and owned-process cleanup. Added its lifecycle mode to `verify_dev.py`.
- Added root single-service `Dockerfile` and `render.yaml` (Free plan), plus separate API/web Dockerfiles and local `compose.yaml`. Non-root execution, private API, bounded concurrency and no runtime football download. Docker is unavailable here; container and hosted resource behaviour remain unverified.
- Prepared `.env.example`, private-file exclusions, public-inventory/secret-pattern scanner, clean Git clone rehearsal and expanded CI, including native production and container gates. No actual project Git history/remote was created.
- Rewrote README around actual implemented behaviour, architecture, installation, methods, screenshots, limitations and roadmap. Added `docs/PUBLISHING.md`, `DEMO_GUIDE.md`, `SHOWCASE_COPY.md`; updated source rights, architecture and interview notes. Three genuine desktop screenshots are in `docs/screenshots`, including the final corrected source/methodology capture; no fabricated UI imagery.
- Restored one truncated private event file `data/events/3930173.json` from 933,376 to 3,128,401 bytes using the same pinned upstream commit, only after matching its original SHA256 `acf4f80fdf726920ccfed08359e8b6853da676abb9f5e9b8cc3b26c387d69f1a`. Added a pre-parse raw/Parquet integrity gate and missing/truncated-input regression. Neither observations nor manifests were altered to accommodate damage.

Preserved prior fixes: fixed cohort support across filters; strict null/identity/score guards; exact per-metric imported confidence; transitive/sum numerator bounds; duplicate/unnamed imports excluded from depth; import-scoped per-team plans; stale request suppression; full Fit pagination/criterion resets; bounded Unicode notes/mapped fields; keyboard tabs; translated labels/team aliases; explicit missing deep links and comparison-column errors.

## Current data and methodological contract

- Euro 2024 men, StatsBomb competition 55 / season 282; **51/51 matches, 187,924 events, 493 participating players, 24 teams**.
- Dataset `c6b20c36ee58c5b18c3e`; source commit `4b73468fc5b0f1950f9f66fada70ad3a4f9327cb` in the official StatsBomb/Hudl open-data repository.
- Semantic SHA256 `68d6488257eb668471a3604c8f81a2812c64629a6f0e0aa98e6d7ae3b7ddb1d5`.
- Schema 2.0.0; features 2.1.1; minutes `period-clock-v1.1`; spatial `zones-6x4-v1`; research views `research-v2.3`; profile evidence `profile-evidence-v2.1`; Fit `weighted-logistic-v2.1`.
- Rates use aggregated observed totals divided by aggregated observed exposure. Pass completion uses passes, not minutes. Unknown is never zero.
- Reference: same dataset/competition/season/gender/dominant position, ≥180 minutes, ≥10 observed peers per metric. Filters do not redefine it. GK/unknown/sparse benchmarks withheld. Cohorts: AM19, CB59, CM14, DM41, FB49, GK24, ST29, W30; 228 players below 180 minutes. Kurtič has 0.5572166666666666 minutes.
- **Fit ≠ player quality ≠ confidence ≠ coverage.** No universal quality rating. Confidence is a bounded evidence heuristic, not a probability. Profile denominator is all 21 metrics; brief coverage/confidence use requested weights. Import structural quality is separate passed/total checks.
- Similarity is explained standardized distance over shared supported dimensions, not validated tactical replacement success. Curated archetypes are not learned football roles. Squad gaps describe observed exposure under user targets, not transfer urgency.
- Only unchanged identifiable canonical import observations receive Euro benchmarks; matching names/column labels never establish context. No cross-league adjustment or possession-adjusted rates.

## Browser QA actually observed on 09-23

- Scout search: immediate pending state, impossible-name empty results and reset; no stale selectable results. Kurtič profile shows 0.56 minutes, 95% observed coverage, confidence 0, no percentiles/completion/similarity where unsupported.
- Comparison Yamal/Kurtič: 531.0/0.56 minutes, confidence 59/0, coverage 100/95; cohort counts 30/29 with explicit withheld Kurtič percentiles. Removing both produces the correct empty comparison.
- Director: CM preset lists 14, Modrić Fit 77 and confidence 13 despite 100% brief coverage. Custom inputs disabled in saved mode with explanation.
- Coach: Spain 25 participants; ≥450 minutes + Rodri departure persists across My Club navigation, FR and reload; then restored to ≥180/no departure. Depth excludes under-threshold exposure and the simulated departure separately.
- Analyst: correct 51/187924/493/24 and translated method/source/limitations in French. Screenshot exposed the attribution-ratio issue, now fixed in CSS.
- Player: Yamal profile in English, 531.0 minutes/7 appearances/1 goal/4 assists, cohort30, coverage100%, confidence59. Similarity explanation exposes reference counts, values and distance components. ≥75-confidence similarity filter yields explicit no-results; no fallback to less-supported candidates.
- My Club unavailable state is translated and disables upload/demo truthfully. API-integration checks are passed separately. Interactive upload/brief execution remains unverified in this preview.
- After the browser/session reset, Scout saved Yamal, entered a temporary 57-character note and selected video review. Both survived module navigation, ES→FR and reload. The brand returned to player browsing without a reload, and Back returned to methodology. Temporary note/status/save were cleaned up. The final English Analyst screenshot confirms correct source-logo proportions and the active navigation item. Browser QA remains desktop/saved-analysis only.

## Persistence and privacy

Watchlists, notes, comparisons, preferences, brief inputs and published squad plans are validated device-local records; no scores are stored as user edits. Squad plans are dataset/team scoped. Browser history restores module/player/search. My Club uploads are processed in server memory, not saved; results and per-team plans survive module navigation but clear on reload/reanalysis. A new import rejects stale plan edits. There are no accounts or shared private workspace. Do not use a public research demo for confidential club information.

## Source licence and publication boundaries

StatsBomb's custom Public Data User Agreement is not an unrestricted open-data licence. Public research analysis requires attribution/logo; original-data redistribution and commercial exploitation (including derived analysis) are restricted. MIT applies only to original code. No commercial club licence was obtained. The agreement asks for user registration/name/email; no personal details or acceptance were submitted on behalf of the author. The publisher must handle that directly. See `DATA_SOURCES.md`, `THIRD_PARTY_NOTICES.md` and the pinned agreement.

Never publish `data/cache`, original JSON, canonical events/Parquet, lineups, environment files, keys, uploads, dependency directories or build caches. The public payload is derived research summaries and coarse zones with lineage. The application makes no provider requests while serving. The base needs no paid API, subscription or key.

## Open acceptance gates before calling the public demo ready

1. Latest clean-clone/build/native production gates passed. Docker is not installed here: execute both configured image builds/readiness gates on GitHub Actions or a Docker host. Test the single-service image at the documented 512 MiB limit with actual imports; do not infer load capacity from a smoke test.
2. Run full interactive **custom Fit + My Club sample/upload/mapping/reanalysis** in a browser with the actual Python API reachable. Check internal/external comparisons, decimal changes, invalid totals, duplicate identities, per-team plan retention, retry and stale-response transitions. Do not bypass preview isolation or reimplement Python in TypeScript to evade it.
3. Actual mobile viewport/touch QA and browser CSV download completion remain open. Responsive CSS and content/HTTP tests are not substitutes. This browser has no advertised viewport-control capability; earlier download-event verification timed out.
4. No public repository for this project or hosting session is available. GitHub connector reverified the author's account; both repository search and the accessible owner-repository list found no matching repository. It exposes no repository-creation operation. No Render credentials/account were supplied. `PUBLISHING.md` gives exact secure user steps, with no secrets in chat and no invented URL.
5. Complete the hosted five-role demo walkthrough, HTTPS/readiness and free-plan resource/cold-start behaviour before announcing a complete public demo. Render Free conditions were checked in official documentation on 09-23; stay on Free, no database/disk/paid add-ons or keepalive bypass.
6. Known product limits remain explicit: one historical men's tournament, no age/foot/injury/contracts/prices/current-club/tracking/league adjustment, no multi-user account. Goalkeeper benchmarking is deliberately absent. Two-competition UI cannot be claimed with one dataset.

Next highest-impact block: **close the actual hosted/container/browser acceptance gates**, not add a new competition or module. The source code can be reviewed now; a complete public demo is not yet declared accepted.

## Architecture and execution

`core/pipeline`: pinned cache, canonical schema, interval minutes, feature aggregation, atomic publish. `core/analytics`: cohorts/evidence/similarity/fit/imports. `data/sample/analysis.json`: bundled derived serving snapshot. `apps/api`: bounded typed FastAPI serving/import endpoints. `apps/web/public/analysis`: validated saved research views. `apps/web`: TypeScript/Next server proxy and UI. Shared definitions in `core/reference`. Runtime warehouses stay private in `data/cache` and DuckDB is read-only.

Prepared local run: `python scripts/dev.py`; fresh install: `python scripts/dev.py --install`. Root npm scripts delegate to `apps/web`; lockfile lives there. Production checks: `python -m scripts.verify_stack --standalone` (stages standalone assets) then `python -m scripts.verify_dev --production`. Numerical audit: `python -m scripts.validate_analysis`. Optional private-cache audit: `python -m scripts.verify_local_events`. Public inventory: `python -m scripts.check_publication`. Fresh local clone: `python -m scripts.verify_clean_checkout`.

## Runtime recovery notes

Workspace resets can lose process handles/browser bindings without losing source. Inspect before relaunching. Earlier resets truncated installed Polars and Ruff binaries; only their identical locked versions were restored. The local Python link may need recovery using `CODEX_PRIMARY_RUNTIME_PYTHON`; do not recreate the repo or silently downgrade dependencies. On 09-23 Python 3.12.14, Polars 1.44.2 and DuckDB 1.5.5 remained healthy after the interruption. Verify cache hashes if independent event parsing fails; never alter expected hashes to hide corruption.

Project root is the directory containing this file. Original uploads remain untouched. There is no external Git remote or registered Site. Use the advertised supervised preview/browser tools; never route around their access controls. The requested source ZIP is `Football_Recruitment_Platform_v0.2_Showcase_Aaron_Exposito.zip`; its contents are the existing public-project inventory, documentation, source configuration and attributed derived analysis, plus the package integrity manifest.
