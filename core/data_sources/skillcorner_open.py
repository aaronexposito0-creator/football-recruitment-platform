from __future__ import annotations

from core.data_sources.base import FootballDataSource, SourceInfo


class SkillCornerOpenData(FootballDataSource):
    REPOSITORY = "https://github.com/SkillCorner/opendata"
    info = SourceInfo(
        key="skillcorner_open",
        display_name="SkillCorner Open Data",
        kind="broadcast_tracking_and_physical",
        requires_api_key=False,
        refresh_mode="manual_or_repository_sync",
        public_use_note="MIT-licensed repository; credit SkillCorner as requested by the project.",
    )

    def healthcheck(self):
        # Kept offline-safe; the ingestion module will clone/download in a deployment job.
        return {"source": self.info.key, "ok": None, "mode": "not_ingested", "implemented": False}
