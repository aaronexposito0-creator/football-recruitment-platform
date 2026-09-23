# Metric governance — current analytical contract

The executable catalog lives in `core/pipeline/metrics.py`. Definitions are versioned; names are available in English, Spanish and French. This document distinguishes observations, rates, relative ranks, brief compatibility and evidence.

## Observations and exposure

Canonical events preserve source IDs, match/team/player keys, event order, period, source hash and provider coordinates. Minutes use exact period clocks: starting XI, substitutions (including substitutes later substituted), red/second-yellow dismissals and temporary off/on events. Added and extra time count; breaks and shootouts do not. Position changes create separate exposure intervals. Missing whistles, incomplete broadcast flags, unknown participants or events while a player is inactive fail the build.

Tournament exposure is reconstructed before aggregation. For a metric total T and total on-pitch minutes M, rate = 90 × T / M. Sum numerators and minutes first; never average match-level rates. Zero exposure has no per90. Zero passes has no pass-completion rate. A missing observation remains null and propagates through season aggregation; absence of a match-wide event family is not silently converted to a measured zero.

## Current event metrics

All rows ending in `_per90` use the same added-time exposure denominator. Provider coordinates use a 120×80 frame; geometric progression distances scale to 105×68 metres. Events are restricted to periods 1–4.

| Key | Unit | Meaning / calculation | Preferred direction in the descriptive display |
| --- | --- | --- | --- |
| `goals_per90` | per90 | Shot outcome Goal, periods 1–4; excludes own goals and shootouts. | higher |
| `non_penalty_goals_per90` | per90 | Goals excluding Shot type Penalty. | higher |
| `shots_per90` | per90 | Shot events in periods 1–4, including penalties. | higher |
| `xg_per90` | per90 | Sum of provider statsbomb_xg over shots; null if any shot lacks xG. | higher |
| `npxg_per90` | per90 | Sum of provider xG excluding penalties; null if any applicable shot lacks xG. | higher |
| `assists_per90` | per90 | Pass events with provider goal_assist flag; no inferred assists. | higher |
| `key_passes_per90` | per90 | Pass with shot_assist or goal_assist. Includes goal-creating passes. | higher |
| `xa_per90` | per90 | Sum of linked assisted shot xG; requires same match/team and valid shot link. Not a pass-based xA model. | higher |
| `passes_per90` | per90 | All Pass events, including restarts. | higher |
| `completed_passes_per90` | per90 | Pass events with absent pass.outcome (provider success encoding). | higher |
| `progressive_passes_per90` | per90 | Completed open-play pass: forward and reduces distance to goal centre by >=10m AND >=25%. Coordinates scaled to 105x68m. Restarts excluded. | higher |
| `carries_per90` | per90 | Provider Carry events. Not every touch or dribble attempt. | higher |
| `progressive_carries_per90` | per90 | Carry with same distance-to-goal rule as progressive passes. | higher |
| `passes_into_final_third_per90` | per90 | Completed open-play pass starts x<80 and ends x>=80 on provider 120x80 pitch. | higher |
| `entries_into_box_per90` | per90 | Completed open-play pass or carry from outside to inside x>=102, 18<=y<=62. | higher |
| `pressures_per90` | per90 | Provider Pressure events; not successful presses. Null if a whole match has no pressure coverage. | higher |
| `tackles_per90` | per90 | Duel events with subtype Tackle; attempted, not necessarily won. | higher |
| `interceptions_per90` | per90 | Interception events; outcomes retained in canonical events, not assumed successful. | higher |
| `ball_recoveries_per90` | per90 | Ball Recovery events without recovery_failure. | higher |
| `turnovers_per90` | per90 | Dispossessed + Miscontrol events only. Excludes failed passes; not all possession losses. | lower |
| `pass_completion` | % | 100 * completed passes / attempted passes. Null for zero attempts. | higher |

Expected goals are the provider's shot model, not a locally trained model. Assisted-shot xG (`xa_per90`) sums correctly linked shot xG; it is not a pass-based xA model. Links must refer to a later shot in the same match/team and may not be counted twice. Missing or invalid links withhold the aggregate. Own goals and shootouts do not enter player goal totals; non-penalty metrics exclude penalties.

Completed progressive passes exclude restarts. Progression requires forward motion and both ≥10 m and ≥25% reduction in distance to the goal centre. Carries use the same geometry. Missing necessary coordinates withhold the corresponding season metric. Pressure coverage is assessed at match level. Tackle/interception and pressure counts are activity, not proven defensive success. Control losses are only Miscontrol + Dispossessed, not all turnovers of possession.

## Cohorts and percentiles

Reference: identical dataset, competition, season, gender and dominant position, with ≥180 minutes. There must be ≥10 observations for the particular metric. Goalkeepers and unknown-position players have no benchmark model. A low-minute player can have honest observed rates while all percentiles and similarity results are withheld.

Public profile and similarity routes accept only the fixed 180-minute reference. A different `min_minutes` returns HTTP 422; use `candidate_min_minutes` for similarity candidate selection. Search/brief exposure filters do not redefine analytical references.

Midrank percentile = 100 × (number strictly below + 0.5 × number equal) / number observed. The target belongs to its reference when eligible. Ties retain midranks; an all-equal group gives P50, not P100. A favorable display rank reverses the direction for control losses: 100 − raw percentile. This direction is not a universal football value judgement. Search filters never redefine the benchmark. Player comparisons identify each player's own position cohort.

## Coverage, evidence and confidence

| Concept | Implementation | Does not establish |
| --- | --- | --- |
| Dataset coverage | Successfully ingested requested matches / matches in the selected provider competition-season | Worldwide, current-market or full registered-squad coverage |
| Profile metric coverage | Observed values / 21 supported event metrics | Tracking, injury, market or complete contextual knowledge |
| Evidence | Actual minutes, events, games, position exposure, source revision, missing context and quality notes | Reliability beyond the observation window |
| Profile confidence | 100 × min(minutes/900,1) × sum(per-metric reference support) / 21; zero if benchmark-ineligible | A calibrated probability or player quality |
| Brief coverage | Scorable observed requirement weight / all requested weight | Complete player coverage outside the brief |
| Brief confidence | 100 × minutes factor × weighted observed peer support / all requested weight; each metric requires ≥10 references, peer support saturates at 30 | Tactical certainty or a guaranteed successful transfer |
| Import structural quality | Valid identity/position/minute/mapped-numeric/unique-source-ID checks / expected checks | Truth of self-reported observations |

Partial competition coverage, mixed-position exposure and unresolved source links remain visible evidence limitations. Confidence is a conservative descriptive index, not an uncertainty interval from a calibrated predictive model.

For profile confidence (`profile-evidence-v2.1`), each metric contributes `min(observed reference players / 30, 1)` only when its value and percentile exist. Otherwise it contributes zero. The denominator is all 21 supported metrics, including unavailable metrics. Thus a large position cohort cannot conceal a small reference for an individual metric. Verified My Club round-trips apply exactly the same rule to the imported observations only. Missing reference evidence does not mean that a player has no strengths or weaknesses: the UI withholds those assessments.

The My Club frontend independently reconstructs this confidence from the canonical reference's same dataset/competition/season/gender/position peers at ≥180 minutes. It counts observations per imported metric, requires ten before adding support and keeps all 21 metrics in the denominator. Merely being below metric coverage or the original full profile's confidence is insufficient. Regression tests accept exact partial-import confidence for Yamal and Modrić and reject both overstated and understated values; the HTTP gate also reconciles the one-metric import mathematically. No confidence values or observations in the published dataset changed.

## Explainable weighted Fit

Reference stays fixed at ≥180-minute players in the selected outfield position. Raising a hard minimum, changing an age/foot requirement or setting a metric bound does not change the reference, Fit or confidence; it changes eligibility. The real API accepts exactly one supported outfield position. Age and preferred foot are unknown in this source slice, so mandatory requirements on them cannot pass.

For higher/lower preferences: z = signed (observation − reference mean) / population standard deviation; score = 100 / (1 + exp(−1.25z)). A constant reference uses a neutral scale. Target preferences use a Gaussian distance from the supplied target/tolerance. At least ten reference observations are required for every scored metric. The API rejects unknown metrics, duplicate requirements, contradictory bounds, all-zero weights and unsupported league adjustments.

Fit = sum(weight × score over scorable observations) / sum(observed weight). Missing metrics are not imputed. A missing mandatory bound fails eligibility even if population statistics are unavailable. An observed value without adequate reference evidence is shown but not scored. No observed requirements means null Fit and zero brief confidence.

Each explanation gives the observation, weight, normalized requirement score, contribution to Fit and signed contribution relative to neutral 50. Intermediate calculations retain precision; public Fit rounds to two decimals. Contributions reconcile within final display rounding. The eleven archetypes are curated, versioned hypotheses, not learned roles or team-tactical models.

The frontend binds each Fit response to the entire requested brief, including weights and optional hard constraints; equivalent omission of API defaults is normalized. It also checks that weighted requirement scores and contributions reproduce the reported Fit and coverage within rounding tolerance. An insufficient reference is distinct from verified candidates excluded by mandatory constraints, both in the typed API response and the UI message.

## Similarity and replacement review

Eight interpretable event dimensions use fixed population standardization. Each dimension requires at least ten observed reference players, separately from the overall cohort size. Pairwise distance is RMS of mutually observed standardized differences; similarity = 100 / (1 + distance). Constant or sparsely supported dimensions are excluded; at least three supported nonconstant shared dimensions are required. Both players' measurements may be present (100% pair coverage) while reference support is inadequate; these remain visible but unscored. Each explanation includes its reference count and withheld reason. There is no zero or mean imputation. Ordering has a stable ID tie-break. Candidate filters run after scoring and preserve pairwise scores and reference scales.

The UI reports closest dimensions, largest differences, both observed values, standardized differences and squared-distance shares. Statistical likeness starts a video/context review; it does not establish that two players can replace each other tactically. Goalkeepers and insufficient exposure produce an explicit unavailable/empty state.

## Spatial summaries

A 6×4 grid aggregates shots, passes, progressive passes/carries, pressures and tackle/interception activity. Coordinates are cell centres in public figures; arrows join coarse zones and are not exact pass trajectories. Same-zone flows are omitted and the view shows at most eight largest flows. Located counts, missing-location counts and match-specific minutes are explicit. Shot-zone xG is rounded to two decimals and labelled approximate; overall aggregation occurs before rounding. No individual provider event IDs or exact coordinates are exported.

## Squad and imports

Depth counts a player once in a chosen scenario position and only at or above the selected exposure threshold. Imported row IDs are not distinct player identities: conflicting source IDs and unnamed rows remain visible but cannot fill a target. Duplicate detection spans the import, including conflicts outside a selected team or assigned position. Exclusions distinguish identity conflicts, missing identity/minutes, insufficient exposure and a simulated departure. Formation targets are editable assumptions, not an inferred team formation. A departure is a reversible scenario; positional assignments do not edit source observations or percentile cohorts. Shared low-volume signals require at least two eligible players in a position all at ≤P25; context may explain them.

CSV/XLSX imports accept totals and minutes, never silently reinterpret a per90 column as a total. Unknown and invalid values remain null; duplicates remain separate rows. External benchmarks require matching source ID, dataset, player name, dominant position, exact minutes and every supplied observed total from the canonical reference. Otherwise confidence/percentiles are withheld. Matching column labels are insufficient evidence for cross-source or cross-season comparisons.

Scouting notes and other unmapped columns are auxiliary text, not measurements or quality checks. They can remain in an exported/imported table without changing rates, coverage, confidence or reference eligibility. Allowing up to 4096 Unicode characters in preview cells does not expand the 256-character limit for mapped football fields or weaken the numeric consistency checks. The production integration check reimports the actual 54-column shortlist export with a maximum-length note and independently compares all rates, the reference, coverage and confidence with the canonical player.

Imported totals must respect their event definitions before any rate, quality or coverage is calculated. `core/reference/import_metric_bounds.json` supplies the same bounds to Python and the frontend response guard. This includes transitive relations such as non-penalty goals ≤ goals ≤ shots, non-penalty xG ≤ xG ≤ shots and progressive/completed passes ≤ attempts. Assists cannot exceed shot-creating passes; final-third passes cannot exceed completed passes. Box entries cannot exceed completed passes + carries (or attempted passes + carries). Every term of a sum must be observed to use that bound; an unknown component is never zero.

The importer compares the parsed observations before withholding any inconsistent subtotal, so validation order cannot conceal a contradiction. A missing or rejected intermediate total does not remove a known ancestor bound: four non-penalty goals with two shots remain invalid even if total goals are unavailable. Contradicted totals and their rates become null, their quality checks fail, and they add no metric coverage or comparative confidence. Other compatible observations remain visible; values are never clamped or fabricated. Row explanations identify each conflicting bound in EN/ES/FR, including sums. The frontend rejects a response with an impossible subtotal even when its per90 arithmetic is internally correct.

Import structural quality is exactly `100 × quality_checks.passed / quality_checks.total`. For each row, count name, recognised position and valid minutes; add every mapped metric total and mapped age, plus ID uniqueness when an ID was supplied. Missing or invalid expected cells fail their check; unmapped optional cells do not enter this denominator. An observed zero is valid. Both integer counts are returned by FastAPI and displayed, and the frontend rejects a percentage that does not reproduce them. This measures structural validity, not truth, player quality, metric coverage or comparative confidence. The regression fixture with two duplicate IDs and malformed observations yields 8/14 checks (57.142857%), not 100% confidence.

## Verification

`scripts/validate_analysis.py` independently recalculates every rate and midrank, reconstructs similarity scores and weighted Fit/confidence, and verifies the saved publication's SHA256 manifest. Pipeline tests exercise added time, halftime substitutions, dismissals, incomplete matches, null denominators/links, cache corruption, reproducibility and atomic failure preservation. See `docs/validation` and HANDOFF_STATE for actual run results.

The similarity audit derives each reference count and population standard deviation directly from canonical peer observations, checks withheld reasons, and reconciles standardized differences and squared-distance shares. My Club's runtime boundary independently checks imported rates and external reference identity before display; HTTP smoke exercises real response payloads through the same Python-to-TypeScript path.
