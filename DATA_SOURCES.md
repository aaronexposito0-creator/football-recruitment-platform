# Data sources and distribution policy

Source review began on 2026-09-10; the pinned agreement was reread for showcase preparation on 2026-09-18. Distribution boundaries were checked again on 2026-09-23. A source being publicly reachable is not permission to scrape, republish or exploit it commercially. The base application must remain entirely free; no paid plan, trial, token or commercial dataset is part of the runtime.

## Active source: StatsBomb Open Data

Primary references: [official repository](https://github.com/hudl/open-data), [pinned Public Data User Agreement](https://github.com/hudl/open-data/blob/4b73468fc5b0f1950f9f66fada70ad3a4f9327cb/LICENSE.pdf), [official format documentation](https://github.com/hudl/open-data/tree/4b73468fc5b0f1950f9f66fada70ad3a4f9327cb/doc).

| Item | Current implementation |
| --- | --- |
| Permission basis | Custom StatsBomb Public Data User Agreement, not MIT and not an unrestricted open licence. |
| Source commit | `4b73468fc5b0f1950f9f66fada70ad3a4f9327cb` |
| Competition / season | UEFA Euro 2024, provider competition 55 / season 282, men |
| Coverage | 51 complete matches, 187,924 event records, 493 players with exposure, 24 teams |
| Ingested inputs | Competition metadata, match metadata, lineups and events. No tracking or 360 frame ingestion. |
| Private outputs | Original cached responses, canonical event partitions, lineups/entities and minute/feature Parquet. |
| Public research outputs | Derived player summaries, cohort percentiles, similarity/Fit explanations, coarse 6×4 event-zone analysis. |
| Attribution | StatsBomb name, official logo and source agreement visible in the app; analytical work credited to Aarón Expósito. |

The agreement permits public research analysis with attribution/logo and restricts reproduction/distribution of the original data and commercial exploitation, including derived analysis. The source agreement controls; this project does not relicense provider material. MIT covers original application code only. A free application is not automatically authorised for a commercial club workflow using these observations.

The agreement also asks users to register their interest and provide their name/email through StatsBomb's resource centre. This project has not submitted the author's personal details or completed that registration on their behalf. The publisher should review and complete the provider's applicable user-registration process directly; a working download is not proof of registration or broader permission.

Do not ship `data/cache`, raw JSON, lineups, tracking, canonical events or other provider-level exports. Do not create a raw event API, copy the upstream repository into public assets or assume a renamed aggregate removes source restrictions. Dataset and source IDs remain visible as lineage; per-zone xG is rounded and exact event coordinates are not published.

## Other sources considered

| Source | Current decision | Reason and primary reference |
| --- | --- | --- |
| SkillCorner Open Data | Researched; not ingested | [Official repository](https://github.com/SkillCorner/opendata) uses MIT and offers a small tracking sample. Valuable future research, but not a basis for pretending the current event profiles include physical metrics. |
| Metrica sample data | Deferred | [Official sample repository](https://github.com/metrica-sports/sample-data). Reachability alone is insufficient; check the specific intended reuse rights before integration. |
| football-data.org | Optional legacy adapter only | [Official service](https://www.football-data.org/). No token configured or request made by the main product. Fixtures/standings would not replace event-data evidence. |
| API-Football / Sportmonks | Unused optional legacy adapters | No paid capability, credentials or commercial feeds required. Future adapters must never become prerequisites for the free core. |
| FBref, Opta/Sofascore/Transfermarkt pages | Not scraped | No permission is inferred from public pages. No copied commercial event or player-market datasets. |
| My Club CSV/XLSX | Implemented, isolated | User-provided observations, processed in memory. Names do not merge identities. Imported labels do not prove shared definitions or competitive context. |

The old v0.1 budget assumption of €50/month is withdrawn. The current user contract requires €0 for the base product. Any later paid source or sensitive licence decision requires explicit user authorisation.

## Reproducibility and access boundaries

The downloader fetches a pinned commit, stores the source URL and SHA256, verifies cached content, retries transient failures and supports offline replay. Dataset publication requires all requested matches to pass quality gates; a partial run is explicit. There is no provider network request in FastAPI serving or normal frontend use.

Source IDs are namespaced (`statsbomb:player:…`, `statsbomb:match:…`). Imports use `upload:<content-and-mapping-hash>:row:<source-row>`. Cross-provider names are never treated as a reliable key. The current serving contract contains one competition-season-gender context; multi-team player seasons are rejected pending a transfer-aware grain.

Team-name translations/search aliases in `core/reference/team_names.json` are local presentation metadata, shared by Python and TypeScript. They do not change provider identities, observations, cohort membership or persisted planning keys. No additional provider data was downloaded for this localization. Research-view version `research-v2.3` adds similarity reference counts and conservative sparse-reference gating; it retains the same source revision and dataset.

Scouting notes in CSV/XLSX imports remain user-authored auxiliary text when unmapped. They are not provider observations, do not affect comparative evidence and do not establish any new source rights. The export/reimport regression uses the existing research catalog and the application's own CSV exporter; no new football dataset or provider download was introduced.

The My Club demo uses the 25 Spain players already in this same research catalog. It exports their derived totals through the existing CSV writer, omits personal notes and submits them to the ordinary preview/mapping/analysis pipeline. This is a real-data walkthrough, not an invented club or a separately licensed dataset. Screenshots and public presentations of this analysis must preserve attribution and remain within the same noncommercial research terms.

On 2026-09-23, a truncated private cached event file was restored from the same immutable source revision after its downloaded bytes matched the original manifest SHA256. This did not change the dataset or its observations. The independent local audit now verifies all 104 source hashes and 61 Parquet hashes before reading events. A clean clone runs on the distributed research summaries without requesting provider data; the original input cache is required only for ingestion and the independent raw-event audit.
