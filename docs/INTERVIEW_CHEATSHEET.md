# Interview notes — defend the implemented product

## Thirty-second explanation

Football Recruitment Platform connects reproducible open event data to explainable football decisions. It reconstructs real playing time, calculates event rates and position-specific percentiles, exposes them through FastAPI and gives scouts a Next.js workspace for profiles, similarity, recruitment briefs, comparisons, watchlists and squad scenarios. The first validated slice is the complete Euro 2024: 51 matches, 187,924 events and 493 participating players.

## What separates Fit, Quality and Confidence?

Fit measures compatibility with the weighted requirements of a particular brief. Eligibility answers whether mandatory constraints can be verified. Confidence describes the supporting evidence. Universal player quality is not computed. A high Fit with limited minutes is not a strong transfer recommendation. Raising the minimum-minute constraint changes eligibility, not the fixed reference or the player's Fit.

Profile confidence counts the reference support of each observed benchmarked metric, not just the headline position-cohort size. A metric with fewer than ten reference observations adds zero; support saturates at thirty and exposure at 900 minutes. All 21 metrics stay in the denominator. Brief confidence instead weights evidence by that brief's requested criteria. In the CM archetype, Modrić can show Fit around 77 with confidence around 13/100: 100% brief coverage does not turn a short tournament and a 14-player reference into strong certainty.

## Why not average per-match per90 values?

A ten-minute cameo should not have the same denominator weight as a full match. Sum the event numerators and the actual on-pitch minutes first, then calculate 90 × total / minutes. Added time and extra time count; interval breaks and shootouts do not. A zero-minute or unknown exposure cannot produce a rate. Zero pass attempts produces an unknown completion percentage, not 0%.

## Why are some percentiles missing?

The player needs 180 minutes and a supported outfield position. Each metric needs ten observed peers from the same dataset, competition, season, gender and dominant position. Midranks handle ties; an all-equal reference gives P50. Search filters do not move that reference. Goalkeepers need a different model, so this implementation withholds their benchmarks.

## Which real players are useful for a demonstration?

- Lamine Yamal: 7 appearances, 1 goal and 4 provider-flagged assists. Inspect his actual minutes, W cohort, npxG/creation profile and match-specific shot zones. The independent raw-event audit finds 18 shots.
- Fabián Ruiz: 6 appearances, 2 goals and 2 assists. His dominant provider position exposure in this tournament maps to DM; do not relabel it from general football knowledge. A coach can assign a different position in a planning scenario without changing the source observation or cohort.
- Rodri: inspect observed exposure, position context and the difference between passing/progression and defensive activity.
- Jasmin Kurtič: around 0.56 minutes. Observed zeros can be retained, but percentiles and similarity are withheld. A no-pass sample has no completion rate.

Use the current JSON reports in `docs/validation` for precise decimals; do not memorise rounded figures as source truth.

## What is the similarity model?

An interpretable standardized RMS distance on eight event dimensions. It compares only mutually observed, nonconstant dimensions with at least ten observed reference players and requires at least three. Similarity is 100/(1+distance). The interface explains each dimension, its observed values, reference count and share of squared distance. A dimension can have both players' observations but insufficient reference support: it is then excluded without inventing a value. Filtering out a team or low-exposure candidate does not change the original pairwise score. This is a statistical baseline, not a trained replacement-success model.

## What does machine learning do today?

No learned tactical-role or transfer-outcome model is on the production path. The current similarity and Fit baselines are transparent statistical methods. Archetypes are curated hypotheses with explicit weights. The unused v0.1 clustering experiment is not a product claim. A learned model would need a larger, legally suitable dataset, a defined objective, held-out validation and football review before replacing an understandable baseline.

## Why Polars, Parquet and DuckDB?

Polars handles typed canonical events and group aggregation; compressed Parquet stores private partitioned observations and features; DuckDB provides local analytical scans without a separate database service. FastAPI serves compact derived research views rather than rescanning all events for every UI request. This slice demonstrates the architecture on 187,924 records, not an unmeasured claim of billion-row performance.

## How is reproducibility demonstrated?

Pinned commit, recorded source URLs and SHA256, explicit schema/feature/minute versions, deterministic dataset ID, cached offline replay, stable source IDs and file/semantic-hash reconciliation. Publication occurs after all requested matches pass quality gates. A failed run preserves the previous dataset. Saved frontend views are produced from one pinned in-memory catalog, with a publication hash manifest and no leftover players from an older universe.

## How do you test numerical correctness?

Parser and minute-lifecycle fixtures test edge cases rather than UI snapshots. Independent validation recalculates every rate and percentile, reconstructs similarity and recomputes Fit/confidence from the original metric values. Known-player event counts are checked against the private provider cache, and DuckDB exposure sums reconcile with published minutes. The production HTTP runner tests actual Next-to-FastAPI requests, binary uploads, invalid constraints and service failure. Distinguish these executed checks from browser interactions that are still pending in HANDOFF_STATE.

## How does My Club avoid misleading comparisons?

Uploads use separate identities and are processed in memory. Preview and explicit mapping precede analysis. Unknowns, bad numerators, zero denominators and duplicate IDs are visible. Structural quality, metric coverage and comparative confidence are separate. A matching column name does not establish a shared definition or competitive context. Only unchanged identifiable canonical rows can reuse the Euro reference; other imported observations remain unbenchmarked until harmonisation is validated.

Original row numbers survive blank CSV/XLSX rows. Formula-like cells are withheld. Invalid lazy XLSX shared-string references are reported as a controlled upload rejection, not a server failure. The backend validates observation consistency; it does not verify self-reported football data.

An isolated row ID is not evidence of a unique player. The QA regression exposed duplicate source IDs filling multiple squad slots despite already having their benchmarks withheld. Those rows now remain visible with a reason but fill no target, including after team filtering. Structural quality exposes its exact integer numerator and denominator; an 8/14-check fixture gives 57.142857%, while comparative confidence remains absent.

Another regression exposed a validation-order error: after rejecting total goals greater than shots, the importer could retain non-penalty goals greater than shots because the intermediate total was now null. All available direct, transitive and sum bounds are evaluated before withholding any value. Python and the frontend share these definitions; an arithmetically correct per90 is still rejected if its numerator contradicts observed event totals. Unknown bounds do not create zeros or erase compatible measurements. This is structural consistency checking, not verification that an uploaded observation happened.

A workflow regression also exposed an incompatible pair of limits: the notebook accepted 3000-character notes, but My Club rejected any CSV/XLSX cell longer than 256 characters, including unmapped notes. Auxiliary preview cells now allow 4096 Unicode characters while mapped football fields remain bounded at 256. Both layers share these limits. The actual exporter → Next proxy → FastAPI preview/analysis → TypeScript validation check preserves all football rates and evidence scores with a maximum-length, formula-safe note. This does not claim that a browser download or interactive upload has been verified.

The next evidence regression was subtler: frontend validation accepted a partial import's incorrect confidence if it stayed below coverage and the canonical player's full confidence. The API already produced the right number. The frontend now reconstructs the same minutes/per-metric-support formula independently, using only the imported evidence. Tests cover both a larger winger reference and Modrić's smaller midfield reference, rejecting numbers that pass the old upper bounds but cannot be reproduced.

## How does the UI prevent stale or misleading results?

Runtime response validation checks player identity and dataset as well as numerical shape and evidence limits. Fit responses must match the complete requested brief; weights/components must reproduce the reported Fit and coverage. Import responses are validated before entering UI state, including rate arithmetic and external references. Cancelled requests cannot overwrite a later selection. Pending searches do not expose the old query's clickable results. Comparison columns fail independently and always allow removal. Back/Forward restores the module, player and its search filters. Notes, comparisons, briefs and squad plans survive navigation through separately validated local records; dataset changes clear active analytical/import panels. This is device-local state, not a deployed multi-user club account.

Browser QA found a silent ranking truncation: a brief announced 41 candidates but rendered only the first 30 with no way to inspect the remainder. Result expansion now exposes all candidates, reports shown/total and resets on changed criteria without recalculating scores. The 41st candidate's real profile, profile Back navigation, language changes and a 59-player position reference were checked in the browser. Requirement controls also display their units, distinguishing pass completion (%) from event rates (/90).

## What can squad planning legitimately say?

It can describe observed participation, compare it with user-chosen depth targets and simulate a departure. It can show shared low-volume signals under an explicit rule. It cannot infer unobserved substitutes, the current club squad, injuries, tactical instructions or urgent recruitment need from those counts alone. Scenario assignments express the user's football hypothesis, not a change to the data.

## What are the licensing constraints?

The core software has no paid dependency. StatsBomb's custom agreement permits attributed public research analysis and restricts raw redistribution and commercial exploitation, including derived analysis. Provider JSON and canonical events remain private. MIT for original code does not relicense source observations or the logo. A commercial club deployment requires an appropriate source-rights basis; do not confuse public access with permission.

## How can someone reproduce the demo from GitHub?

Python 3.12, Node 24 and `python scripts/dev.py --install` start the existing Next.js and FastAPI application with the bundled real research analysis. No source-provider key or event download is needed to browse, edit a brief or try the Spain import. The clean-checkout runner creates a real temporary Git clone with fresh dependencies and exercises that command before tests/build/HTTP verification. It is a local rehearsal, not an external GitHub CI result.

The root Dockerfile and Free Render blueprint keep Python and Next in one service, with the API on loopback and only Next exposed. The native production supervisor has been tested for readiness, occupied ports and cleanup. Do not claim the Docker image or hosted demo passed until the separate deployment gates in `HANDOFF_STATE.md` are closed. The README and `SHOWCASE_COPY.md` deliberately distinguish runnable code, tested HTTP behaviour and remaining interactive browser checks.

## What would you improve next?

First finish every existing workflow's browser/integration gates. Then implement a transfer-aware player-team-season grain and a legally suitable larger longitudinal reference. Evaluate metric stability and similarity robustness before adding learned roles or cross-league recommendations. More screens or a decorative LLM would not solve the current evidence constraints.
