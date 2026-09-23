from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class SourceInfo:
    key: str
    display_name: str
    kind: str
    requires_api_key: bool
    refresh_mode: str
    public_use_note: str


class FootballDataSource(ABC):
    info: SourceInfo

    @abstractmethod
    def healthcheck(self) -> Mapping[str, Any]:
        raise NotImplementedError
