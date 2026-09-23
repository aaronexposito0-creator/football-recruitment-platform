# MASTER HANDOFF PROMPT — Football Recruitment Platform

You are taking over an existing software/data/ML product for Aarón Expósito. Treat the attached repository as the source of truth and CONTINUE it; do not replace it with a toy rewrite.

## 0. Mission
Build a public, free-to-use, production-quality **Football Recruitment Platform** that can genuinely impress professional sporting directors, scouts, coaches, players, sports-tech/data recruiters and senior data/engineering hiring managers.

This is not a classroom dashboard. It must feel like a credible early-stage sports-tech product: useful, beautiful, explainable, fast, legally sourced, reproducible and technically serious.

Aarón is the product owner and public author. He does **not** want to make routine programming decisions. Make strong, well-reasoned technical decisions yourself. Ask him only when a decision is genuinely irreversible, paid, legal/licensing-sensitive, or materially changes the product thesis.

Author / contact identity to preserve:
- Name: **Aarón Expósito**
- LinkedIn: https://www.linkedin.com/in/aaronexpositomonar
- GitHub: https://github.com/aaronexposito0-creator
- Instagram: **@aaron__ex**

## 1. Non-negotiable product vision
The platform serves multiple personas selected at entry:
- Sporting Director
- Scout
- Coach
- Analyst
- Player

The same underlying data/model layer powers all personas, but navigation, language, defaults and recommended workflows adapt to the selected persona.

The application must support English, Spanish and French from the architecture, not as three duplicated apps.

The visual identity should be football-first and premium: clean, modern, readable, green-led, no ads, no gambling aesthetic, with optional appearance modes such as Tactical Green / Stadium Dark / Classic Light. Visual polish matters, but never at the expense of analytical integrity.

## 2. Core product modules — target end state
Build toward all of these, incrementally and with tests:

### Recruitment
- Advanced player search
- Natural-language recruitment brief builder
- Explainable Recruitment Fit Engine
- Hard filters + weighted soft requirements
- Player-to-role fit
- Player-to-team/game-model fit
- Replacement finder
- Similar-player search
- Shortlists
- Market / under-the-radar opportunities where data supports it
- Exportable recruitment reports

### Player Intelligence
- Player profile
- Percentiles by defensible comparison cohort
- Radar / bars / distributions
- Shot maps
- Pass maps and passing networks where appropriate
- Carry maps
- Defensive-action maps
- Heatmaps / touch maps where the source supports them
- Season evolution / form windows where data permits
- Strengths and weaknesses with evidence
- Role classification and statistical archetypes
- Similar players
- Best-in-position benchmark comparisons

### Team / Tactical Intelligence
- Team profile
- Tactical DNA / style vector
- Game-model archetypes
- Squad depth
- Role coverage
- Squad strengths / weaknesses
- Recruitment needs
- Team-to-player fit
- Team style evolution when historical data supports it

### My Club / My Team
Allow users to upload their own CSV/XLSX datasets, including partial amateur/semi-pro datasets.
- Mapping wizard
- Schema and unit validation
- Missing-data diagnostics
- **Data Coverage Score**
- **Confidence Score**
- Internal squad benchmarking
- External similarity only on mutually available dimensions
- Never invent missing variables
- Make uncertainty obvious and useful

### Ask Football
A concise assistant for:
- navigation (“where do I find player comparison?”)
- metric definitions
- structured natural-language recruitment requests
- evidence-linked answers from available data
- “who built this?” with clickable author links
- no unsupported football claims

## 3. Analytical principles — absolute requirements
1. **Fit is not quality.** A world-class player can have a low fit score for the wrong role.
2. Never present missing data as observed data.
3. Every material recommendation must expose why it was produced.
4. Separate at least:
   - Fit Score
   - Data Coverage
   - Confidence / reliability
5. Cross-league and cross-era comparisons must be contextualized or clearly caveated.
6. Every metric must have a documented definition and denominator.
7. Per-90 metrics must use defensible minutes and minimum-minute filters.
8. Avoid leakage in predictive modelling.
9. Do not use “AI” as decoration. ML must solve a real product problem.
10. Do not silently merge identities from multiple providers by fuzzy name alone.
11. Preserve provider/source lineage for teams, players, competitions, matches and events.
12. A recommendation should be auditable: “Why this player?” must show positive/negative contributors.

## 4. Cost / legality / privacy constraints
The baseline public application must be buildable and runnable **100% free**.

### Forbidden by default
- paid APIs
- paid databases
- paid hosting requirements
- proprietary datasets without explicit permission
- brittle scraping that violates terms or robots/policies
- employer/confidential data
- pirated Wyscout/Opta/StatsBomb commercial datasets
- fabricated market values or injuries presented as fact

### Allowed
- legitimately open datasets and open-source repositories
- free public APIs/free tiers if their terms permit the intended use
- free-tier hosting if available at deployment time
- optional API adapters behind environment variables, provided the product still works without them

If a paid source would materially improve the app, document it as OPTIONAL and continue building the free path. Do not require Aarón to spend money.

Respect source licenses and attribution requirements. Maintain a source registry with license, attribution, update method and fields used.

User uploads must remain logically isolated from public datasets. Do not commit user-uploaded files to git.

## 5. Existing architecture — preserve unless evidence strongly justifies a change
Current target stack:
- Web: Next.js + TypeScript
- API: FastAPI + Python
- Analytical storage: Parquet + DuckDB / Polars
- Production relational layer when justified: PostgreSQL
- ML: scikit-learn first; add libraries only when they earn their complexity
- CI: GitHub Actions

Do **not** downgrade this into a one-file Streamlit project. The previous portfolio project already demonstrates Streamlit. This project should demonstrate a more product-grade architecture.

Keep the project easy to run locally. Prefer one-command or very short setup flows. Add Docker only if it reduces complexity rather than showing off.

## 6. Current repository state
The attached repository is v0.1 and already contains:
- explainable recruitment fit engine
- player similarity engine
- data coverage logic
- role-discovery ML foundation
- source adapters
- canonical schemas
- FastAPI skeleton
- Next.js/TypeScript shell
- EN/ES/FR i18n foundation
- SQL warehouse draft
- tests and GitHub Actions
- product/data/architecture docs

**First action:** inspect the entire repo and run the existing test suite. Do not assume this prompt is more accurate than the code. Reconcile documentation with reality.

Do not delete working functionality just to impose your preferred structure.

## 7. Immediate priority — V0.2 REAL DATA PIPELINE
The next milestone is not more mock UI. It is a defensible real-data foundation.

Implement a robust open-data pipeline, starting with StatsBomb Open Data where legally appropriate, and use other legal open sources only where they add distinct value.

### V0.2 acceptance goals
At minimum, achieve:
1. Source inventory and licensing/attribution file updated.
2. Reproducible downloader/cache for competition → matches → lineups → events.
3. Canonical normalization into source-aware entities.
4. Stable IDs and explicit provider mappings.
5. Partitioned Parquet output suitable for analytical scans.
6. DuckDB/Polars analytical layer.
7. Reliable player-minutes computation with tests and documented edge cases.
8. A first set of meaningful, documented player features.
9. Per-90 metrics where appropriate.
10. Position/role-aware cohorts and minimum-minute filters.
11. Percentiles computed only against defensible cohorts.
12. First real player profile endpoint.
13. First real player profile UI using actual open data.
14. No synthetic player names in the primary demo path once real data is available.
15. Deterministic/demo fallback so the app still opens if an external source is temporarily unavailable.

### Initial feature families
Use metrics supported by source semantics and document exact formulas. Candidate families include:
- minutes / appearances
- goals, shots, xG when provided by source
- assists / key passes / xA where defensible
- pass completion and directional/progressive passing
- carries and progressive carries
- final-third / box entries
- pressures / defensive actions where provider definitions allow
- ball recoveries / interceptions / tackles
- turnovers / dispossessions / miscontrols where available
- aerial/duel metrics if source coverage is adequate

Do not create fake precision. If a metric cannot be consistently computed, leave it out and document why.

## 8. What comes after V0.2
Proceed milestone by milestone without waiting for routine approval:

### V0.3 Recruitment Workspace
- advanced search
- role requirement builder
- editable weights
- hard constraints
- fit ranking
- explanation waterfall / contribution view
- compare candidates
- shortlist persistence
- export CSV

### V0.4 Player Intelligence
- event maps
- radar / distribution comparisons
- season splits
- similarity explorer
- role clusters / archetypes
- “what separates me from top X%?” player workflow

### V0.5 Team / Tactical Intelligence
- team style vectors
- squad role coverage
- team-to-player fit
- replacement workflows

### V0.6 My Club
- CSV/XLSX upload wizard
- mapping and validation
- confidence-aware comparisons

### V0.7 Tracking Lab
Use genuinely open tracking samples such as SkillCorner/Metrica only where licensing and data quality permit. Keep tracking coverage visually distinct from event-data coverage.

### V0.8 Current World
Add optional legal/free current-data sources with scheduled refresh only after the historical/event foundation is reliable. The free baseline must remain functional without paid keys.

### V0.9 Ask Football
Natural language should translate user intent into structured, auditable filters/queries. Do not let an LLM invent statistics.

### V1.0 Public Release
- polished EN/ES/FR
- responsive
- fast
- docs and methodology
- graceful errors
- monitoring/logging appropriate to free deployment
- public demo
- recruiter / sporting-director walkthrough

## 9. ML roadmap — only real value
Implement ML incrementally and validate it:
- player role clustering
- similarity / nearest-neighbour search
- dimensionality reduction for exploration (PCA/UMAP if justified)
- interpretable role fit
- anomaly / under-the-radar detection
- team-player fit
- uncertainty/reliability calibration where possible

Prefer interpretable baselines before complex models. Compare against simple baselines. Document evaluation methodology. Avoid “deep learning” unless there is enough data and a clear product advantage.

## 10. UX expectations
The app should be understandable to a sporting director who does not code.

Every screen should answer:
- What am I looking at?
- Why does it matter?
- What can I do next?

Avoid dashboard clutter. Use progressive disclosure.

Important UI concepts:
- persona selector
- EN / ES / FR language selector
- appearance selector
- global player/team/competition search
- clear breadcrumbs/navigation
- “Why this player?”
- “Data coverage” and “Confidence” tooltips
- filters that feel like football language, not database columns
- mobile-friendly enough for review, desktop-first for analysis

## 11. Engineering quality bar
For every meaningful milestone:
- run tests
- add tests for new core logic
- lint/type-check where configured
- remove generated caches (`__pycache__`, `.pytest_cache`, node build output)
- keep `.gitignore` correct
- keep secrets out of git
- update CHANGELOG
- update README only with features that actually exist
- update ROADMAP status honestly
- preserve reproducibility

If something fails, fix it before claiming the milestone is complete.

Prefer small modules with clear responsibilities over huge files.

## 12. Autonomy protocol
Work continuously within the available session/tool limits.

Do not stop after writing a plan. **Implement.**
Do not ask Aarón to choose ordinary libraries, folder names, chart packages, database indexes, etc. Choose and proceed.

Only ask him when one of these is true:
- payment is required
- license/terms are ambiguous and consequential
- a public brand/name choice is irreversible
- credentials or an account action from him is required
- a product fork would significantly change the mission

When blocked by one source/tool, build the next useful part and document the blocker.

## 13. End-of-run reporting
At the end of each substantial work session, provide a concise factual handoff:
- What you inspected
- What you implemented
- Tests/checks run and exact result
- Files created/changed
- What is genuinely working now
- Known limitations
- Next best milestone
- Any action Aarón must take (only if unavoidable)

Never say “complete” when only scaffolding exists.

## 14. First execution sequence
Start now with this sequence:
1. Inspect repository tree and key docs/code.
2. Run existing Python tests.
3. Run frontend install/build/type-check if feasible with available tooling.
4. Audit README claims against actual implementation.
5. Clean generated cache artifacts if present.
6. Implement V0.2 real open-data ingestion and canonical normalization.
7. Add tests.
8. Produce at least one real player profile from open data.
9. Wire it through API.
10. Wire it into the web UI.
11. Run tests/build again.
12. Update docs/changelog and leave the repository in a runnable state.

Do not merely tell Aarón how to do these steps. Do them yourself using the attached project.

## 15. Definition of success
A senior football data professional should be able to open this project and see:
- serious data engineering
- football domain understanding
- defensible metric definitions
- explainable decision intelligence
- thoughtful ML
- product thinking
- strong UX
- software engineering discipline

A sporting director should be able to use it without knowing Python.
A small club should be able to upload partial data and receive honest, confidence-aware insight.
A recruiter should immediately understand why Aarón is differentiated from generic junior Data Analyst portfolios.

Build toward that standard.
