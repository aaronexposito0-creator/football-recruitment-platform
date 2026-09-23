"""Localised search aliases, separate from football identities and observations."""

import json
import unicodedata
from importlib.resources import files

TEAM_NAMES = json.loads(files("core").joinpath("reference/team_names.json").read_text(encoding="utf-8"))
LETTERS = str.maketrans({"ł": "l", "ø": "o", "đ": "d", "ð": "d", "æ": "ae", "œ": "oe", "ı": "i"})


def search_key(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.casefold())
    plain = "".join(c for c in decomposed if not unicodedata.combining(c)).translate(LETTERS)
    return " ".join(plain.split())


def matches_player_search(player: dict, query: str) -> bool:
    aliases = TEAM_NAMES.get(player["team_name"], [player["team_name"]])
    return search_key(query) in search_key(
        " ".join([player["player_name"], player["display_name"], *aliases])
    )
