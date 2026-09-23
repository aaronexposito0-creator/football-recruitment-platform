# Current data strategy

Use [DATA_SOURCES.md](../DATA_SOURCES.md) for the authoritative source/rights inventory and [METRIC_GOVERNANCE.md](METRIC_GOVERNANCE.md) for numerical semantics.

The first reproducible slice is the complete men's Euro 2024 from a pinned StatsBomb Open Data commit. Preserve the original source namespaces, exact exposure denominators, null coverage and competition context. The private lake uses canonical Polars types and compressed Parquet; read-only DuckDB supports analytical checks. Small derived research views are served by FastAPI and bundled for disconnected consultation.

Do not mix providers, transfer spells or competition windows until their metric definitions, IDs and denominators have a validated harmonisation contract. More available columns do not justify a higher Confidence without appropriate reference observations. My Club is source-separated and conservative about external percentiles.

Next data work: choose a legally suitable larger reference sample, implement a transfer-aware player-team-season grain, version metric comparability and measure ingestion/serving costs on that sample. A broad commercial feed and current market metadata are not prerequisites for the free application.
