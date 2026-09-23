from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[2]
SOURCE = "statsbomb"
REVISION = "4b73468fc5b0f1950f9f66fada70ad3a4f9327cb"
SCHEMA_VERSION = "2.0.0"
FEATURE_VERSION = "2.1.1"
MINUTES_VERSION = "period-clock-v1.1"
DEFAULT_COMPETITION = 55
DEFAULT_SEASON = 282


def data_root() -> Path:
    return Path(os.getenv("FRP_DATA_DIR", str(ROOT / "data/cache"))).resolve()


def snapshot_path() -> Path:
    return Path(os.getenv("FRP_SNAPSHOT", str(ROOT / "data/sample/analysis.json"))).resolve()
