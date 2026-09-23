from core.data_sources.api_football import ApiFootball
from core.data_sources.football_data_org import FootballDataOrg
from core.data_sources.skillcorner_open import SkillCornerOpenData
from core.data_sources.sportmonks import Sportmonks
from core.data_sources.statsbomb_open import StatsBombOpenData


def source_registry():
    return {
        "statsbomb_open": StatsBombOpenData,
        "skillcorner_open": SkillCornerOpenData,
        "football_data_org": FootballDataOrg,
        "api_football": ApiFootball,
        "sportmonks": Sportmonks,
    }
