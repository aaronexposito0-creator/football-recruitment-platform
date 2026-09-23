from __future__ import annotations

import os

from core.data_sources.base import FootballDataSource, SourceInfo
from core.data_sources.http import HttpClient


class ApiFootball(FootballDataSource):
    BASE = "https://v3.football.api-sports.io"
    info = SourceInfo(
        key="api_football",
        display_name="API-Football",
        kind="current_and_historical_football_api",
        requires_api_key=True,
        refresh_mode="scheduled_api",
        public_use_note="Use according to API-Sports subscription and terms; do not redistribute raw feed outside allowed usage.",
    )

    def __init__(self, token: str | None = None, client: HttpClient | None = None):
        self.token = token or os.getenv("API_FOOTBALL_KEY")
        self.client = client or HttpClient()

    @property
    def headers(self):
        if not self.token:
            raise RuntimeError("API_FOOTBALL_KEY is not configured")
        return {"x-apisports-key": self.token}

    def get(self, endpoint: str, **params):
        return self.client.get_json(
            f"{self.BASE}/{endpoint.lstrip('/')}", headers=self.headers, params=params
        )

    def healthcheck(self):
        if not self.token:
            return {"source": self.info.key, "ok": False, "reason": "missing_api_key"}
        return {"source": self.info.key, "ok": True, "mode": "key_configured"}
