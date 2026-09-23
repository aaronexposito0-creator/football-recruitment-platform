from __future__ import annotations

from core.data_sources.base import FootballDataSource, SourceInfo
from core.data_sources.http import HttpClient
from core.pipeline.config import REVISION


class StatsBombOpenData(FootballDataSource):
    BASE = f"https://raw.githubusercontent.com/statsbomb/open-data/{REVISION}/data"
    info = SourceInfo(
        key="statsbomb_open",
        display_name="StatsBomb Open Data",
        kind="event_and_360",
        requires_api_key=False,
        refresh_mode="scheduled_repository_sync",
        public_use_note="Non-commercial research only; credit with StatsBomb logo. Do not redistribute raw data. Use core.pipeline for reproducible ingestion.",
    )

    def __init__(self, client: HttpClient | None = None):
        self.client = client or HttpClient()

    def competitions(self):
        return self.client.get_json(f"{self.BASE}/competitions.json")

    def matches(self, competition_id: int, season_id: int):
        return self.client.get_json(f"{self.BASE}/matches/{competition_id}/{season_id}.json")

    def events(self, match_id: int):
        return self.client.get_json(f"{self.BASE}/events/{match_id}.json")

    def lineups(self, match_id: int):
        return self.client.get_json(f"{self.BASE}/lineups/{match_id}.json")

    def three_sixty(self, match_id: int):
        return self.client.get_json(f"{self.BASE}/three-sixty/{match_id}.json")

    def healthcheck(self):
        comps = self.competitions()
        return {"source": self.info.key, "ok": bool(comps), "competition_seasons": len(comps)}
