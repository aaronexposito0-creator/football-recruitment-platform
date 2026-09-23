from __future__ import annotations

import requests


class HttpClient:
    def __init__(self, timeout: float = 20.0):
        self.timeout = timeout

    def get_json(self, url: str, *, headers: dict[str, str] | None = None, params: dict | None = None):
        r = requests.get(url, headers=headers, params=params, timeout=self.timeout)
        r.raise_for_status()
        return r.json()
