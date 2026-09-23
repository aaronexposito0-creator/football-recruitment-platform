from __future__ import annotations

import os

from core.data_sources.base import FootballDataSource, SourceInfo
from core.data_sources.http import HttpClient


class FootballDataOrg(FootballDataSource):
    BASE = "https://api.football-data.org/v4"
    info = SourceInfo(
        key="football_data_org",
        display_name="football-data.org",
        kind="current_fixtures_standings_squads",
        requires_api_key=True,
        refresh_mode="scheduled_api",
        public_use_note="Use according to the active football-data.org plan and API terms.",
    )

    def __init__(self, token: str | None = None, client: HttpClient | None = None):
        self.token = token or os.getenv("FOOTBALL_DATA_API_KEY")
        self.client = client or HttpClient()

    @property
    def headers(self):
        if not self.token:
            raise RuntimeError("FOOTBALL_DATA_API_KEY is not configured")
        return {"X-Auth-Token": self.token}

    def competitions(self):
        return self.client.get_json(f"{self.BASE}/competitions", headers=self.headers)

    def matches(self, competition_code: str, **params):
        return self.client.get_json(
            f"{self.BASE}/competitions/{competition_code}/matches", headers=self.headers, params=params
        )

    def standings(self, competition_code: str):
        return self.client.get_json(
            f"{self.BASE}/competitions/{competition_code}/standings", headers=self.headers
        )

    def healthcheck(self):
        if not self.token:
            return {"source": self.info.key, "ok": False, "reason": "missing_api_key"}
        data = self.competitions()
        return {"source": self.info.key, "ok": bool(data)}
