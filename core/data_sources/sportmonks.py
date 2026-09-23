from __future__ import annotations

import os

from core.data_sources.base import FootballDataSource, SourceInfo
from core.data_sources.http import HttpClient


class Sportmonks(FootballDataSource):
    BASE = "https://api.sportmonks.com/v3/football"
    info = SourceInfo(
        key="sportmonks",
        display_name="Sportmonks Football API",
        kind="current_and_historical_professional_api",
        requires_api_key=True,
        refresh_mode="scheduled_api",
        public_use_note="Use according to the purchased league package and Sportmonks API terms.",
    )

    def __init__(self, token: str | None = None, client: HttpClient | None = None):
        self.token = token or os.getenv("SPORTMONKS_TOKEN")
        self.client = client or HttpClient()

    def get(self, endpoint: str, **params):
        if not self.token:
            raise RuntimeError("SPORTMONKS_TOKEN is not configured")
        params = {**params, "api_token": self.token}
        return self.client.get_json(f"{self.BASE}/{endpoint.lstrip('/')}", params=params)

    def healthcheck(self):
        return {
            "source": self.info.key,
            "ok": bool(self.token),
            "reason": None if self.token else "missing_api_key",
        }
