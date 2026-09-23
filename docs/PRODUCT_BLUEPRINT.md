> Product vision, not an implementation claim. Current running workflows and limitations are documented in README.md and HANDOFF_STATE.md. No proposed feature here overrides Fit ≠ Quality ≠ Confidence or the entirely free core.

# Product Blueprint

## Personas

### Sporting Director
Language: squad value, succession, risk, opportunity, fit, shortlist.
Default modules: Recruitment Fit → Squad Planner → Market Opportunities → Shortlists.

### Scout
Language: evidence, traits, context, sample size, watchlist, strengths/risks.
Default modules: Search → Player Profile → Compare → Similarity → Report.

### Coach
Language: role behaviour, game model, phase of play, opposition, tactical fit.
Default modules: Tactical DNA → Role Fit → Team Compare → Player Maps.

### Analyst
Language: metric definition, filters, distributions, source, model version, export.
Default modules: Explorer → Compare → Models → Data Quality.

### Player
Language: benchmark, development, strengths, gaps, peers, progression.
Default modules: My Profile → Position Benchmark → Similar Players → Development Gaps.

## Primary workflows

### A. Build a recruitment brief
1. choose position family / role;
2. define hard constraints (age, minutes, foot, league, contract/market later);
3. choose football traits in natural language or sliders;
4. map traits to metrics;
5. rank candidates;
6. inspect Why this player?;
7. compare and shortlist;
8. export a recruitment dossier.

### B. Replace a player
1. select reference player;
2. select dimensions to preserve;
3. choose age / league / budget constraints;
4. similarity candidates;
5. calculate team-fit delta;
6. shortlist.

### C. My Club
1. upload data;
2. map schema;
3. coverage report;
4. internal benchmarking;
5. external comparable profiles;
6. confidence-aware similarity.

## Score system

### Fit Score
Answers: "How closely does this player satisfy this specific recruitment brief?"
Not a universal player rating.

### Similarity
Answers: "How similar is the statistical behaviour profile?"
Not "who is better".

### Confidence
Answers: "How much comparable evidence supports this result?"
Built from metric coverage, observation depth and later source reliability.

### League context
Will be separate from raw player profile in early versions. Cross-league strength adjustments are dangerous if hidden inside a black-box rating.

## Differentiators

- Explainability by construction.
- Data coverage visible on every result.
- Persona-aware product language.
- Partial-data My Club mode.
- Open-data-first reproducibility.
- Role discovery based on behaviour, not only position labels.
